import React, { useState } from 'react';
import { Gauge, Sliders } from 'lucide-react';
import { evaluateSrp } from '../services/api';

export const SRPOptimizerView: React.FC = () => {
  const [strokeLength, setStrokeLength] = useState<number>(2.4);
  const [spm, setSpm] = useState<number>(6.5);
  const [viscosity, setViscosity] = useState<number>(1450);

  // Same API RP 11L + Couette drag model the backend and Digital Twin use
  // (services/api.ts -> evaluateSrp), so this page can't disagree with them.
  const FLOAT_VELOCITY_RATIO_LIMIT = 0.80;
  const srp = evaluateSrp(strokeLength, spm, viscosity);
  const velocityRatio = srp.velocityRatio;
  const rodFloatRisk = srp.risk;
  const isFloating = srp.floating;
  const pprl = Math.round(srp.pprlLbs);
  const mprl = Math.round(srp.mprlLbs);
  const dispBpd = Math.round(srp.dispBblDay);
  const pumpEff = parseFloat(srp.pumpEfficiencyPct.toFixed(1));
  const estProd = Math.round(srp.productionBpd);
  const powerKw = parseFloat(srp.electricalKw.toFixed(2));
  const kwhBbl = parseFloat(srp.kwhPerBarrel.toFixed(2));

  // Highest speed at which the model says the rod still sinks cleanly at this
  // stroke length and viscosity. Previously this ignored viscosity entirely.
  let maxSafeSpm = 2.0;
  for (let s = 10.5; s >= 2.0; s -= 0.1) {
    if (!evaluateSrp(strokeLength, s, viscosity).floating) { maxSafeSpm = s; break; }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 20px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gauge size={20} color="var(--accent)" />
            <span>Sucker rod pump (SRP) continuous mechanical optimizer</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            API RP 11L Kinematics, Annular Couette Shear, Downstroke Sinking Margin & Rod-Float Protection
          </div>
        </div>
        <span className={`tech-badge ${isFloating ? 'badge-red' : 'badge-green'}`}>
          {isFloating ? 'Rod floating' : 'Safe envelope'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px' }}>
        {/* SRP Operating Sliders */}
        <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="var(--accent)" />
            <span>SRP speed & geometry controls</span>
          </div>

          {/* Stroke Length Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Polished Rod Stroke Length</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{strokeLength} m</span>
            </div>
            <input
              type="range"
              min={1.5}
              max={3.0}
              step={0.1}
              value={strokeLength}
              onChange={(e) => setStrokeLength(parseFloat(e.target.value))}
            />
          </div>

          {/* SPM Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Pumping Speed (SPM)</span>
              <span style={{ color: isFloating ? 'var(--danger)' : 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {spm} SPM (VFD: {(spm * 6.46).toFixed(1)} Hz)
              </span>
            </div>
            <input
              type="range"
              min={2.5}
              max={9.5}
              step={0.1}
              value={spm}
              onChange={(e) => setSpm(parseFloat(e.target.value))}
            />
          </div>

          {/* Simulated Viscosity (Fluid Condition) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Fluid Viscosity (Thermal State)</span>
              <span style={{ color: 'var(--warn)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{viscosity} cP</span>
            </div>
            <input
              type="range"
              min={50}
              max={4500}
              step={50}
              value={viscosity}
              onChange={(e) => setViscosity(parseInt(e.target.value))}
            />
          </div>

          {/* Velocity Ratio Visual Gauge */}
          <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '12px 14px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Downstroke Speed vs Terminal Sinking Velocity Ratio</span>
              <span style={{ color: isFloating ? 'var(--danger)' : 'var(--good)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {velocityRatio.toFixed(2)}x (limit {FLOAT_VELOCITY_RATIO_LIMIT.toFixed(2)}x)
              </span>
            </div>
            <div style={{ height: '7px', background: 'var(--line)', border: '1px solid var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (velocityRatio / 1.2) * 100)}%`,
                background: isFloating ? 'var(--danger)' : 'var(--good)',
                transition: 'all 0.2s ease'
              }}></div>
            </div>
          </div>
        </div>

        {/* Output Metrics Panel */}
        <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
            Predicted mechanical & lift performance
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '12px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estimated Production</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {estProd} bpd
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>Displacement: {dispBpd} bpd • Eff: {pumpEff}%</div>
            </div>

            <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '12px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rod Floating Risk</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: isFloating ? 'var(--danger)' : 'var(--good)', fontFamily: 'var(--font-mono)' }}>
                {(rodFloatRisk * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.68rem', color: isFloating ? 'var(--danger)' : 'var(--good)', fontWeight: 600 }}>
                {isFloating ? 'IMPACT POUNDING ACTIVE' : 'POSITIVE NET DOWN FORCE'}
              </div>
            </div>

            <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '12px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak Polished Rod Load</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {pprl} lbs
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>MPRL: {mprl} lbs (Structure: 22k lbs)</div>
            </div>

            <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '12px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Electrical Power & Cost</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--warn)', fontFamily: 'var(--font-mono)' }}>
                {powerKw} kW
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--good)', fontWeight: 600 }}>{kwhBbl} kWh / bbl</div>
            </div>
          </div>

          {/* AI Recommendation Card */}
          <div style={{
            background: 'var(--accent-soft)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            padding: '14px',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            lineHeight: '1.5'
          }}>
            <strong style={{ color: 'var(--accent)' }}>AI Pumping Rule:</strong> At {viscosity} cP, maximum allowable speed without rod float is{' '}
            <strong style={{ color: 'var(--good)' }}>
              {maxSafeSpm.toFixed(1)} SPM
            </strong>
            . Reducing SPM while extending stroke length preserves displacement while eliminating rod shock!
          </div>
        </div>
      </div>
    </div>
  );
};
