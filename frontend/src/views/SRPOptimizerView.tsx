import React, { useState } from 'react';
import { Gauge, Sliders } from 'lucide-react';
import { evaluateSrp } from '../lib/api';
import { LabelledSlider, PageHeader, StatTile } from './ui';

const FLOAT_RATIO_LIMIT = 0.80;
const HZ_PER_SPM = 6.46;

/** Fastest speed (0.1 SPM steps, from 10.5 down) at which the model says the rods still sink cleanly. */
function fastestSafeSpm(stroke: number, viscosity: number): number {
  for (let s = 10.5; s >= 2.0; s -= 0.1) {
    if (!evaluateSrp(stroke, s, viscosity).floating) return s;
  }
  return 2.0;
}

export const SRPOptimizerView: React.FC = () => {
  const [stroke, setStroke] = useState(2.4);
  const [spm, setSpm] = useState(6.5);
  const [viscosity, setViscosity] = useState(1450);

  // Same API RP 11L + Couette model as the backend and the digital twin (lib/api.ts),
  // so this page cannot disagree with them.
  const pump = evaluateSrp(stroke, spm, viscosity);
  const floating = pump.floating;
  const ratio = pump.velocityRatio;
  const statusColour = floating ? 'var(--danger)' : 'var(--good)';
  const safeSpm = fastestSafeSpm(stroke, viscosity);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 20px' }}>
      <PageHeader
        icon={<Gauge size={20} color="var(--accent)" />}
        title="Sucker rod pump (SRP) continuous mechanical optimizer"
        subtitle="API RP 11L Kinematics, Annular Couette Shear, Downstroke Sinking Margin & Rod-Float Protection"
        badge={
          <span className={`tech-badge ${floating ? 'badge-red' : 'badge-green'}`}>
            {floating ? 'Rod floating' : 'Safe envelope'}
          </span>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
            <Sliders size={16} color="var(--accent)" />
            <span>SRP speed & geometry controls</span>
          </div>

          <LabelledSlider
            label="Polished Rod Stroke Length" readout={`${stroke} m`}
            min={1.5} max={3.0} step={0.1} value={stroke} onChange={setStroke}
          />
          <LabelledSlider
            label="Pumping Speed (SPM)" readout={`${spm} SPM (VFD: ${(spm * HZ_PER_SPM).toFixed(1)} Hz)`}
            readoutColour={floating ? 'var(--danger)' : 'var(--accent)'}
            min={2.5} max={9.5} step={0.1} value={spm} onChange={setSpm}
          />
          <LabelledSlider
            label="Fluid Viscosity (Thermal State)" readout={`${viscosity} cP`} readoutColour="var(--warn)"
            min={50} max={4500} step={50} value={viscosity} onChange={setViscosity} integer
          />

          <div style={{ padding: '12px 14px', borderRadius: 4, background: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.74rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                Downstroke Speed vs Terminal Sinking Velocity Ratio
              </span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: statusColour }}>
                {ratio.toFixed(2)}x (limit {FLOAT_RATIO_LIMIT.toFixed(2)}x)
              </span>
            </div>
            <div style={{ height: 7, overflow: 'hidden', borderRadius: 3, background: 'var(--line)', border: '1px solid var(--line)' }}>
              <div style={{
                height: '100%', background: statusColour, transition: 'all 0.2s ease',
                width: `${Math.min(100, (ratio / 1.2) * 100)}%`,
              }} />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 22 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
            Predicted mechanical & lift performance
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <StatTile
              title="Estimated Production" value={`${Math.round(pump.productionBpd)} bpd`}
              caption={`Displacement: ${Math.round(pump.dispBblDay)} bpd • Eff: ${pump.pumpEfficiencyPct.toFixed(1)}%`}
            />
            <StatTile
              title="Rod Floating Risk" value={`${(pump.risk * 100).toFixed(1)}%`} valueColour={statusColour}
              caption={floating ? 'IMPACT POUNDING ACTIVE' : 'POSITIVE NET DOWN FORCE'} captionColour={statusColour}
            />
            <StatTile
              title="Peak Polished Rod Load" value={`${Math.round(pump.pprlLbs)} lbs`}
              caption={`MPRL: ${Math.round(pump.mprlLbs)} lbs (Structure: 22k lbs)`}
            />
            <StatTile
              title="Electrical Power & Cost" value={`${pump.electricalKw.toFixed(2)} kW`} valueColour="var(--warn)"
              caption={`${pump.kwhPerBarrel.toFixed(2)} kWh / bbl`} captionColour="var(--good)"
            />
          </div>

          <div style={{
            padding: 14, borderRadius: 4, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-muted)',
            background: 'var(--accent-soft)', border: '1px solid var(--line)',
          }}>
            <strong style={{ color: 'var(--accent)' }}>AI Pumping Rule:</strong> At {viscosity} cP, maximum allowable speed without rod float is{' '}
            <strong style={{ color: 'var(--good)' }}>{safeSpm.toFixed(1)} SPM</strong>
            . Reducing SPM while extending stroke length preserves displacement while eliminating rod shock!
          </div>
        </div>
      </div>
    </div>
  );
};
