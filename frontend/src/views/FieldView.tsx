import React, { useMemo } from 'react';
import { WELL_PARAMS, evaluateSrp } from '../lib/api';
import { dayState, floatOnsetSpm } from '../lib/fieldModel';
import { RangeBar } from './RangeBar';

// Card shape from the physics: normal, fluid pound (incomplete fillage) or rod float.
function MiniCard({ kind, fill }: { kind: 'normal' | 'pound' | 'float'; fill: number }) {
  const x = 2 + 60 * Math.max(0.35, Math.min(1, fill));
  const d = kind === 'float'
    ? 'M2 24 L8 4 L62 5 L56 19 L32 26 L14 17 Z'
    : kind === 'pound'
      ? `M2 24 L8 5 L62 5 L62 11 L${x} 13 L${x - 5} 24 Z`
      : 'M2 24 L8 5 L62 5 L56 24 Z';
  const color = kind === 'normal' ? 'var(--text-muted)' : kind === 'pound' ? 'var(--warn)' : 'var(--danger)';
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" aria-label={`Dyno card: ${kind}`}>
      <path d="M2 24 L8 5 L62 5 L56 24 Z" fill="none" stroke="var(--line-strong)" strokeDasharray="2 2" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const inrL = (v: number) => `${v >= 0 ? '+' : '−'}₹${Math.abs(v / 1e5).toFixed(2)} L`;

export const FieldView: React.FC<{ selectedWell: string; onSelectWell: (w: string) => void }> = ({ selectedWell, onSelectWell }) => {
  const rows = useMemo(() => Object.keys(WELL_PARAMS).map((w) => {
    const p = WELL_PARAMS[w];
    const s = dayState(w, p.currentDay);
    const onset = floatOnsetSpm(p.stroke, s.visc);
    const fill = s.manual.pumpEfficiencyPct;
    const card: 'normal' | 'pound' | 'float' = s.manual.floating ? 'float' : fill < 80 ? 'pound' : 'normal';
    const severity = s.manual.risk > 0.6 ? 3 : s.manual.risk > 0.4 || s.visc > 1000 ? 2 : s.phase.id === 'COLD' ? 1 : 0;
    return {
      w, p, s, fill, card, severity,
      bpd: evaluateSrp(p.stroke, Math.min(s.spm, onset), s.visc).productionBpd,
      gain: s.npvAuto - s.npvManual
    };
  }).sort((a, b) => b.severity - a.severity || b.gain - a.gain), []);

  const alarms = { critical: rows.filter((r) => r.severity === 3).length, high: rows.filter((r) => r.severity === 2).length, low: rows.filter((r) => r.severity === 1).length };
  const fieldBpd = rows.reduce((t, r) => t + r.bpd, 0);
  const fieldGain = rows.reduce((t, r) => t + r.gain, 0);
  const averted = rows.filter((r) => r.s.manual.risk > 0.4).length;
  const steamDue = rows.filter((r) => r.s.phase.id === 'COLD').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-faint)' }}>Oil India Limited · Rajasthan · Jodhpur Sandstone heavy oil</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 600, marginTop: 4, letterSpacing: '-0.01em' }}>Baghewala field</h1>
        </div>
        <div className="alarm-bar">
          <span className="alarm crit"><b>{alarms.critical}</b> Critical</span>
          <span className="alarm high"><b>{alarms.high}</b> High</span>
          <span className="alarm low"><b>{alarms.low}</b> Low</span>
          <span className="phase-pill" style={{ color: 'var(--good)', borderColor: 'var(--line-strong)' }}>
            <span className="live-dot pulse" /> AUTOPILOT {rows.length}/{rows.length}
          </span>
        </div>
      </div>

      <div className="panel hero-strip">
        {[
          ['Field oil rate', Math.round(fieldBpd).toLocaleString(), 'bpd', `${rows.length} CSS + SRP wells`, undefined],
          ['Value vs. fixed SPM', inrL(fieldGain), '/ day', 'Oil gained + failures avoided − steam', fieldGain >= 0 ? 'var(--good)' : 'var(--danger)'],
          ['Rod failures averted', String(averted), 'wells', 'Float risk > 40% at manual SPM', averted ? 'var(--warn)' : undefined],
          ['Steam cycles due', String(steamDue), 'wells', 'COLD phase, below 80°C BHT', undefined]
        ].map(([k, v, u, sub, tone]) => (
          <div key={k} className="hero-cell">
            <div className="hero-label">{k}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <span className="mono-num hero-value" style={tone ? { color: tone } : undefined}>{v}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{u}</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ overflowX: 'auto' }}>
        <table className="field-table">
          <thead>
            <tr>
              <th>Well</th><th>Phase</th><th className="num">BHT</th><th className="num">Viscosity</th>
              <th className="num">SPM</th><th>Pump fillage</th><th>Rod-float risk</th><th>Dyno card</th>
              <th className="num">Value / day</th><th>Autopilot</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ w, p, s, fill, card, severity, gain }) => {
              const action = s.manual.risk > 0.4 ? 'Slowed, float guard' : s.phase.id === 'COLD' ? 'Steam cycle queued' : s.spm > p.spm ? 'Sped up, oil mobile' : s.spm < p.spm ? 'Slowed, drag rising' : 'Holding';
              return (
                <tr key={w} data-active={w === selectedWell} onClick={() => onSelectWell(w)}>
                  <td>
                    <span className="sev" data-sev={severity} />
                    <span className="mono-num" style={{ fontSize: '0.8rem' }}>{w.replace('BW-DEMO-', 'BW-')}</span>
                  </td>
                  <td><span className={`phase-tag ${s.phase.id.toLowerCase()}`}>{s.phase.id}</span></td>
                  <td className="num">{s.temp.toFixed(0)}°C</td>
                  <td className="num" style={{ color: s.visc > 1000 ? 'var(--danger)' : undefined }}>{Math.round(s.visc).toLocaleString()} cP</td>
                  <td className="num">
                    {s.spm === p.spm ? p.spm : <><span style={{ color: 'var(--text-faint)' }}>{p.spm} →</span> {s.spm}</>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 70 }}><RangeBar value={fill} max={100} warn={80} danger={60} invert /></div>
                      <span className="mono-num" style={{ fontSize: '0.74rem', fontWeight: 500 }}>{fill.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 70 }}><RangeBar value={s.manual.risk * 100} max={100} warn={30} danger={40} /></div>
                      <span className="mono-num" style={{ fontSize: '0.74rem', fontWeight: 500 }}>
                        {Math.round(s.manual.risk * 100)}{s.auto.risk < s.manual.risk - 0.01 && <span style={{ color: 'var(--good)' }}> → {Math.round(s.auto.risk * 100)}</span>}%
                      </span>
                    </div>
                  </td>
                  <td><MiniCard kind={card} fill={fill / 100} /></td>
                  <td className="num" style={{ color: gain >= 0 ? 'var(--good)' : 'var(--danger)' }}>{inrL(gain)}</td>
                  <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
