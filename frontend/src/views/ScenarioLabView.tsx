import React, { useState } from 'react';
import { Sliders } from 'lucide-react';
import { evaluateSrp, reservoirTempAtDay, waltherViscosityCp } from '../lib/api';

// Where the well stands today; the proposal is compared against this.
const BASELINE = { prod: 84.5, sor: 4.65, energy: 2.35, cost: 18.5, risk: 0.38, recovery: 18.2 };
const UNSAFE_RISK = 0.4;
const HZ_PER_SPM = 6.46;

/**
 * Mid-cycle (day 60) viscosity implied by a steam recipe: the recipe sets how hot the
 * reservoir peaks, the peak sets the cool-down, and viscosity follows temperature.
 */
function recipeViscosity(steamTons: number, soakDays: number, pressureBar: number): number {
  const heat = 145 * (steamTons / 2400) * Math.sqrt(Math.min(1, soakDays / 6));
  const pressureBoost = 1 + ((pressureBar - 80) / 80) * 0.08;
  const peak = 47 + heat * pressureBoost;
  return waltherViscosityCp(reservoirTempAtDay(60, Math.min(240, peak)));
}

interface SliderProps {
  label: string;
  display: string;
  colour: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  parse?: (raw: string) => number;
  footnote?: string;
}

const SliderRow: React.FC<SliderProps> = ({
  label, display, colour, min, max, step, value, onChange, parse = parseFloat, footnote,
}) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem' }}>
      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: colour }}>{display}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parse(e.target.value))}
    />
    {footnote && <div style={{ marginTop: 3, fontSize: '0.68rem', color: 'var(--text-faint)' }}>{footnote}</div>}
  </div>
);

const Tile: React.FC<{ title: string; value: string; note: string; valueColour: string; noteColour: string }> = (
  { title, value, note, valueColour, noteColour },
) => (
  <div style={{ padding: 14, background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>{title}</div>
    <div style={{ margin: '4px 0', fontSize: '1.3rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: valueColour }}>
      {value}
    </div>
    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: noteColour }}>{note}</div>
  </div>
);

export const ScenarioLabView: React.FC = () => {
  const [steam, setSteam] = useState(2500);
  const [soak, setSoak] = useState(7);
  const [pressure, setPressure] = useState(82);
  const [spm, setSpm] = useState(5.5);
  const [stroke, setStroke] = useState(2.8);

  // Reference: today's typical pump (2.4 m at 6.8 SPM) under the standard 2,400 t / 6 d / 80 bar recipe.
  const reference = evaluateSrp(2.4, 6.8, recipeViscosity(2400, 6, 80));
  const viscosity = recipeViscosity(steam, soak, pressure);
  const pump = evaluateSrp(stroke, spm, viscosity);

  const risk = pump.risk;
  const prod = BASELINE.prod * (pump.productionBpd / reference.productionBpd) * (1.0 - risk * 0.25);
  const sor = BASELINE.sor * (steam / 2400) / (prod / BASELINE.prod);
  const unsafe = risk > UNSAFE_RISK;
  const riskColour = unsafe ? 'var(--accent-red)' : 'var(--accent-green)';
  const prodDelta = prod - BASELINE.prod;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 20px' }}>
      <div
        className="glass-panel"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
            <Sliders size={20} color="var(--primary)" />
            <span>Interactive what-if scenario lab</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            Perturb engineering setpoints across CSS injection and SRP pumping to immediately project operational deltas
          </div>
        </div>
        <span className="tech-badge badge-cyan">Instant numerical solver</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: 20 }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 22 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Proposed operating point</div>

          <SliderRow
            label="Steam Volume (Tons)" display={`${steam} T`} colour="var(--primary)"
            min={1800} max={3200} step={100} value={steam} onChange={setSteam} parse={(r) => parseInt(r)}
          />
          <SliderRow
            label="Soak Time (Days)" display={`${soak} Days`} colour="var(--accent-amber)"
            min={2} max={14} step={1} value={soak} onChange={setSoak} parse={(r) => parseInt(r)}
          />
          <SliderRow
            label="Injection Pressure (bar)" display={`${pressure} bar`} colour="var(--primary)"
            min={65} max={105} step={1} value={pressure} onChange={setPressure} parse={(r) => parseInt(r)}
          />
          <SliderRow
            label="Pumping Speed (SPM)" display={`${spm} SPM`} colour={riskColour}
            min={2.5} max={9.5} step={0.1} value={spm} onChange={setSpm}
            footnote={`VFD ≈ ${(spm * HZ_PER_SPM).toFixed(1)} Hz · mid-cycle viscosity ${Math.round(viscosity)} cP`}
          />
          <SliderRow
            label="Stroke Length (m)" display={`${stroke} m`} colour="var(--primary)"
            min={1.5} max={3.0} step={0.1} value={stroke} onChange={setStroke}
          />
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 22 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Current vs. proposed</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Tile
              title="Oil Production" value={`${prod.toFixed(1)} bpd`} valueColour="var(--text-main)"
              note={`${prodDelta >= 0 ? '+' : ''}${prodDelta.toFixed(1)} bpd vs. ${BASELINE.prod}`}
              noteColour={prodDelta >= 0 ? 'var(--good)' : 'var(--danger)'}
            />
            <Tile
              title="Steam-Oil Ratio" value={sor.toFixed(2)} valueColour="var(--accent-amber)"
              note={`vs. ${BASELINE.sor} baseline`}
              noteColour={sor <= BASELINE.sor ? 'var(--good)' : 'var(--danger)'}
            />
            <Tile
              title="Failure Risk" value={`${(risk * 100).toFixed(0)}%`} valueColour={riskColour}
              note={unsafe ? 'Unsafe setpoint' : 'Safe envelope'} noteColour={riskColour}
            />
          </div>

          <div style={{
            padding: 16, fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--text-main)',
            background: 'var(--surface-raised)', border: '1px solid var(--border)',
          }}>
            <strong style={{ color: 'var(--primary)', fontWeight: 600 }}>What-If Synthesis: </strong>
            Running at {spm} SPM with {stroke}m stroke length produces {prod.toFixed(1)} bpd.
            {unsafe ? (
              <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
                {' '}Warning: Downstroke speed exceeds sinking capacity, leading to severe rod float!
              </span>
            ) : (
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                {' '}Operates cleanly within the positive sinking force margin, protecting against parted rod failures.{' '}
                SOR {sor <= BASELINE.sor ? 'falls' : 'rises'} to {sor.toFixed(2)} (baseline {BASELINE.sor}).
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
