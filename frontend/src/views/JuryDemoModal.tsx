import React, { useEffect, useState } from 'react';
import { Award, ChevronRight, Pause, Play, X } from 'lucide-react';

interface JuryDemoProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

interface TourStop {
  tab: string;
  title: string;
  summary: string;
  takeaway: string;
}

const TOUR: TourStop[] = [
  {
    tab: 'dashboard',
    title: 'Minute 1: The Baghewala Heavy Oil Problem',
    summary: 'Cold reservoir (47°C) + thick crude (4,200 cP) = Zero natural flow. Oil India relies on Cyclic Steam Stimulation (CSS) and Sucker Rod Pumping (SRP). But treating them separately causes severe operational failures.',
    takeaway: 'The platform establishes baseline thermodynamic and fluid properties for the Jodhpur Sandstone.',
  },
  {
    tab: 'live-ops',
    title: 'Minute 2: Live Telemetry & Dynamometer Card',
    summary: 'High-frequency telemetry stream correlates bottomhole temperature, pressure, polished rod load, and downstroke pump plunger displacement in real-time.',
    takeaway: 'Surface and downhole dyno cards detect fluid friction hysteresis before structural fatigue sets in.',
  },
  {
    tab: 'digital-twin',
    title: 'Minute 3: Reservoir Cooling & Viscosity Surge',
    summary: 'Scrub the 150-day time machine and watch the thermal plume shrink as the reservoir loses its steam heat. Viscosity climbs back from tens of cP into the thousands.',
    takeaway: 'The Digital Twin predicts downstroke Couette drag quadrupling along the 900m wellbore.',
  },
  {
    tab: 'failures',
    title: 'Minute 4: Failure Hazard Elevation (Rod Floating)',
    summary: 'As viscosity rises at a fixed pump speed, the horsehead outruns the speed the rod can sink through the thickening oil. The carrier bar separates from the clamp and the rod slams back, sending shock waves (about 5,000 m/s in steel) down the string.',
    takeaway: 'The failure engine flags the rod-float threat for the selected well and attributes it with SHAP.',
  },
  {
    tab: 'pareto',
    title: 'Minute 5: Joint CSS + SRP Pareto Optimization',
    summary: "The constrained Pareto optimizer searches steam volume, soak time, stroke length and pump speed together, evaluated at the well's real point in its cooling cycle.",
    takeaway: 'Every candidate shows its production, SOR and rod-float trade-off, and unsafe setpoints are rejected with a stated reason.',
  },
];

const STOP_SECONDS = 10;
const LAST = TOUR.length - 1;
const border = '1px solid var(--border)';

const button = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600,
  background: 'var(--surface-raised)', color: 'var(--text-main)', border, ...extra,
});

export const JuryDemoModal: React.FC<JuryDemoProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const [step, setStep] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const running = autoplay && step < LAST;
  const stop = TOUR[step];

  // Move on after STOP_SECONDS while the tour is running.
  useEffect(() => {
    if (!running || !isOpen) return;
    const timer = setTimeout(() => setStep((s) => Math.min(LAST, s + 1)), STOP_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [running, isOpen, step]);

  // Keep the app on the tab that belongs to the current stop (also fires when the modal opens).
  useEffect(() => {
    if (isOpen) onNavigateTab(stop.tab);
  }, [isOpen, stop.tab, onNavigateTab]);

  if (!isOpen) return null;

  const toggleAutoplay = () => {
    if (!running && step >= LAST) setStep(0);
    setAutoplay(!running);
  };

  const openScreen = () => {
    onNavigateTab(stop.tab);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, padding: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.5)',
    }}>
      <div style={{
        width: 740, maxWidth: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--surface-raised)', border,
      }}>
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderBottom: border,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={20} color="var(--primary)" />
            <span style={{ fontSize: '0.98rem', fontWeight: 600, letterSpacing: '0.02em', color: 'var(--text-main)' }}>
              Drava ENTERPRISE 5-MINUTE SYSTEM WALKTHROUGH
            </span>
          </div>
          <button onClick={onClose} aria-label="Close tour" style={button({ padding: 4, justifyContent: 'center' })}>
            <X size={18} color="var(--text-main)" />
          </button>
        </header>

        <nav style={{
          display: 'grid', gridTemplateColumns: `repeat(${TOUR.length}, 1fr)`, gap: 8,
          padding: '16px 24px', borderBottom: border,
        }}>
          {TOUR.map((_, i) => {
            const active = i === step;
            return (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={button({
                  padding: 10, justifyContent: 'center', fontSize: '0.74rem', textTransform: 'uppercase',
                  background: active ? 'var(--text-main)' : 'var(--surface-raised)',
                  color: active ? 'var(--bg)' : 'var(--text-muted)',
                })}
              >
                Min {i + 1}
              </button>
            );
          })}
        </nav>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 24 }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>{stop.title}</h2>
          <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>{stop.summary}</p>
          <div style={{
            padding: '12px 16px', fontSize: '0.80rem', lineHeight: 1.5,
            background: 'var(--good-soft)', border: '1px solid var(--good)', color: 'var(--good)',
          }}>
            <strong style={{ fontWeight: 600 }}>Key Technical Defense: </strong> {stop.takeaway}
          </div>
        </section>

        <footer style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderTop: border,
        }}>
          <button onClick={toggleAutoplay} style={button({ padding: '8px 16px', fontSize: '0.78rem' })}>
            {running ? <Pause size={14} /> : <Play size={14} />}
            <span>{running ? 'Pause auto-advance' : step >= LAST ? 'Replay tour' : 'Resume auto-advance'}</span>
          </button>

          <button
            onClick={openScreen}
            style={button({ padding: '8px 20px', fontSize: '0.82rem', background: 'var(--primary)', color: 'var(--bg)' })}
          >
            <span>Inspect this screen in depth</span>
            <ChevronRight size={16} />
          </button>
        </footer>
      </div>
    </div>
  );
};
