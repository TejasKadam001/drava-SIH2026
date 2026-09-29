import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, ArrowRight } from 'lucide-react';
import { TelemetryFrame } from '../contracts/domain';
import { api, WELL_PARAMS } from '../lib/api';
import { WellboreSchematic } from './WellboreSchematic';

interface DigitalTwinProps {
  currentTelemetry: TelemetryFrame | null;
  selectedWell: string;
  onNavigateTab?: (tab: string) => void;
}

const MAX_DAY = 150;

function Readout({ label, value, unit, meta, tone }: {
  label: string; value: string | number; unit: string; meta: string; tone?: 'good' | 'danger';
}) {
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'good' ? 'var(--good)' : 'var(--text)';
  return (
    <div style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
        <span className="mono-num" style={{ fontSize: '1.5rem', color, transition: 'color 0.3s ease' }}>{value}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{unit}</span>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{meta}</div>
    </div>
  );
}

export const DigitalTwinView: React.FC<DigitalTwinProps> = ({ selectedWell, onNavigateTab }) => {
  const currentDay = (WELL_PARAMS[selectedWell] ?? WELL_PARAMS['BW-DEMO-001']).currentDay;
  const [scrubDay, setScrubDay] = useState<number>(currentDay);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // The parent keys this view by well, so switching wells remounts it at that well's own day.
  const playing = isPlaying && scrubDay < MAX_DAY;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setScrubDay((prev) => Math.min(MAX_DAY, prev + 2));
    }, 150);
    return () => clearInterval(timer);
  }, [playing]);

  const togglePlay = () => {
    if (!playing && scrubDay >= MAX_DAY) setScrubDay(1);
    setIsPlaying(!playing);
  };

  const twinState = api.getTimeMachineState(selectedWell, scrubDay);
  const { thermal_state, fluid_state, srp_operating_state, production_state, wellbore_profile_summary } = twinState;
  const isFloating = srp_operating_state.rod_floating_detected;
  const riskPct = Math.round(srp_operating_state.rod_floating_risk * 100);

  const presets = [
    { label: 'Day 5', day: 5 },
    { label: 'Day 30', day: 30 },
    { label: `Now · ${currentDay}`, day: currentDay },
    { label: 'Day 95', day: 95 },
    { label: 'Day 120', day: 120 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '28px 24px' }}>
      <div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)' }}>Digital twin</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Scrub the {MAX_DAY}-day production cycle to watch reservoir heat decay and its effect on the rod string.
        </p>
      </div>

      {/* Time machine */}
      <div className="panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={togglePlay} className="btn btn-primary" aria-label={playing ? 'Pause lifecycle' : 'Play lifecycle'}>
            {playing ? <Pause size={13} /> : <Play size={13} />}
            {playing ? 'Pause' : 'Play lifecycle'}
          </button>
          <button onClick={() => { setScrubDay(1); setIsPlaying(false); }} className="btn" aria-label="Reset to day 1" title="Reset to day 1">
            <RotateCcw size={13} />
          </button>
          <div style={{ display: 'flex', gap: '2px', background: 'var(--surface-sunken)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
            {presets.map((p) => {
              const selected = scrubDay === p.day;
              return (
                <button
                  key={p.label}
                  onClick={() => { setScrubDay(p.day); setIsPlaying(false); }}
                  style={{
                    background: selected ? 'var(--surface-raised)' : 'transparent',
                    color: selected ? 'var(--text)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s ease, color 0.12s ease'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>1</span>
          <input
            type="range"
            min={1}
            max={MAX_DAY}
            value={scrubDay}
            aria-label="Production day"
            onChange={(e) => { setScrubDay(parseInt(e.target.value)); setIsPlaying(false); }}
          />
          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>{MAX_DAY}</span>
          <span className="mono-num" style={{ fontSize: '0.95rem', minWidth: '72px', textAlign: 'right' }}>
            Day {scrubDay}
          </span>
        </div>
      </div>

      <div className="twin-grid">
        {/* Schematic */}
        <div className="panel" style={{ padding: '18px 20px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>Wellbore and reservoir</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>950 m TVD · casing shaded by temperature</div>
            </div>
            <span className={`status-text ${isFloating ? 'danger' : 'good'}`}>
              {isFloating ? 'Rod floating' : 'Rod motion normal'}
            </span>
          </div>
          <WellboreSchematic
            spm={srp_operating_state.spm}
            oilRateBpd={production_state.oil_rate_bpd}
            reservoirTempC={thermal_state.reservoir_temperature_c}
            isFloating={isFloating}
            profile={wellbore_profile_summary}
          />
        </div>

        {/* State */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
              <Readout label="Reservoir temp" value={thermal_state.reservoir_temperature_c} unit="°C"
                meta={`Native 47°C · peak ${thermal_state.peak_cycle_temperature_c}°C`} />
            </div>
            <div style={{ borderBottom: '1px solid var(--line)' }}>
              <Readout label="Viscosity" value={fluid_state.estimated_viscosity_cp} unit="cP"
                meta={`Mobility ${fluid_state.darcy_mobility_md_cp} mD/cP`}
                tone={fluid_state.estimated_viscosity_cp > 2200 ? 'danger' : undefined} />
            </div>
            <div style={{ borderRight: '1px solid var(--line)' }}>
              <Readout label="Peak rod load" value={srp_operating_state.pprl_lbs} unit="lbs"
                meta={`MPRL ${srp_operating_state.mprl_lbs} lbs`} />
            </div>
            <div>
              <Readout label="Rod float risk" value={riskPct} unit="%"
                meta={isFloating ? 'Critical shock risk' : 'Positive sinking margin'}
                tone={isFloating ? 'danger' : 'good'} />
            </div>
          </div>

          <div className="panel" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              What the twin sees on day {scrubDay}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '8px' }}>
              Bottomhole temperature has fallen to <span style={{ color: 'var(--text)' }}>{thermal_state.reservoir_temperature_c}°C</span>.
              {isFloating
                ? ' Viscous drag now exceeds what the rod weight can sink through, so the rod hangs on the downstroke and slams back, the impact pounding that breaks rods.'
                : ' The sinker bars still fall fast enough on the downstroke, so the rod string stays inside its safe fatigue envelope.'}
            </p>
          </div>

          <div className="panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>Optimize this state</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Joint CSS steam volume and SRP speed setpoints</div>
            </div>
            <button className="btn btn-ghost-accent" onClick={() => onNavigateTab?.('pareto')}>
              Run optimizer
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
