import React, { useEffect, useState } from 'react';
import { RangeBar } from './RangeBar';
import { WELL_PARAMS, reservoirTempAtDay, waltherViscosityCp, evaluateSrp } from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const RUN_MS = 3000;

// Rod string and unit assumptions (API RP 11L / 11B conventions)
const ROD_AREA_IN2 = 0.601;          // 7/8" rod
const ROD_TENSILE_PSI = 115000;      // API grade D
const SERVICE_FACTOR = 0.9;          // non-corrosive, heavy oil
const GEARBOX_RATING_INLB = 320000;  // C-320 unit
const STRUCTURE_RATING_LBS = 22000;
const FLOAT_RISK_LIMIT = 0.4;

type Tone = 'good' | 'warn' | 'danger';
const toneFor = (v: number, warn: number, danger: number): Tone => (v >= danger ? 'danger' : v >= warn ? 'warn' : 'good');

function runPipeline(well: string, setpoint?: number) {
  const t0 = performance.now();
  const p = WELL_PARAMS[well];
  const temp = reservoirTempAtDay(p.currentDay, p.peakTemp);
  const visc = waltherViscosityCp(temp);
  const manualSrp = evaluateSrp(p.stroke, p.spm, visc);
  const spm = setpoint ?? p.spm;
  const srp = evaluateSrp(p.stroke, spm, visc);

  // Modified Goodman diagram, % of allowable stress range
  const sMax = srp.pprlLbs / ROD_AREA_IN2;
  const sMin = srp.mprlLbs / ROD_AREA_IN2;
  const sAllow = (ROD_TENSILE_PSI / 4 + 0.5625 * sMin) * SERVICE_FACTOR;
  const goodmanPct = ((sMax - sMin) / Math.max(1, sAllow - sMin)) * 100;

  // Peak gearbox torque, API approximation with balanced counterweight
  const strokeIn = p.stroke * 39.37;
  const cbe = (srp.pprlLbs + srp.mprlLbs) / 2;
  const torquePct = (Math.abs(srp.pprlLbs - 0.95 * cbe) * (strokeIn / 2) / GEARBOX_RATING_INLB) * 100;


  const interlocks = [
    { name: 'PPRL < structure rating', ok: srp.pprlLbs < STRUCTURE_RATING_LBS, val: `${Math.round(srp.pprlLbs).toLocaleString()} / ${STRUCTURE_RATING_LBS.toLocaleString()} lbs` },
    { name: 'Goodman loading < 100%', ok: goodmanPct < 100, val: `${goodmanPct.toFixed(0)}%` },
    { name: 'Gearbox torque < rating', ok: torquePct < 100, val: `${torquePct.toFixed(0)}%` },
    { name: 'Rod-float risk < 40%', ok: srp.risk < FLOAT_RISK_LIMIT, val: `${Math.round(srp.risk * 100)}%` },
    { name: 'Pump fillage > 60%', ok: srp.pumpEfficiencyPct > 60, val: `${srp.pumpEfficiencyPct.toFixed(0)}%` }
  ];

  return {
    p, spm, manualSrp, temp, visc, srp, goodmanPct, torquePct, interlocks,
    computeMs: performance.now() - t0
  };
}

