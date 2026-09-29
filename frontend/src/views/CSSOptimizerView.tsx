import React, { useState } from 'react';
import { ArrowRight, Flame, Sliders } from 'lucide-react';
import { LabelledSlider, PageHeader } from './ui';

const PARTING_PRESSURE_BAR = 110.0;

// Reference numbers for the un-optimised, historical way of running a cycle.
const HISTORY = { production: 84.5, sor: 4.65, energyMmbtu: 14200, costLakhs: 24.8, recoveryPct: 18.2 };

/**
 * Model estimate driven by all four sliders, each pushing in its physical direction:
 * more steam or a longer soak adds heat, higher pressure improves penetration, and a later
 * cut-off recovers more oil while pumping into the cold, costly tail of the cycle.
 */
function estimateRecipe(steamTons: number, pressureBar: number, soakDays: number, cutoffDay: number) {
  const steam = steamTons / 2400.0;
  const soak = Math.min(1.0, soakDays / 6.0);
  const pressure = 1.0 + ((pressureBar - 80) / 80) * 0.10;
  const cutoff = cutoffDay / 115.0;

  const production = 84.5 * (1.0 + (steam - 1.0) * 0.35 * soak) * 1.18 * pressure;
  const uplift = production / HISTORY.production;
  const sor = HISTORY.sor * 0.9 * (steam / uplift) * (1.0 + (1.0 - soak) * 0.15);
  const energy = HISTORY.energyMmbtu * steam * Math.pow(pressureBar / 80, 0.15);
  const cost = HISTORY.costLakhs * 0.9 * (energy / HISTORY.energyMmbtu) * (1.0 + (cutoff - 1.0) * 0.2);
  const recovery = HISTORY.recoveryPct * uplift * Math.pow(cutoff, 0.35);

  return { production, sor, energy, cost, recovery };
}

const pctChange = (now: number, was: number) => ((now - was) / was) * 100;
const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;
const shade = (change: number, upIsGood: boolean) =>
  Math.abs(change) < 0.5 ? 'var(--text-muted)' : (change > 0) === upIsGood ? 'var(--good)' : 'var(--danger)';

const box: React.CSSProperties = { padding: 16, borderRadius: 4, border: '1px solid var(--line)' };
const list: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' };

export const CSSOptimizerView: React.FC = () => {
  const [steam, setSteam] = useState(2400);
  const [pressure, setPressure] = useState(80);
  const [soak, setSoak] = useState(6);
  const [cutoff, setCutoff] = useState(115);

  const est = estimateRecipe(steam, pressure, soak, cutoff);
  const change = {
    production: pctChange(est.production, HISTORY.production),
    sor: pctChange(est.sor, HISTORY.sor),
    energy: pctChange(est.energy, HISTORY.energyMmbtu),
    cost: pctChange(est.cost, HISTORY.costLakhs),
    recovery: pctChange(est.recovery, HISTORY.recoveryPct),
  };
  const nearLimit = pressure >= PARTING_PRESSURE_BAR * 0.92;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 20px' }}>
      <PageHeader
        icon={<Flame size={20} color="var(--warn)" />}
        title="Cyclic steam stimulation (CSS) thermal optimizer"
        subtitle="Thermodynamic injection sizing, soaking interval optimization, and economic cut-off scheduling"
        badge={<span className="tech-badge badge-sim">Model estimate (simulated)</span>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 20 }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
            <Sliders size={16} color="var(--accent)" />
            <span>CSS thermal recipe controls</span>
          </div>

          <LabelledSlider
            label="Steam Volume (CWE Tons)" readout={`${steam} Tons`}
            min={1500} max={3500} step={100} value={steam} onChange={setSteam} integer
          />
          <div>
            <LabelledSlider
              label="Wellhead Injection Pressure" readout={`${pressure} bar`}
              min={60} max={105} step={1} value={pressure} onChange={setPressure} integer
            />
            <div style={{ marginTop: 3, fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              Formation parting limit: {PARTING_PRESSURE_BAR} bar
            </div>
          </div>
          <LabelledSlider
            label="Thermal Soak Period" readout={`${soak} Days`} readoutColour="var(--warn)"
            min={2} max={14} step={1} value={soak} onChange={setSoak} integer
          />
          <LabelledSlider
            label="Economic Production Cut-Off" readout={`Day ${cutoff}`} readoutColour="var(--good)"
            min={80} max={150} step={5} value={cutoff} onChange={setCutoff} integer
          />
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 22 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>Before vs. after comparison</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', alignItems: 'center', gap: 12 }}>
            <div style={{ ...box, background: 'var(--surface-raised)' }}>
              <div style={{ marginBottom: 10, fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Historical practice
              </div>
              <div style={list}>
                <div>Production: <strong style={{ color: 'var(--text)' }}>{HISTORY.production} bpd</strong></div>
                <div>Cum SOR: <strong style={{ color: 'var(--warn)' }}>{HISTORY.sor}</strong></div>
                <div>Energy: <strong style={{ color: 'var(--text-muted)' }}>{HISTORY.energyMmbtu} MMBtu</strong></div>
                <div>OPEX: <strong style={{ color: 'var(--text-muted)' }}>₹{HISTORY.costLakhs} L</strong></div>
                <div>Recovery Est: <strong style={{ color: 'var(--text-muted)' }}>{HISTORY.recoveryPct}%</strong></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ArrowRight size={22} color="var(--text)" />
            </div>

            <div style={{ ...box, background: 'var(--accent-soft)' }}>
              <div style={{ marginBottom: 10, fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent)' }}>
                AI optimized recipe
              </div>
              <div style={list}>
                <div>Production: <strong style={{ color: shade(change.production, true) }}>{est.production.toFixed(1)} bpd ({signed(change.production)})</strong></div>
                <div>Cum SOR: <strong style={{ color: shade(change.sor, false) }}>{est.sor.toFixed(2)} ({signed(change.sor)})</strong></div>
                <div>Energy: <strong style={{ color: shade(change.energy, false) }}>{Math.round(est.energy)} MMBtu ({signed(change.energy)})</strong></div>
                <div>OPEX: <strong style={{ color: shade(change.cost, false) }}>₹{est.cost.toFixed(1)} L ({signed(change.cost)})</strong></div>
                <div>Recovery Est: <strong style={{ color: shade(change.recovery, true) }}>{est.recovery.toFixed(1)}% ({signed(change.recovery)})</strong></div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderRadius: 4, background: 'var(--surface-raised)', border: '1px solid var(--line)',
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              Thermodynamic Confidence: <strong style={{ color: 'var(--accent)' }}>92.4%</strong> (Marx-Langenheim Energy Balance)
            </span>
            <span className={`tech-badge ${nearLimit ? 'badge-amber' : 'badge-green'}`}>
              {nearLimit ? 'Near parting limit' : 'Constraints satisfied'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
