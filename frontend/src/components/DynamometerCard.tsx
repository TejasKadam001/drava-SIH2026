import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Activity, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { DynoCardData } from '../types/petro';

interface DynoCardProps {
  dynoData: DynoCardData | null;
  onRefresh: () => void;
}

export const DynamometerCard: React.FC<DynoCardProps> = ({ dynoData }) => {
  if (!dynoData) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading dynamometer card...</div>;
  }

  const { card_points, stroke_length_m, spm, viscosity_cp, rod_floating_detected } = dynoData;
  const strokeIn = Math.round(stroke_length_m * 39.3701);

  // Compute maximum and minimum loads from points
  const maxLoad = Math.max(...card_points.map((p) => p.surface_load_lbs));
  const minLoad = Math.min(...card_points.map((p) => p.surface_load_lbs));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 20px' }}>
      {/* Header Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent)" />
            <span>Real-time sucker rod dynamometer card analyzer</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Surface Polished Rod Load & Downhole Pump Barrel Load vs Polished Rod Position (API RP 11L)
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={`tech-badge ${rod_floating_detected ? 'badge-red' : 'badge-green'}`} style={{ padding: '6px 12px' }}>
            {rod_floating_detected ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
            <span>{rod_floating_detected ? 'ROD FLOATING / SLACK BRIDLE DETECTED' : 'CARD SIGNATURE NORMAL'}</span>
          </div>
        </div>
      </div>

      {/* Main Dynamometer Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Left: Load vs Position Dyno Card Chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>Load vs Position Closed Cycle (1 Full Stroke)</span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text)', border: '1px solid var(--line)' }}></span> Surface Card (PPRL/MPRL)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', border: '1px solid var(--line)' }}></span> Downhole Plunger Card
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '380px' }}>
            <ResponsiveContainer>
              <LineChart data={card_points}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="position_in"
                  stroke="var(--text-muted)"
                  type="number"
                  domain={[0, strokeIn]}
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Polished Rod Position (inches)', position: 'insideBottom', offset: -4, fill: 'var(--text-muted)' }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  domain={[0, 24000]}
                  label={{ value: 'Load (lbf)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }}
                />
                <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600 }} />
                
                {/* Structural limit lines */}
                <ReferenceLine y={22000} stroke="var(--danger)" strokeDasharray="4 4" label={{ value: 'API Beam Limit (22k lbs)', fill: 'var(--danger)', fontSize: 10, position: 'top' }} />
                <ReferenceLine y={1200} stroke="var(--warn)" strokeDasharray="4 4" label={{ value: 'Rod Float Minimum Limit (1.2k lbs)', fill: 'var(--warn)', fontSize: 10, position: 'bottom' }} />

                <Line
                  type="linear"
                  dataKey="surface_load_lbs"
                  stroke="var(--text)"
                  strokeWidth={2.2}
                  dot={false}
                  name="Surface Load (lbs)"
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="downhole_load_lbs"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Downhole Load (lbs)"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Kinematics & Card Interpretation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Kinematics Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
              Kinematic & loading metrics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '10px 12px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak Surface Load</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {maxLoad} lbs
                </div>
              </div>
              <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '10px 12px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Minimum Surface Load</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: minLoad < 1200 ? 'var(--danger)' : 'var(--warn)', fontFamily: 'var(--font-mono)' }}>
                  {minLoad} lbs
                </div>
              </div>
              <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '10px 12px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Stroke Length & SPM</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {stroke_length_m}m @ {spm} SPM
                </div>
              </div>
              <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '10px 12px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fluid Viscosity</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--warn)', fontFamily: 'var(--font-mono)' }}>
                  {viscosity_cp} cP
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Interpretation */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <HelpCircle size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>Physical card diagnostics</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5', fontWeight: 500 }}>
              {rod_floating_detected ? (
                <div>
                  <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '6px' }}>
                    Warning: Rod Floating & Impact Pounding Signature Detected
                  </p>
                  <p>
                    The downstroke load has collapsed towards zero because upward Couette viscous shear force exceeds the downward rod weight. 
                    Slack bridle cables will violently re-engage at the turnaround, propagating destructive tensile shock waves down the steel string.
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--good)', fontWeight: 600, marginBottom: '6px' }}>
                    Normal Harmonic Operation
                  </p>
                  <p>
                    Smooth load build-up on upstroke (traveling valve closure) and regular load release on downstroke. 
                    Net downstroke accelerating force is well above the minimum rod float threshold.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