export const AgentsPanel: React.FC<{ selectedWell: string; setpoint?: number }> = ({ selectedWell, setpoint }) => {
  const [run, setRun] = useState(() => ({ ...runPipeline(selectedWell, setpoint), at: new Date(), n: 1 }));
  const [backend, setBackend] = useState<{ ok: boolean; ms: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const r = runPipeline(selectedWell, setpoint);
      const t0 = performance.now();
      let ok = false;
      try {
        const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(1500) });
        ok = res.ok;
      } catch { ok = false; }
      if (!alive) return;
      setBackend({ ok, ms: performance.now() - t0 });
      setRun((prev) => ({ ...r, at: new Date(), n: prev.n + 1 }));
    };
    tick();
    const t = setInterval(tick, RUN_MS);
    return () => { alive = false; clearInterval(t); };
  }, [selectedWell, setpoint]);

  const { p, spm, manualSrp, temp, visc, srp, goodmanPct, torquePct, interlocks } = run;
  const tripped = interlocks.filter((i) => !i.ok);
  const tag = selectedWell.replace('BW-DEMO-', 'BW');
  const motorAmps = (srp.electricalKw * 1000) / (Math.sqrt(3) * 415 * 0.85);

  const kpis: { k: string; v: string; u: string; tone: Tone; note: string; bar?: [number, number, number, number, boolean?] }[] = [
    { k: 'Pump fillage', v: srp.pumpEfficiencyPct.toFixed(0), u: '%', tone: srp.pumpEfficiencyPct < 60 ? 'danger' : srp.pumpEfficiencyPct < 75 ? 'warn' : 'good', note: srp.pumpEfficiencyPct < 75 ? 'Incomplete fillage, fluid pound likely' : 'Full barrel', bar: [srp.pumpEfficiencyPct, 100, 80, 60, true] },
    { k: 'Goodman loading', v: goodmanPct.toFixed(0), u: '%', tone: toneFor(goodmanPct, 90, 100), note: '7/8" grade D, SF 0.9', bar: [goodmanPct, 120, 90, 100] },
    { k: 'Gearbox torque', v: torquePct.toFixed(0), u: '%', tone: toneFor(torquePct, 85, 100), note: 'of C-320 rating', bar: [torquePct, 120, 85, 100] },
    { k: 'Rod-float risk', v: String(Math.round(srp.risk * 100)), u: '%', tone: toneFor(srp.risk * 100, 30, 40), note: spm !== p.spm ? `was ${Math.round(manualSrp.risk * 100)}% at ${p.spm} SPM` : srp.floating ? 'Downstroke lag detected' : 'Rods falling freely', bar: [srp.risk * 100, 100, 30, 40] },
    { k: 'Motor load', v: srp.electricalKw.toFixed(1), u: 'kW', tone: 'good', note: `${motorAmps.toFixed(0)} A at 415 V` },
    { k: 'Lift energy', v: srp.kwhPerBarrel.toFixed(2), u: 'kWh/bbl', tone: 'good', note: `${Math.round(srp.productionBpd)} bpd gross` }
  ];

  const stages = [
    { stage: 'Acquire', method: 'Modbus RTU via ESP32 edge gateway', out: `5 tags · BHP ${p.bhpBar} bar · WHP ${p.whpBar} bar` },
    { stage: 'Thermal', method: 'Marx-Langenheim heat decay', out: `${temp.toFixed(1)}°C on day ${p.currentDay} of cycle ${p.cycle}` },
    { stage: 'Fluid', method: 'Walther / ASTM D341 viscosity', out: `${Math.round(visc).toLocaleString()} cP at bottomhole` },
    { stage: 'Rod loads', method: 'API RP 11L + Couette drag', out: `PPRL ${Math.round(srp.pprlLbs).toLocaleString()} · MPRL ${Math.round(srp.mprlLbs).toLocaleString()} lbs` },
    { stage: 'Diagnose', method: 'Downhole card + float model', out: manualSrp.floating ? `Rod float at ${p.spm} SPM` : 'Normal card shape' },
    { stage: 'Optimize', method: 'Max output s.t. float risk ≤ 40%', out: spm !== p.spm ? `SPM ${p.spm} → ${spm}` : `Hold ${p.spm} SPM` },
    { stage: 'Interlocks', method: 'Hard limits, cannot be overridden by AI', out: tripped.length ? `${tripped.length} limit${tripped.length > 1 ? 's' : ''} breached` : `All limits clear at ${spm} SPM` }
  ];

  const tags = [
    [`${tag}.PRL_LOAD`, `${Math.round(srp.pprlLbs).toLocaleString()} lbs`],
    [`${tag}.BHP`, `${p.bhpBar.toFixed(1)} bar`],
    [`${tag}.WHP`, `${p.whpBar.toFixed(1)} bar`],
    [`${tag}.MTR_AMP`, `${motorAmps.toFixed(1)} A`],
    [`${tag}.VFD_HZ`, `${(spm * 6.46).toFixed(1)} Hz`]
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Engineer KPIs */}
      <div className="panel kpi-strip">
        {kpis.map(({ k, v, u, tone, note, bar }) => (
          <div key={k} className="kpi-cell">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>{k}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
              <span className="mono-num" style={{ fontSize: '1.35rem', color: tone === 'good' ? 'var(--text)' : `var(--${tone})` }}>{v}</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u}</span>
            </div>
            {bar && <div style={{ marginTop: 8 }}><RangeBar value={bar[0]} max={bar[1]} warn={bar[2]} danger={bar[3]} invert={bar[4]} /></div>}
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: bar ? 6 : 2 }}>{note}</div>
          </div>
        ))}
      </div>

      <div className="pipeline-grid">
        {/* Decision pipeline */}
        <div className="panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Decision pipeline</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Run #{run.n} · {run.at.toTimeString().slice(0, 8)} · every {RUN_MS / 1000}s · compute {run.computeMs.toFixed(2)} ms
              </div>
            </div>
            <span className={`status-text ${backend?.ok ? 'good' : 'warn'}`}>
              {backend == null ? 'Connecting…' : backend.ok ? `ml_service ${Math.round(backend.ms)} ms` : 'ml_service offline · local physics'}
            </span>
          </div>
          <div key={run.n} style={{ marginTop: 8 }}>
            {stages.map((s, i) => (
              <div key={s.stage} className="pipe-row" style={{ animationDelay: `${i * 70}ms` }}>
                <span className="pipe-idx">{String(i + 1).padStart(2, '0')}</span>
                <span style={{ width: 84, fontSize: '0.82rem', fontWeight: 600 }}>{s.stage}</span>
                <span style={{ flex: 1, fontSize: '0.74rem', color: 'var(--text-muted)' }}>{s.method}</span>
                <span className="mono-num" style={{ fontSize: '0.74rem', fontWeight: 500, textAlign: 'right', color: i === 6 && tripped.length ? 'var(--danger)' : 'var(--text)' }}>{s.out}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Interlocks */}
          <div className="panel" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Safety interlocks</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>At Drava setpoint {spm} SPM · {p.stroke} m stroke</div>
            {interlocks.map((i) => (
              <div key={i.name} className="lock-row">
                <span className="well-dot" style={{ background: i.ok ? 'var(--good)' : 'var(--danger)' }} />
                <span style={{ flex: 1, fontSize: '0.78rem' }}>{i.name}</span>
                <span className="mono-num" style={{ fontSize: '0.74rem', fontWeight: 500, color: i.ok ? 'var(--text-muted)' : 'var(--danger)' }}>{i.val}</span>
              </div>
            ))}
          </div>

          {/* RTU tags */}
          <div className="panel" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>RTU tags</div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>source: rig simulator</span>
            </div>
            {tags.map(([t, v]) => (
              <div key={t} className="lock-row">
                <span className="mono-num" style={{ flex: 1, fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t}</span>
                <span className="mono-num" style={{ fontSize: '0.74rem', fontWeight: 500 }}>{v}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--good)', width: 44, textAlign: 'right' }}>GOOD</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
