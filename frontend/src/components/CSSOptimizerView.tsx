import React, { useState } from 'react';
import { Flame, ArrowRight, Sliders } from 'lucide-react';

export const CSSOptimizerView: React.FC = () => {
  const [steamVolume, setSteamVolume] = useState<number>(2400);
  const [injectionPressure, setInjectionPressure] = useState<number>(80);
  const [soakDays, setSoakDays] = useState<number>(6);
  const [productionCutoff, setProductionCutoff] = useState<number>(115);

  // Before (Historical standard un-optimized practice)
  const before = {
    production_bpd: 84.5,
    sor: 4.65,
    energy_mmbtu: 14200,
    cost_inr_lakhs: 24.8,
    recovery_pct: 18.2
  };

  // After: model estimate driven by all four sliders. Each input moves the
  // outputs in its physically expected direction (bigger/longer soaks add heat,
  // higher pressure improves steam penetration, a later cut-off recovers more
  // oil but keeps pumping into the cold, expensive tail of the cycle).
  const FORMATION_PARTING_BAR = 110.0;
  const steamRatio = steamVolume / 2400.0;
  const soakFactor = Math.min(1.0, soakDays / 6.0);
  const pressureFactor = 1.0 + ((injectionPressure - 80) / 80) * 0.10;
  const cutoffRatio = productionCutoff / 115.0;

  const afterProdN = 84.5 * (1.0 + (steamRatio - 1.0) * 0.35 * soakFactor) * 1.18 * pressureFactor;
  const prodRatio = afterProdN / before.production_bpd;
  const afterSorN = before.sor * 0.9 * (steamRatio / prodRatio) * (1.0 + (1.0 - soakFactor) * 0.15);
  const afterEnergyN = before.energy_mmbtu * steamRatio * Math.pow(injectionPressure / 80, 0.15);
  const afterCostN = before.cost_inr_lakhs * 0.9 * (afterEnergyN / before.energy_mmbtu) * (1.0 + (cutoffRatio - 1.0) * 0.2);
  const afterRecoveryN = before.recovery_pct * prodRatio * Math.pow(cutoffRatio, 0.35);

  const afterProd = afterProdN.toFixed(1);
  const afterSor = afterSorN.toFixed(2);
  const afterEnergy = Math.round(afterEnergyN);
  const afterCost = afterCostN.toFixed(1);
  const afterRecovery = afterRecoveryN.toFixed(1);

  const pct = (after: number, base: number) => ((after - base) / base) * 100;
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;
  // higherIsBetter decides whether a positive change is shown as good or bad.
  const deltaColor = (v: number, higherIsBetter: boolean) =>
    Math.abs(v) < 0.5 ? 'var(--text-muted)' : (v > 0) === higherIsBetter ? 'var(--good)' : 'var(--danger)';

  const deltas = {
    prod: pct(afterProdN, before.production_bpd),
    sor: pct(afterSorN, before.sor),
    energy: pct(afterEnergyN, before.energy_mmbtu),
    cost: pct(afterCostN, before.cost_inr_lakhs),
    recovery: pct(afterRecoveryN, before.recovery_pct)
  };

  const nearPartingLimit = injectionPressure >= FORMATION_PARTING_BAR * 0.92;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 20px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} color="var(--warn)" />
            <span>Cyclic steam stimulation (CSS) thermal optimizer</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Thermodynamic injection sizing, soaking interval optimization, and economic cut-off scheduling
          </div>
        </div>
        <span className="tech-badge badge-sim">Model estimate (simulated)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '20px' }}>
        {/* Sliders Input Panel */}
        <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="var(--accent)" />
            <span>CSS thermal recipe controls</span>
          </div>

          {/* Slider 1: Steam Volume */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Steam Volume (CWE Tons)</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{steamVolume} Tons</span>
            </div>
            <input
              type="range"
              min={1500}
              max={3500}
              step={100}
              value={steamVolume}
              onChange={(e) => setSteamVolume(parseInt(e.target.value))}
            />
          </div>

          {/* Slider 2: Injection Pressure */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Wellhead Injection Pressure</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{injectionPressure} bar</span>
            </div>
            <input
              type="range"
              min={60}
              max={105}
              step={1}
              value={injectionPressure}
              onChange={(e) => setInjectionPressure(parseInt(e.target.value))}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 500 }}>
              Formation parting limit: {FORMATION_PARTING_BAR} bar
            </div>
          </div>

          {/* Slider 3: Soak Time */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Thermal Soak Period</span>
              <span style={{ color: 'var(--warn)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{soakDays} Days</span>
            </div>
            <input
              type="range"
              min={2}
              max={14}
              step={1}
              value={soakDays}
              onChange={(e) => setSoakDays(parseInt(e.target.value))}
            />
          </div>

          {/* Slider 4: Production Cut-Off */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Economic Production Cut-Off</span>
              <span style={{ color: 'var(--good)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Day {productionCutoff}</span>
            </div>
            <input
              type="range"
              min={80}
              max={150}
              step={5}
              value={productionCutoff}
              onChange={(e) => setProductionCutoff(parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Before vs After Comparison Card */}
        <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
            Before vs. after comparison
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', alignItems: 'center', gap: '12px' }}>
            {/* Before Column */}
            <div style={{ background: 'var(--surface-raised)', padding: '16px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '10px' }}>Historical practice</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                <div>Production: <strong style={{ color: 'var(--text)' }}>{before.production_bpd} bpd</strong></div>
                <div>Cum SOR: <strong style={{ color: 'var(--warn)' }}>{before.sor}</strong></div>
                <div>Energy: <strong style={{ color: 'var(--text-muted)' }}>{before.energy_mmbtu} MMBtu</strong></div>
                <div>OPEX: <strong style={{ color: 'var(--text-muted)' }}>₹{before.cost_inr_lakhs} L</strong></div>
                <div>Recovery Est: <strong style={{ color: 'var(--text-muted)' }}>{before.recovery_pct}%</strong></div>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ArrowRight size={22} color="var(--text)" />
            </div>

            {/* After Column */}
            <div style={{ background: 'var(--accent-soft)', padding: '16px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '10px' }}>AI optimized recipe</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                <div>Production: <strong style={{ color: deltaColor(deltas.prod, true) }}>{afterProd} bpd ({fmtPct(deltas.prod)})</strong></div>
                <div>Cum SOR: <strong style={{ color: deltaColor(deltas.sor, false) }}>{afterSor} ({fmtPct(deltas.sor)})</strong></div>
                <div>Energy: <strong style={{ color: deltaColor(deltas.energy, false) }}>{afterEnergy} MMBtu ({fmtPct(deltas.energy)})</strong></div>
                <div>OPEX: <strong style={{ color: deltaColor(deltas.cost, false) }}>₹{afterCost} L ({fmtPct(deltas.cost)})</strong></div>
                <div>Recovery Est: <strong style={{ color: deltaColor(deltas.recovery, true) }}>{afterRecovery}% ({fmtPct(deltas.recovery)})</strong></div>
              </div>
            </div>
          </div>

          {/* Model Confidence Badge */}
          <div style={{ background: 'var(--surface-raised)', padding: '12px 16px', borderRadius: '4px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Thermodynamic Confidence: <strong style={{ color: 'var(--accent)' }}>92.4%</strong> (Marx-Langenheim Energy Balance)
            </span>
            <span className={`tech-badge ${nearPartingLimit ? 'badge-amber' : 'badge-green'}`}>
              {nearPartingLimit ? 'Near parting limit' : 'Constraints satisfied'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
