import React, { useState } from 'react';
import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { OptimizationResult, ParetoPoint } from '../contracts/domain';
import { PageHeader } from './ui';

interface ParetoProps {
  optimizationData: OptimizationResult | null;
  onApplyPlan: (plan: any) => void;
}

const riskShade = (risk: number) => (risk > 0.4 ? 'var(--danger)' : risk > 0.2 ? 'var(--warn)' : 'var(--good)');

const Setpoint: React.FC<{ label: string; value: string; colour?: string }> = ({ label, value, colour = 'var(--text)' }) => (
  <div style={{ padding: '8px 12px', borderRadius: 4, background: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</div>
    <div style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: colour }}>{value}</div>
  </div>
);

const Takeaway: React.FC<{ icon: React.ReactNode; heading: string; children: React.ReactNode }> = (
  { icon, heading, children },
) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
    <span style={{ flexShrink: 0, marginTop: 2 }}>{icon}</span>
    <div><strong style={{ color: 'var(--text)' }}>{heading}</strong> {children}</div>
  </div>
);

const PointTooltip: React.FC<{ payload?: { payload: ParetoPoint }[] }> = ({ payload }) => {
  if (!payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--text)',
      background: 'var(--surface-raised)', border: '1px solid var(--line)',
    }}>
      <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--accent)' }}>Candidate Operating Point</div>
      <div>Production: <strong>{p.production_bpd} bpd</strong></div>
      <div>Cumulative SOR: <strong>{p.sor}</strong></div>
      <div>Energy: <strong>{p.energy_kwh_bbl} kWh/bbl</strong></div>
      <div>Failure Risk: <strong>{(p.failure_risk * 100).toFixed(1)}%</strong></div>
      <div>Settings: <strong>{p.spm} SPM @ {p.stroke_m}m | {p.steam_tons} T</strong></div>
    </div>
  );
};

export const ParetoOptimizationView: React.FC<ParetoProps> = ({ optimizationData, onApplyPlan }) => {
  // Hooks run on every render, so this sits above the early return.
  const [selected, setSelected] = useState(0);

  if (!optimizationData) {
    return (
      <div style={{ padding: 40, fontWeight: 600, color: 'var(--text-muted)' }}>
        Loading Pareto optimizer results...
      </div>
    );
  }

  const { pareto_frontier: frontier, rejected_alternatives_sample: rejected, expected_outcome: outcome } = optimizationData;
  const point: ParetoPoint | null = frontier[Math.min(selected, frontier.length - 1)] ?? null;

  // Today's production, recovered from the backend's own baseline comparison.
  const todayBpd = outcome.production_bpd / (1 + outcome.production_change_pct / 100);
  const topOutput = frontier.reduce((best, p) => (p.production_bpd > best.production_bpd ? p : best), frontier[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 20px' }}>
      <PageHeader
        icon={<Sparkles size={20} color="var(--accent)" />}
        title="Constrained multi-objective Pareto optimizer"
        subtitle="Ranked feasible plans from a constrained grid search: Oil Production vs Steam-to-Oil Ratio vs Mechanical Failure Hazard"
        badge={<span className="tech-badge badge-green">Search complete (constrained grid)</span>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
              Pareto Frontier: Production (bpd) vs Cumulative SOR
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Click any candidate point to inspect engineering trade-offs
            </div>
          </div>

          <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 24, left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  type="number" dataKey="production_bpd" name="Production" unit=" bpd"
                  stroke="var(--text-muted)" tick={{ fontSize: 11 }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  label={{ value: 'Oil Production (bbl/day)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)' }}
                />
                <YAxis
                  type="number" dataKey="sor" name="SOR" unit=""
                  stroke="var(--text-muted)" tick={{ fontSize: 11 }}
                  domain={[(min: number) => Math.max(0, +(min - 0.1).toFixed(2)), (max: number) => +(max + 0.1).toFixed(2)]}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  label={{ value: 'Steam-oil ratio', angle: -90, position: 'insideLeft', offset: -8, fill: 'var(--text-muted)', style: { textAnchor: 'middle' } }}
                />
                <ZAxis type="number" dataKey="composite_score" range={[60, 240]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<PointTooltip />} />
                <Scatter
                  name="Pareto Optimal Solutions" data={frontier}
                  fill="var(--accent)" fillOpacity={0.55} stroke="var(--accent)" strokeWidth={1}
                  onClick={(_: any, idx: number) => setSelected(idx)}
                  style={{ cursor: 'pointer' }}
                />
                {point && (
                  <Scatter
                    name="Selected" data={[point]}
                    fill="var(--text)" stroke="var(--accent)" strokeWidth={3} isAnimationActive={false}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {point && (
            <div className="glass-panel" style={{ padding: 20, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent)' }}>Selected candidate trade-off</span>
                <span className="tech-badge badge-green">Score: {point.composite_score}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                <Setpoint label="SRP Speed" value={`${point.spm} SPM`} />
                <Setpoint label="Stroke Length" value={`${point.stroke_m} m`} />
                <Setpoint label="Next Steam Volume" value={`${point.steam_tons} Tons`} colour="var(--warn)" />
                <Setpoint
                  label="Failure Risk" value={`${(point.failure_risk * 100).toFixed(1)}%`}
                  colour={riskShade(point.failure_risk)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                <Takeaway icon={<ArrowUpRight size={16} color="var(--good)" />} heading="What do I gain?">
                  {point.production_bpd >= todayBpd ? '+' : ''}
                  {(((point.production_bpd - todayBpd) / todayBpd) * 100).toFixed(1)}% oil vs. today (
                  {todayBpd.toFixed(1)} → {point.production_bpd} bpd) at {(point.failure_risk * 100).toFixed(1)}% rod-float risk.
                </Takeaway>
                <Takeaway icon={<ArrowDownRight size={16} color="var(--warn)" />} heading="What do I sacrifice?">
                  {point === topOutput
                    ? `Nothing on output: this is the highest-production candidate. It uses ${point.energy_kwh_bbl} kWh/bbl.`
                    : `Runs at ${point.spm} SPM, giving up ${(topOutput.production_bpd - point.production_bpd).toFixed(1)} bpd vs. the top-output candidate (${topOutput.spm} SPM) to keep the rod safer.`}
                </Takeaway>
              </div>

              <button
                onClick={() => onApplyPlan(point)}
                className="neo-btn neo-btn-primary"
                style={{ marginTop: 16, width: '100%', padding: 10, fontSize: '0.82rem', justifyContent: 'center' }}
              >
                Dispatch setpoint to VFD & CSS schedule
              </button>
            </div>
          )}

          <div className="glass-panel" style={{ padding: '18px 20px' }}>
            <div style={{ marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
              Rejected alternatives & physical safety justification
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rejected.length === 0 && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Every candidate in this run passed the safety constraints, so nothing was rejected.
                </div>
              )}
              {rejected.map((r, i) => (
                <div
                  key={i}
                  style={{ padding: '8px 10px', borderRadius: 4, fontSize: '0.72rem', background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--danger)' }}>
                    Rejected Candidate ({r.spm} SPM @ {r.stroke_m}m, {r.steam_tons} T Steam)
                  </div>
                  <div style={{ marginTop: 2, fontWeight: 500, color: 'var(--text-muted)' }}>
                    Reason: {r.rejection_reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
