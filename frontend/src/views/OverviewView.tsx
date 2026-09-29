import React, { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine, ResponsiveContainer
} from 'recharts';
import { WELL_PARAMS } from '../lib/api';
import { MAX_DAY, dayState, inrCr } from '../lib/fieldModel';
import { AgentsPanel } from './AgentsPanel';
import { FieldView } from './FieldView';

function Hero({ label, value, unit, sub, tone }: { label: string; value: string; unit?: string; sub: React.ReactNode; tone?: string }) {
  return (
    <div className="hero-cell">
      <div className="hero-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
        <span className="mono-num hero-value" style={tone ? { color: tone } : undefined}>{value}</span>
        {unit && <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

export const OverviewView: React.FC<{ selectedWell: string; onSelectWell: (w: string) => void }> = ({ selectedWell, onSelectWell }) => {
  const p = WELL_PARAMS[selectedWell];

  const { series, cycleGain } = useMemo(() => {
    const out = [];
    let gain = 0;
    for (let d = 1; d <= MAX_DAY; d += 1) {
      const s = dayState(selectedWell, d);
      gain += s.npvAuto - s.npvManual;
      out.push({ day: d, bht: +s.temp.toFixed(1), visc: Math.round(s.visc), drava: s.spm, manual: p.spm, phase: s.phase.id });
    }
    return { series: out, cycleGain: gain };
  }, [selectedWell, p.spm]);

  const now = dayState(selectedWell, p.currentDay);
  const warmStart = series.find((d) => d.bht < 120)?.day ?? 1;
  const coldStart = series.find((d) => d.bht < 80)?.day ?? MAX_DAY;
  const thresholdDay = series.find((d) => d.visc > 1000)?.day;

  // Control actions the autopilot took this cycle, from phase transitions
  const actions = [
    { day: 1, text: `Cycle ${p.cycle} start · HOT · SPM set to ${series[0].drava}` },
    warmStart > 1 && warmStart <= MAX_DAY && { day: warmStart, text: `BHT < 120°C · WARM · SPM ${series[warmStart - 2]?.drava ?? series[0].drava} → ${series[warmStart - 1].drava}` },
    thresholdDay && { day: thresholdDay, text: `Viscosity crossed 1,000 cP · float guard active` },
    coldStart < MAX_DAY && { day: coldStart, text: `BHT < 80°C · COLD · SPM → ${series[coldStart - 1].drava}, steam cycle ${p.cycle + 1} evaluated` }
  ].filter(Boolean) as { day: number; text: string }[];
  actions.sort((a, b) => a.day - b.day);

  const phaseTone = now.phase.id === 'HOT' ? 'var(--accent)' : now.phase.id === 'WARM' ? 'var(--warn)' : '#7cb4ff';

  return (
    <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FieldView selectedWell={selectedWell} onSelectWell={(w) => {
        onSelectWell(w);
        document.getElementById('well-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }} />

      <div id="well-detail" className="section-rule"><span>Well detail</span></div>

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-faint)' }}>Baghewala · selected well</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 600, marginTop: 4, letterSpacing: '-0.01em' }}>
            {selectedWell} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>· cycle {p.cycle}, day {p.currentDay}</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="phase-pill" style={{ color: phaseTone, borderColor: phaseTone }}>{now.phase.id} PHASE</span>
          <span className="phase-pill" style={{ color: 'var(--good)', borderColor: 'var(--line-strong)' }}>
            <span className="live-dot pulse" /> AUTOPILOT ENGAGED
          </span>
        </div>
      </div>

      {/* Hero numbers */}
      <div className="panel hero-strip">
        <Hero label="Bottomhole temperature" value={now.temp.toFixed(1)} unit="°C" tone={phaseTone}
          sub={<>{now.phase.id} · {now.phase.rule}</>} />
        <Hero label="Oil viscosity" value={Math.round(now.visc).toLocaleString()} unit="cP"
          tone={now.visc > 1000 ? 'var(--danger)' : undefined}
          sub={now.visc > 1000 ? 'Above 1,000 cP rod-float threshold' : 'Below 1,000 cP rod-float threshold'} />
        <Hero label="Autopilot SPM" value={now.spm.toFixed(1)} unit="SPM"
          sub={<>Manual practice {p.spm} SPM · VFD {(now.spm * 6.46).toFixed(1)} Hz</>} />
        <Hero label="Value vs. fixed SPM" value={`${cycleGain >= 0 ? '+' : '−'}${inrCr(Math.abs(cycleGain))}`} unit="/ cycle"
          tone={cycleGain >= 0 ? 'var(--good)' : 'var(--danger)'}
          sub={<>Today rod-float risk {Math.round(now.manual.risk * 100)}% → {Math.round(now.auto.risk * 100)}%</>} />
      </div>

      <div className="overview-grid">
        {/* Coupled CSS + SRP control chart */}
        <div className="panel" style={{ padding: '16px 18px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>One steam cycle, controlled end to end</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Steam heats the oil, pumping cools it. Drava steps SPM down with bottomhole temperature instead of running one fixed speed.
              </div>
            </div>
            <div className="legend">
              <span><i style={{ background: 'var(--accent)' }} />BHT</span>
              <span><i style={{ background: 'var(--text)' }} />Drava SPM</span>
              <span><i className="dash" />Manual SPM</span>
            </div>
          </div>
          <div style={{ height: 300, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="bhtFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0883e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f0883e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <ReferenceArea yAxisId="t" x1={1} x2={warmStart} fill="#f0883e" fillOpacity={0.06}
                  label={{ value: 'HOT', position: 'insideTopLeft', fill: '#f0883e', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <ReferenceArea yAxisId="t" x1={warmStart} x2={coldStart} fill="#f5c451" fillOpacity={0.04}
                  label={{ value: 'WARM', position: 'insideTopLeft', fill: '#f5c451', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <ReferenceArea yAxisId="t" x1={coldStart} x2={MAX_DAY} fill="#7cb4ff" fillOpacity={0.04}
                  label={{ value: 'COLD', position: 'insideTopLeft', fill: '#7cb4ff', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <CartesianGrid stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="day" type="number" domain={[1, MAX_DAY]} ticks={[1, 30, 60, 90, 120, 150]}
                  tick={{ fill: '#5f5f5f', fontSize: 11 }} axisLine={{ stroke: '#2e2e2e' }} tickLine={false} />
                <YAxis yAxisId="t" domain={[40, 240]} tick={{ fill: '#5f5f5f', fontSize: 11 }} axisLine={false} tickLine={false} unit="°" />
                <YAxis yAxisId="s" orientation="right" domain={[0, 10]} tick={{ fill: '#5f5f5f', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #2e2e2e', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(d) => `Day ${d}`}
                  formatter={(v, n) => [n === 'bht' ? `${v}°C` : `${v} SPM`, n === 'bht' ? 'BHT' : n === 'drava' ? 'Drava SPM' : 'Manual SPM']}
                />
                <Area yAxisId="t" type="monotone" dataKey="bht" stroke="#f0883e" strokeWidth={2} fill="url(#bhtFill)" isAnimationActive={false} />
                <Line yAxisId="s" type="stepAfter" dataKey="drava" stroke="#f5f5f5" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="s" type="linear" dataKey="manual" stroke="#5f5f5f" strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <ReferenceLine yAxisId="t" x={p.currentDay} stroke="#f5f5f5" strokeOpacity={0.5}
                  label={{ value: 'TODAY', position: 'top', fill: '#f5f5f5', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Autopilot actions this cycle */}
        <div className="panel" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Autopilot actions, cycle {p.cycle}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>No operator input required</div>
          <div className="timeline">
            {actions.map((a) => (
              <div key={a.day} className="tl-row" data-past={a.day <= p.currentDay}>
                <span className="tl-dot" />
                <span className="mono-num" style={{ fontSize: '0.74rem', width: 56, color: 'var(--text-faint)', fontWeight: 500 }}>Day {a.day}</span>
                <span style={{ flex: 1, fontSize: '0.8rem' }}>{a.text}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 14, lineHeight: 1.5 }}>
            Value = oil revenue − steam cost − expected rod-failure cost, summed over the 150-day cycle. Assumes $70/bbl, ₹84/$, ₹2,600/t steam, ₹15 L workover + 14 days deferred oil; no extra stroke above float onset.
          </div>
        </div>
      </div>

      <AgentsPanel selectedWell={selectedWell} setpoint={now.spm} />
    </div>
  );
};
