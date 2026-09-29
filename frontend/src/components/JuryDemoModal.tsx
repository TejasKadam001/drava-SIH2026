import React, { useState, useEffect } from 'react';
import { X, Play, Pause, ChevronRight, Award } from 'lucide-react';

interface JuryDemoProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const JuryDemoModal: React.FC<JuryDemoProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const [currentMinute, setCurrentMinute] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const stages = [
    {
      minute: 1,
      tab: 'dashboard',
      title: 'Minute 1: The Baghewala Heavy Oil Problem',
      summary: 'Cold reservoir (47°C) + thick crude (4,200 cP) = Zero natural flow. Oil India relies on Cyclic Steam Stimulation (CSS) and Sucker Rod Pumping (SRP). But treating them separately causes severe operational failures.',
      keyTakeaway: 'The platform establishes baseline thermodynamic and fluid properties for the Jodhpur Sandstone.'
    },
    {
      minute: 2,
      tab: 'live-ops',
      title: 'Minute 2: Live Telemetry & Dynamometer Card',
      summary: 'High-frequency telemetry stream correlates bottomhole temperature, pressure, polished rod load, and downstroke pump plunger displacement in real-time.',
      keyTakeaway: 'Surface and downhole dyno cards detect fluid friction hysteresis before structural fatigue sets in.'
    },
    {
      minute: 3,
      tab: 'digital-twin',
      title: 'Minute 3: Reservoir Cooling & Viscosity Surge',
      summary: 'Scrub the 150-day time machine and watch the thermal plume shrink as the reservoir loses its steam heat. Viscosity climbs back from tens of cP into the thousands.',
      keyTakeaway: 'The Digital Twin predicts downstroke Couette drag quadrupling along the 900m wellbore.'
    },
    {
      minute: 4,
      tab: 'failures',
      title: 'Minute 4: Failure Hazard Elevation (Rod Floating)',
      summary: 'As viscosity rises at a fixed pump speed, the horsehead outruns the speed the rod can sink through the thickening oil. The carrier bar separates from the clamp and the rod slams back, sending shock waves (about 5,000 m/s in steel) down the string.',
      keyTakeaway: 'The failure engine flags the rod-float threat for the selected well and attributes it with SHAP.'
    },
    {
      minute: 5,
      tab: 'pareto',
      title: 'Minute 5: Joint CSS + SRP Pareto Optimization',
      summary: 'The constrained Pareto optimizer searches steam volume, soak time, stroke length and pump speed together, evaluated at the well\'s real point in its cooling cycle.',
      keyTakeaway: 'Every candidate shows its production, SOR and rod-float trade-off, and unsafe setpoints are rejected with a stated reason.'
    }
  ];

  const LAST_STAGE = 5;
  const playing = isPlaying && currentMinute < LAST_STAGE;

  // Advance one stage every 10 s while playing.
  useEffect(() => {
    if (!playing || !isOpen) return;
    const t = setTimeout(() => setCurrentMinute((m) => Math.min(LAST_STAGE, m + 1)), 10000);
    return () => clearTimeout(t);
  }, [playing, isOpen, currentMinute]);

  // Navigate as a consequence of the stage changing (including stage 1 on open).
  const stageTab = stages[currentMinute - 1].tab;
  useEffect(() => {
    if (isOpen) onNavigateTab(stageTab);
  }, [isOpen, stageTab, onNavigateTab]);

  const activeStage = stages[currentMinute - 1];

  const handleSelectStage = (min: number) => {
    setCurrentMinute(min);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        width: '740px',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-raised)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={20} color="var(--primary)" />
            <span style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
              Drava ENTERPRISE 5-MINUTE SYSTEM WALKTHROUGH
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="var(--text-main)" />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', padding: '16px 24px', gap: '8px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
          {stages.map((s) => (
            <button
              key={s.minute}
              onClick={() => handleSelectStage(s.minute)}
              style={{
                background: currentMinute === s.minute ? 'var(--text-main)' : 'var(--surface-raised)',
                border: '1px solid var(--border)',
                padding: '10px',
                color: currentMinute === s.minute ? 'var(--bg)' : 'var(--text-muted)',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
                textTransform: 'uppercase'
              }}
            >
              Min {s.minute}
            </button>
          ))}
        </div>

        {/* Active Stage Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--surface-raised)' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {activeStage.title}
          </div>
          <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {activeStage.summary}
          </div>
          <div style={{
            background: 'var(--good-soft)',
            border: '1px solid var(--good)',
            padding: '12px 16px',
            fontSize: '0.80rem',
            color: 'var(--good)',
            lineHeight: '1.5'
          }}>
            <strong style={{ fontWeight: 600 }}>Key Technical Defense: </strong> {activeStage.keyTakeaway}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-raised)'
        }}>
          <button
            onClick={() => {
              if (!playing && currentMinute >= LAST_STAGE) setCurrentMinute(1);
              setIsPlaying(!playing);
            }}
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--text-main)',
              border: '1px solid var(--border)',
              padding: '8px 16px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            <span>{playing ? 'Pause auto-advance' : currentMinute >= LAST_STAGE ? 'Replay tour' : 'Resume auto-advance'}</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                onNavigateTab(activeStage.tab);
                onClose();
              }}
              style={{
                background: 'var(--primary)',
                color: 'var(--bg)',
                border: '1px solid var(--border)',
                padding: '8px 20px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Inspect this screen in depth</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
