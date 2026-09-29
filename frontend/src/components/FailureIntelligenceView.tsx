import React from 'react';
import { ShieldAlert, BarChart3, Wrench } from 'lucide-react';
import { FailureIntelligence } from '../types/petro';

interface FailureProps {
  failureData: FailureIntelligence | null;
  onNavigateTab?: (tab: string) => void;
}

export const FailureIntelligenceView: React.FC<FailureProps> = ({ failureData, onNavigateTab }) => {
  if (!failureData) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading failure intelligence...</div>;
  }

  const { risks, feature_attribution_shap, overall_health_score, recommended_action } = failureData;

  const getBadgeClass = (lvl: string) => {
    switch (lvl) {
      case 'CRITICAL': return 'badge-red';
      case 'HIGH': return 'badge-red';
      case 'MEDIUM': return 'badge-amber';
      default: return 'badge-green';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 20px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} color="var(--danger)" />
            <span>Calibrated equipment failure intelligence & SHAP attribution</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Multi-hazard predictive survival analysis: Rod Floating, Impact Loading, Parted Rods, and Pump Unseating
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Composite Asset Health:</span>
          <span className="metric-number" style={{ fontSize: '1.3rem', color: overall_health_score > 70 ? 'var(--good)' : 'var(--danger)' }}>
            {overall_health_score} / 100
          </span>
        </div>
      </div>

      {/* 4 Hazard Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Rod Floating */}
        <div className="glass-panel" style={{ padding: '18px 20px', borderTop: '3px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Rod floating risk</span>
            <span className={`tech-badge ${getBadgeClass(risks.rod_floating.level)}`}>{risks.rod_floating.level}</span>
          </div>
          <div className="metric-number" style={{ fontSize: '2rem', color: 'var(--text)', marginBottom: '4px' }}>
            {(risks.rod_floating.probability * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.45', fontWeight: 500 }}>
            Couette viscous shear drag outrunning lower sinker bar terminal gravitational sinking velocity.
          </div>
        </div>

        {/* Impact Loading */}
        <div className="glass-panel" style={{ padding: '18px 20px', borderTop: '3px solid var(--warn)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Impact loading (pound)</span>
            <span className={`tech-badge ${getBadgeClass(risks.impact_loading.level)}`}>{risks.impact_loading.level}</span>
          </div>
          <div className="metric-number" style={{ fontSize: '2rem', color: 'var(--text)', marginBottom: '4px' }}>
            {(risks.impact_loading.probability * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.45', fontWeight: 500 }}>
            Slack carrier bridle catching delayed rod string; induces sonic shock waves at ~5,000 m/s.
          </div>
        </div>

        {/* Parted Rod */}
        <div className="glass-panel" style={{ padding: '18px 20px', borderTop: '3px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Parted rod breakage</span>
            <span className={`tech-badge ${getBadgeClass(risks.parted_rod.level)}`}>{risks.parted_rod.level}</span>
          </div>
          <div className="metric-number" style={{ fontSize: '2rem', color: 'var(--text)', marginBottom: '4px' }}>
            {(risks.parted_rod.probability * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.45', fontWeight: 500 }}>
            Cyclic Goodman fatigue limit exceedance at rod pin threads and coupling shoulders.
          </div>
        </div>

        {/* Pump Unseating */}
        <div className="glass-panel" style={{ padding: '18px 20px', borderTop: '3px solid var(--good)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Pump unseating risk</span>
            <span className={`tech-badge ${getBadgeClass(risks.pump_unseating.level)}`}>{risks.pump_unseating.level}</span>
          </div>
          <div className="metric-number" style={{ fontSize: '2rem', color: 'var(--text)', marginBottom: '4px' }}>
            {(risks.pump_unseating.probability * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.45', fontWeight: 500 }}>
            Frictional upstroke hydraulic drag lifting pump barrel off bottomhole mechanical seating nipple.
          </div>
        </div>
      </div>

      {/* SHAP Feature Attribution Waterfall & Action */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* SHAP Feature Attribution */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <BarChart3 size={18} color="var(--accent)" />
            <span>Explainable AI: SHAP failure contribution breakdown</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {feature_attribution_shap.map((feat, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text)' }}>{feat.feature}</span>
                  <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>+{feat.contribution_pct}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--surface-raised)', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${feat.contribution_pct}%`,
                    background: idx === 0 ? 'var(--danger)' : idx === 1 ? 'var(--warn)' : 'var(--accent)'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Engineering Recommendation */}
        <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Wrench size={18} color="var(--good)" />
              <span>Proactive risk mitigation prescription</span>
            </div>
            <div style={{ background: 'var(--surface-raised)', padding: '14px', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: '1.5', fontWeight: 500 }}>
                {recommended_action}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>Calibrated via Gibbs Wave Dynamics</span>
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
