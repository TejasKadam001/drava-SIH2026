import React from 'react';
import { BarChart3, ShieldAlert, Wrench } from 'lucide-react';
import { FailureIntelligence } from '../contracts/domain';

interface FailureProps {
  failureData: FailureIntelligence | null;
  onNavigateTab?: (tab: string) => void;
}

type HazardKey = keyof FailureIntelligence['risks'];

interface HazardCard {
  key: HazardKey;
  title: string;
  accent: string;
  blurb: string;
}

const HAZARDS: HazardCard[] = [
  {
    key: 'rod_floating', title: 'Rod floating risk', accent: 'var(--danger)',
    blurb: 'Couette viscous shear drag outrunning lower sinker bar terminal gravitational sinking velocity.',
  },
  {
    key: 'impact_loading', title: 'Impact loading (pound)', accent: 'var(--warn)',
    blurb: 'Slack carrier bridle catching delayed rod string; induces sonic shock waves at ~5,000 m/s.',
  },
  {
    key: 'parted_rod', title: 'Parted rod breakage', accent: 'var(--accent)',
    blurb: 'Cyclic Goodman fatigue limit exceedance at rod pin threads and coupling shoulders.',
  },
  {
    key: 'pump_unseating', title: 'Pump unseating risk', accent: 'var(--good)',
    blurb: 'Frictional upstroke hydraulic drag lifting pump barrel off bottomhole mechanical seating nipple.',
  },
];

const BAR_COLOURS = ['var(--danger)', 'var(--warn)', 'var(--accent)'];

const badgeFor = (level: string): string =>
  level === 'CRITICAL' || level === 'HIGH' ? 'badge-red' : level === 'MEDIUM' ? 'badge-amber' : 'badge-green';

const cardTitle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)',
};

export const FailureIntelligenceView: React.FC<FailureProps> = ({ failureData, onNavigateTab }) => {
  if (!failureData) {
    return (
      <div style={{ padding: 40, color: 'var(--text-muted)', fontWeight: 600 }}>
        Loading failure intelligence...
      </div>
    );
  }

  const { risks, feature_attribution_shap: attribution, overall_health_score: health, recommended_action } = failureData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 20px' }}>
      <div
        className="glass-panel"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px' }}
      >
        <div>
          <div style={{ ...cardTitle, fontSize: '1.05rem' }}>
            <ShieldAlert size={20} color="var(--danger)" />
            <span>Calibrated equipment failure intelligence & SHAP attribution</span>
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            Multi-hazard predictive survival analysis: Rod Floating, Impact Loading, Parted Rods, and Pump Unseating
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Composite Asset Health:</span>
          <span className="metric-number" style={{ fontSize: '1.3rem', color: health > 70 ? 'var(--good)' : 'var(--danger)' }}>
            {health} / 100
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {HAZARDS.map(({ key, title, accent, blurb }) => {
          const hazard = risks[key];
          return (
            <div key={key} className="glass-panel" style={{ padding: '18px 20px', borderTop: `3px solid ${accent}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{title}</span>
                <span className={`tech-badge ${badgeFor(hazard.level)}`}>{hazard.level}</span>
              </div>
              <div className="metric-number" style={{ fontSize: '2rem', color: 'var(--text)', marginBottom: 4 }}>
                {(hazard.probability * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 500, lineHeight: 1.45, color: 'var(--text-muted)' }}>
                {blurb}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ ...cardTitle, marginBottom: 14 }}>
            <BarChart3 size={18} color="var(--accent)" />
            <span>Explainable AI: SHAP failure contribution breakdown</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {attribution.map((item, i) => (
              <div key={item.feature}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text)' }}>{item.feature}</span>
                  <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>+{item.contribution_pct}%</span>
                </div>
                <div style={{ height: 8, overflow: 'hidden', borderRadius: 4, background: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
                  <div style={{ height: '100%', width: `${item.contribution_pct}%`, background: BAR_COLOURS[Math.min(i, 2)] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 22 }}>
          <div>
            <div style={{ ...cardTitle, marginBottom: 12 }}>
              <Wrench size={18} color="var(--good)" />
              <span>Proactive risk mitigation prescription</span>
            </div>
            <div style={{ padding: 14, borderRadius: 4, background: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.5, color: 'var(--text)' }}>
                {recommended_action}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              Calibrated via Gibbs Wave Dynamics
            </span>
            <button
              className="neo-btn neo-btn-primary"
              style={{ fontSize: '0.78rem' }}
              onClick={() => onNavigateTab?.('srp-optimizer')}
            >
              Apply speed reduction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
