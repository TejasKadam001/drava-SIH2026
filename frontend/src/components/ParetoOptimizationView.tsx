import React, { useState } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ZAxis } from 'recharts';
import { Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { OptimizationResult, ParetoPoint } from '../types/petro';

interface ParetoProps {
  optimizationData: OptimizationResult | null;
  onApplyPlan: (plan: any) => void;
}

export const ParetoOptimizationView: React.FC<ParetoProps> = ({ optimizationData, onApplyPlan }) => {
  // Hooks must run on every render, before any early return.
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  if (!optimizationData) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading Pareto optimizer results...</div>;
  }

  const { pareto_frontier, rejected_alternatives_sample, expected_outcome } = optimizationData;
  const selectedPoint: ParetoPoint | null = pareto_frontier[Math.min(selectedIdx, pareto_frontier.length - 1)] ?? null;

  // Current production, recovered from the backend's own baseline comparison.
  const baselineBpd = expected_outcome.production_bpd / (1 + expected_outcome.production_change_pct / 100);
  const maxProdPoint = pareto_frontier.reduce((a, b) => (b.production_bpd > a.production_bpd ? b : a), pareto_frontier[0]);
  const riskColor = (r: number) => (r > 0.4 ? 'var(--danger)' : r > 0.2 ? 'var(--warn)' : 'var(--good)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 20px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--accent)" />
            <span>Constrained multi-objective Pareto optimizer</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            NSGA-II Non-Dominated Frontier: Oil Production vs Steam-to-Oil Ratio vs Mechanical Failure Hazard
          </div>
        </div>
        <span className="tech-badge badge-green">Optimization converged (SLSQP)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
        {/* Pareto Frontier 2D Scatter Chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>Pareto Frontier: Production (bpd) vs Cumulative SOR</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click any candidate point to inspect engineering trade-offs</div>
            </div>
          </div>

          <div style={{ width: '100%', height: '360px' }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 24, left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  type="number"
                  dataKey="production_bpd"
                  name="Production"
                  unit=" bpd"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  label={{ value: 'Oil Production (bbl/day)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)' }}
                />
                <YAxis
                  type="number"
                  dataKey="sor"
                  name="SOR"
                  unit=""
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  domain={[(min: number) => Math.max(0, +(min - 0.1).toFixed(2)), (max: number) => +(max + 0.1).toFixed(2)]}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  label={{ value: 'Steam-oil ratio', angle: -90, position: 'insideLeft', offset: -8, fill: 'var(--text-muted)', style: { textAnchor: 'middle' } }}
                />
                <ZAxis type="number" dataKey="composite_score" range={[60, 240]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const data = payload[0].payload as ParetoPoint;
                      return (
                        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text)' }}>
                          <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' }}>Candidate Operating Point</div>
                          <div>Production: <strong>{data.production_bpd} bpd</strong></div>
                          <div>Cumulative SOR: <strong>{data.sor}</strong></div>
                          <div>Energy: <strong>{data.energy_kwh_bbl} kWh/bbl</strong></div>
                          <div>Failure Risk: <strong>{(data.failure_risk * 100).toFixed(1)}%</strong></div>
                          <div>Settings: <strong>{data.spm} SPM @ {data.stroke_m}m | {data.steam_tons} T</strong></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  name="Pareto Optimal Solutions"
                  data={pareto_frontier}
                  fill="var(--accent)"
                  fillOpacity={0.55}
                  stroke="var(--accent)"
                  strokeWidth={1}
                  onClick={(_: any, idx: number) => setSelectedIdx(idx)}
                  style={{ cursor: 'pointer' }}
                />
                {selectedPoint && (
                  <Scatter
                    name="Selected"
                    data={[selectedPoint]}
                    fill="var(--text)"
                    stroke="var(--accent)"
                    strokeWidth={3}
                    isAnimationActive={false}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Selected Candidate Detailed Inspection Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedPoint && (
            <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent)' }}>Selected candidate trade-off</span>
                <span className="tech-badge badge-green">Score: {selectedPoint.composite_score}</span>
              </div>

              {/* Setpoint Parameters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '8px 12px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>SRP Speed</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{selectedPoint.spm} SPM</div>
                </div>
                <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '8px 12px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Stroke Length</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{selectedPoint.stroke_m} m</div>
                </div>
                <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '8px 12px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Next Steam Volume</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--warn)', fontFamily: 'var(--font-mono)' }}>{selectedPoint.steam_tons} Tons</div>
                </div>
                <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '8px 12px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Failure Risk</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: riskColor(selectedPoint.failure_risk), fontFamily: 'var(--font-mono)' }}>{(selectedPoint.failure_risk * 100).toFixed(1)}%</div>
                </div>
              </div>

              {/* Trade-off answers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <ArrowUpRight size={16} color="var(--good)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div><strong style={{ color: 'var(--text)' }}>What do I gain?</strong> {selectedPoint.production_bpd >= baselineBpd ? '+' : ''}{(((selectedPoint.production_bpd - baselineBpd) / baselineBpd) * 100).toFixed(1)}% oil vs. today ({baselineBpd.toFixed(1)} → {selectedPoint.production_bpd} bpd) at {(selectedPoint.failure_risk * 100).toFixed(1)}% rod-float risk.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <ArrowDownRight size={16} color="var(--warn)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div><strong style={{ color: 'var(--text)' }}>What do I sacrifice?</strong> {selectedPoint === maxProdPoint
                    ? `Nothing on output: this is the highest-production candidate. It uses ${selectedPoint.energy_kwh_bbl} kWh/bbl.`
                    : `Runs at ${selectedPoint.spm} SPM, giving up ${(maxProdPoint.production_bpd - selectedPoint.production_bpd).toFixed(1)} bpd vs. the top-output candidate (${maxProdPoint.spm} SPM) to keep the rod safer.`}</div>
                </div>
              </div>

              <button
                onClick={() => onApplyPlan(selectedPoint)}
                className="neo-btn neo-btn-primary"
                style={{
                  marginTop: '16px',
                  width: '100%',
                  padding: '10px',
                  fontSize: '0.82rem',
                  justifyContent: 'center'
                }}
              >
                Dispatch setpoint to VFD & CSS schedule
              </button>
            </div>
          )}

          {/* Rejected Alternatives Box */}
          <div className="glass-panel" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
              Rejected alternatives & physical safety justification
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rejected_alternatives_sample.length === 0 && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Every candidate in this run passed the safety constraints, so nothing was rejected.
                </div>
              )}
              {rejected_alternatives_sample.map((rej, idx) => (
                <div key={idx} style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', padding: '8px 10px', borderRadius: '4px', fontSize: '0.72rem' }}>
                  <div style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    Rejected Candidate ({rej.spm} SPM @ {rej.stroke_m}m, {rej.steam_tons} T Steam)
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                    Reason: {rej.rejection_reason}
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
