import React, { useState } from 'react';
import { Sliders } from 'lucide-react';
import { evaluateSrp, reservoirTempAtDay, waltherViscosityCp } from '../services/api';

export const ScenarioLabView: React.FC = () => {
  const [steamVol, setSteamVol] = useState<number>(2500);
  const [soakDays, setSoakDays] = useState<number>(7);
  const [injPressure, setInjPressure] = useState<number>(82);
  const [spm, setSpm] = useState<number>(5.5);
  const [stroke, setStroke] = useState<number>(2.8);

  // Baseline Current State
  const current = {
    prod: 84.5,
    sor: 4.65,
    energy: 2.35,
    cost: 18.5,
    risk: 0.38,
    recovery: 18.2
  };

  // Proposed evaluation. The CSS recipe (steam, soak, pressure) sets how hot
  // the reservoir gets, that sets mid-cycle viscosity, and the rod model runs
  // on that viscosity. Every slider now moves the result.
  const recipeViscosity = (steam: number, soak: number, pressure: number) => {
    const peak = 47 + 145 * (steam / 2400) * Math.sqrt(Math.min(1, soak / 6)) * (1 + ((pressure - 80) / 80) * 0.08);
    return waltherViscosityCp(reservoirTempAtDay(60, Math.min(240, peak)));
  };
  const baseSrp = evaluateSrp(2.4, 6.8, recipeViscosity(2400, 6, 80));
  const propVisc = recipeViscosity(steamVol, soakDays, injPressure);
  const propSrp = evaluateSrp(stroke, spm, propVisc);
  const propRisk = propSrp.risk;
  const propProdN = current.prod * (propSrp.productionBpd / baseSrp.productionBpd) * (1.0 - propRisk * 0.25);
  const propProd = propProdN.toFixed(1);
  const propSorN = current.sor * (steamVol / 2400) / (propProdN / current.prod);
  const propSor = propSorN.toFixed(2);
  const vfdHz = (spm * 6.46).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 20px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="var(--primary)" />
            <span>Interactive what-if scenario lab</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            Perturb engineering setpoints across CSS injection and SRP pumping to immediately project operational deltas
          </div>
        </div>
        <span className="tech-badge badge-cyan">Instant numerical solver</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '20px' }}>
        {/* Sliders Box */}
        <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Proposed operating point</div>

          {/* Steam Volume */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Steam Volume (Tons)</span>
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{steamVol} T</span>
            </div>
            <input type="range" min={1800} max={3200} step={100} value={steamVol} onChange={(e) => setSteamVol(parseInt(e.target.value))} />
          </div>

          {/* Soak Time */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Soak Time (Days)</span>
              <span style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{soakDays} Days</span>
            </div>
            <input type="range" min={2} max={14} step={1} value={soakDays} onChange={(e) => setSoakDays(parseInt(e.target.value))} />
          </div>

          {/* Injection Pressure */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Injection Pressure (bar)</span>
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{injPressure} bar</span>
            </div>
            <input type="range" min={65} max={105} step={1} value={injPressure} onChange={(e) => setInjPressure(parseInt(e.target.value))} />
          </div>

          {/* SPM */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Pumping Speed (SPM)</span>
              <span style={{ color: propRisk > 0.4 ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{spm} SPM</span>
            </div>
            <input type="range" min={2.5} max={9.5} step={0.1} value={spm} onChange={(e) => {
              const val = parseFloat(e.target.value);
              setSpm(val);
            }} />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '3px' }}>
              VFD ≈ {vfdHz} Hz · mid-cycle viscosity {Math.round(propVisc)} cP
            </div>
          </div>

          {/* Stroke Length */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Stroke Length (m)</span>
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{stroke} m</span>
            </div>
            <input type="range" min={1.5} max={3.0} step={0.1} value={stroke} onChange={(e) => setStroke(parseFloat(e.target.value))} />
          </div>
        </div>

        {/* Comparison Result Grid */}
        <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Current vs. proposed</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {/* Metric 1 */}
            <div style={{ background: 'var(--surface-raised)', padding: '14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Oil Production</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {propProd} bpd
              </div>
              <div style={{ fontSize: '0.68rem', color: propProdN >= current.prod ? 'var(--good)' : 'var(--danger)', fontWeight: 600 }}>
                {propProdN >= current.prod
                  ? `+${(propProdN - current.prod).toFixed(1)} bpd vs. ${current.prod}`
                  : `${(propProdN - current.prod).toFixed(1)} bpd vs. ${current.prod}`}
              </div>
            </div>

            {/* Metric 2 */}
            <div style={{ background: 'var(--surface-raised)', padding: '14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Steam-Oil Ratio</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {propSor}
              </div>
              <div style={{ fontSize: '0.68rem', color: propSorN <= current.sor ? 'var(--good)' : 'var(--danger)', fontWeight: 600 }}>
                vs. {current.sor} baseline
              </div>
            </div>

            {/* Metric 3 */}
            <div style={{ background: 'var(--surface-raised)', padding: '14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Failure Risk</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 600, color: propRisk > 0.4 ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {(propRisk * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: '0.68rem', color: propRisk > 0.4 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600 }}>
                {propRisk > 0.4 ? 'Unsafe setpoint' : 'Safe envelope'}
              </div>
            </div>
          </div>

          {/* Trade-off summary */}
          <div style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            padding: '16px',
            fontSize: '0.78rem',
            color: 'var(--text-main)',
            lineHeight: '1.6'
          }}>
            <strong style={{ color: 'var(--primary)', fontWeight: 600 }}>What-If Synthesis: </strong> 
            Running at {spm} SPM with {stroke}m stroke length produces {propProd} bpd. 
            {propRisk > 0.4 ? (
              <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}> Warning: Downstroke speed exceeds sinking capacity, leading to severe rod float!</span>
            ) : (
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}> Operates cleanly within the positive sinking force margin, protecting against parted rod failures.{' '}
                SOR {propSorN <= current.sor ? 'falls' : 'rises'} to {propSor} (baseline {current.sor}).</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
