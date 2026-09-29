import React, { useEffect, useMemo, useState } from 'react';
import { Radio, BrainCircuit, GitBranch, Zap, Check, X, Undo2 } from 'lucide-react';
import { WELL_PARAMS, reservoirTempAtDay, waltherViscosityCp, evaluateSrp } from '../lib/api';
import { WellId } from '../contracts/domain';

type Status = 'applied' | 'pending' | 'overridden' | 'info';
interface Decision {
  id: number; time: string; well: string; title: string; detail: string; status: Status;
}

const RISK_LIMIT = 0.4;
const STAGES = [
  { label: 'Sense', meta: 'ESP32 rigs · 1 Hz', icon: Radio },
  { label: 'Predict', meta: 'Thermal + viscosity twin', icon: BrainCircuit },
  { label: 'Decide', meta: 'Pareto optimizer', icon: GitBranch },
  { label: 'Act', meta: 'VFD + steam schedule', icon: Zap }
];

// Current physical state of a well and the action autopilot would take for it.
function assess(well: string, dayOffset = 0) {
  const p = WELL_PARAMS[well];
  const day = p.currentDay + dayOffset;
  const temp = reservoirTempAtDay(day, p.peakTemp);
  const visc = waltherViscosityCp(temp);
  const srp = evaluateSrp(p.stroke, p.spm, visc);
  let safeSpm = p.spm;
  while (safeSpm > 2 && evaluateSrp(p.stroke, safeSpm, visc).risk > RISK_LIMIT) safeSpm = +(safeSpm - 0.1).toFixed(1);
  const safe = evaluateSrp(p.stroke, safeSpm, visc);
  return { p, day, temp, visc, srp, safeSpm, safe };
}

function decisionFor(well: string, dayOffset: number): Omit<Decision, 'id' | 'time' | 'status'> & { needsAction: boolean } {
  const a = assess(well, dayOffset);
  if (a.srp.risk > RISK_LIMIT) {
    return {
      well, needsAction: true,
      title: `Reduce SPM ${a.p.spm} → ${a.safeSpm} · VFD ${(a.safeSpm * 6.46).toFixed(1)} Hz`,
      detail: `Rod-float risk ${Math.round(a.srp.risk * 100)}% at ${Math.round(a.visc)} cP. New setpoint holds ${Math.round(a.safe.risk * 100)}% risk, ${Math.round(a.safe.productionBpd)} bpd.`
    };
  }
  if (a.temp < 75) {
    return {
      well, needsAction: true,
      title: `Schedule steam cycle ${a.p.cycle + 1} · ${a.p.steamTons} t`,
      detail: `Reservoir cooled to ${a.temp.toFixed(1)}°C on day ${a.day}. Viscosity ${Math.round(a.visc)} cP is approaching the pump-off limit.`
    };
  }
  return {
    well, needsAction: false,
    title: 'Setpoints held',
    detail: `${a.temp.toFixed(1)}°C · ${Math.round(a.visc)} cP · risk ${Math.round(a.srp.risk * 100)}%. Within the safe envelope, no change needed.`
  };
}

const clock = (d: Date) => d.toTimeString().slice(0, 5);
const WELLS = Object.keys(WELL_PARAMS);

function seed(): Decision[] {
  const now = Date.now();
  return WELLS.flatMap((w, i) => {
    const d = decisionFor(w, 0);
    return [{ ...d, id: i, time: clock(new Date(now - (i + 1) * 17 * 60000)), status: (d.needsAction ? 'applied' : 'info') as Status }];
  });
}

export const AutopilotView: React.FC<{ selectedWell: WellId; onNavigateTab: (t: string) => void }> = ({ selectedWell, onNavigateTab }) => {
  const [auto, setAuto] = useState(true);
  const [stage, setStage] = useState(0);
  const [feed, setFeed] = useState<Decision[]>(seed);
  const [tick, setTick] = useState(1);

  // Loop pulse
  useEffect(() => {
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1400);
    return () => clearInterval(t);
  }, []);

  // A new decision every full loop, cycling through wells and advancing the cycle day
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), STAGES.length * 1400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (tick < 2) return;
    const well = WELLS[tick % WELLS.length];
    const d = decisionFor(well, Math.floor(tick / 3) * 4);
    const status: Status = !d.needsAction ? 'info' : auto ? 'applied' : 'pending';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feed is driven by the loop clock
    setFeed((f) => [{ ...d, id: Date.now(), time: clock(new Date()), status }, ...f].slice(0, 12));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const setStatus = (id: number, status: Status) => setFeed((f) => f.map((d) => (d.id === id ? { ...d, status } : d)));

  const wells = useMemo(() => WELLS.map((w) => ({ w, ...assess(w) })), []);
  const applied = feed.filter((d) => d.status === 'applied').length;
  const pending = feed.filter((d) => d.status === 'pending').length;
  const oilGain = wells.reduce((s, x) => s + (x.srp.risk > RISK_LIMIT ? x.safe.productionBpd * 0.05 : 0), 0);

  return (
    <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-dot pulse" />
            <span className="status-text good">Autopilot {auto ? 'engaged' : 'advisory'}</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: 8 }}>Drava is running {WELLS.length} wells</h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Every cycle it reads the rigs, predicts heat decay, picks the safest high-output setpoint and pushes it to the field.
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Control mode">
          <button data-active={auto} onClick={() => setAuto(true)}>Autonomous</button>
          <button data-active={!auto} onClick={() => setAuto(false)}>Advisory</button>
        </div>
      </div>

      {/* Control loop */}
      <div className="panel loop">
        {STAGES.map(({ label, meta, icon: Icon }, i) => (
          <React.Fragment key={label}>
            <div className="loop-stage" data-active={stage === i}>
              <div className="loop-icon"><Icon size={18} strokeWidth={1.6} /></div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{meta}</div>
              </div>
            </div>
            {i < STAGES.length - 1 && <div className="loop-link" data-active={stage === i} />}
          </React.Fragment>
        ))}
      </div>

      {/* KPIs */}
      <div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          ['Wells under control', `${WELLS.length} / ${WELLS.length}`, 'no manual intervention'],
          ['Actions taken', String(applied), auto ? 'auto-applied this shift' : `${pending} awaiting approval`],
          ['Oil protected', `+${oilGain.toFixed(1)}`, 'bpd vs. running unsafe'],
          ['Rod failures averted', String(wells.filter((x) => x.srp.risk > RISK_LIMIT).length), 'float events caught early']
        ].map(([k, v, m], i) => (
          <div key={k} style={{ padding: '16px 18px', borderLeft: i ? '1px solid var(--line)' : undefined }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{k}</div>
            <div className="mono-num" style={{ fontSize: '1.5rem', marginTop: 6 }}>{v}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{m}</div>
          </div>
        ))}
      </div>

      <div className="twin-grid">
        {/* Decision feed */}
        <div className="panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Decision log</div>
            <button className="link-btn" onClick={() => onNavigateTab('decisions')}>Why these decisions →</button>
          </div>
          <div style={{ marginTop: 10 }}>
            {feed.map((d) => (
              <div key={d.id} className="feed-row">
                <span className="mono-num" style={{ fontSize: '0.74rem', color: 'var(--text-faint)', fontWeight: 500 }}>{d.time}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.84rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{d.well}</span>
                    <span style={{ marginLeft: 8, color: d.status === 'overridden' ? 'var(--text-faint)' : 'var(--text)', textDecoration: d.status === 'overridden' ? 'line-through' : undefined }}>{d.title}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>{d.detail}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {d.status === 'pending' && <>
                    <button className="btn btn-primary btn-xs" onClick={() => setStatus(d.id, 'applied')}><Check size={12} />Approve</button>
                    <button className="btn btn-xs" onClick={() => setStatus(d.id, 'overridden')}><X size={12} /></button>
                  </>}
                  {d.status === 'applied' && <>
                    <span className="status-text good">Applied</span>
                    <button className="icon-btn" title="Undo" onClick={() => setStatus(d.id, 'overridden')}><Undo2 size={13} /></button>
                  </>}
                  {d.status === 'overridden' && <span className="status-text neutral">Overridden</span>}
                  {d.status === 'info' && <span className="status-text neutral">Hold</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-well state */}
        <div className="panel" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Wells</div>
          {wells.map(({ w, temp, visc, srp, safeSpm, p }) => {
            const risky = srp.risk > RISK_LIMIT;
            return (
              <button key={w} className="well-card" data-active={w === selectedWell} onClick={() => onNavigateTab('digital-twin')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mono-num" style={{ fontSize: '0.84rem' }}>{w}</span>
                  <span className={`status-text ${risky ? 'warn' : 'good'}`}>{risky ? 'Corrected' : 'Stable'}</span>
                </div>
                <div className="well-metrics">
                  <span>{temp.toFixed(0)}°C</span><span>{Math.round(visc)} cP</span>
                  <span>{risky ? `${p.spm}→${safeSpm}` : p.spm} SPM</span><span>day {p.currentDay}</span>
                </div>
                <div style={{ height: 3, background: 'var(--line-strong)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, srp.risk * 100)}%`, height: '100%', background: risky ? 'var(--danger)' : 'var(--good)' }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 4 }}>Rod-float risk before correction {Math.round(srp.risk * 100)}%</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
