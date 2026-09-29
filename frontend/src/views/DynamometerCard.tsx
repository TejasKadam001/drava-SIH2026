import React from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, AlertTriangle, HelpCircle, ShieldCheck } from 'lucide-react';
import { DynoCardData } from '../contracts/domain';

interface DynoCardProps {
  dynoData: DynoCardData | null;
  onRefresh: () => void;
}

const INCHES_PER_METRE = 39.3701;
const BEAM_LIMIT_LBS = 22000;
const FLOAT_FLOOR_LBS = 1200;

const tile: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 4, background: 'var(--surface-raised)', border: '1px solid var(--line)',
};
const tileLabel: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' };
const mono = (size: string, color: string): React.CSSProperties => ({
  fontSize: size, fontWeight: 600, color, fontFamily: 'var(--font-mono)',
});

const Legend: React.FC<{ colour: string; label: string }> = ({ colour, label }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: colour }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colour, border: '1px solid var(--line)' }} />
    {label}
  </span>
);

const Metric: React.FC<{ label: string; value: string; size?: string; colour?: string }> = (
  { label, value, size = '1.05rem', colour = 'var(--text)' },
) => (
  <div style={tile}>
    <div style={tileLabel}>{label}</div>
    <div style={mono(size, colour)}>{value}</div>
  </div>
);

export const DynamometerCard: React.FC<DynoCardProps> = ({ dynoData }) => {
  if (!dynoData) {
    return (
      <div style={{ padding: 40, color: 'var(--text-muted)', fontWeight: 600 }}>
        Loading dynamometer card...
      </div>
    );
  }

  const { card_points: points, stroke_length_m, spm, viscosity_cp, rod_floating_detected: floating } = dynoData;
  const strokeInches = Math.round(stroke_length_m * INCHES_PER_METRE);
  const loads = points.map((p) => p.surface_load_lbs);
  const peak = Math.max(...loads);
  const trough = Math.min(...loads);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 20px' }}>
      <div
        className="glass-panel"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
            <Activity size={20} color="var(--accent)" />
            <span>Real-time sucker rod dynamometer card analyzer</span>
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            Surface Polished Rod Load & Downhole Pump Barrel Load vs Polished Rod Position (API RP 11L)
          </div>
        </div>

        <div className={`tech-badge ${floating ? 'badge-red' : 'badge-green'}`} style={{ padding: '6px 12px' }}>
          {floating ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
          <span>{floating ? 'ROD FLOATING / SLACK BRIDLE DETECTED' : 'CARD SIGNATURE NORMAL'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
              Load vs Position Closed Cycle (1 Full Stroke)
            </span>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.74rem', fontWeight: 600 }}>
              <Legend colour="var(--text)" label="Surface Card (PPRL/MPRL)" />
              <Legend colour="var(--accent)" label="Downhole Plunger Card" />
            </div>
          </div>

          <div style={{ width: '100%', height: 380 }}>
            <ResponsiveContainer>
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="position_in"
                  type="number"
                  domain={[0, strokeInches]}
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Polished Rod Position (inches)', position: 'insideBottom', offset: -4, fill: 'var(--text-muted)' }}
                />
                <YAxis
                  domain={[0, 24000]}
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Load (lbf)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-raised)', border: '1px solid var(--line)', borderRadius: 4,
                    fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)',
                  }}
                />

                <ReferenceLine
                  y={BEAM_LIMIT_LBS} stroke="var(--danger)" strokeDasharray="4 4"
                  label={{ value: 'API Beam Limit (22k lbs)', fill: 'var(--danger)', fontSize: 10, position: 'top' }}
                />
                <ReferenceLine
                  y={FLOAT_FLOOR_LBS} stroke="var(--warn)" strokeDasharray="4 4"
                  label={{ value: 'Rod Float Minimum Limit (1.2k lbs)', fill: 'var(--warn)', fontSize: 10, position: 'bottom' }}
                />

                <Line
                  type="linear" dataKey="surface_load_lbs" name="Surface Load (lbs)"
                  stroke="var(--text)" strokeWidth={2.2} dot={false} isAnimationActive={false}
                />
                <Line
                  type="linear" dataKey="downhole_load_lbs" name="Downhole Load (lbs)"
                  stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ marginBottom: 12, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
              Kinematic & loading metrics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Metric label="Peak Surface Load" value={`${peak} lbs`} size="1.25rem" />
              <Metric
                label="Minimum Surface Load" value={`${trough} lbs`} size="1.25rem"
                colour={trough < FLOAT_FLOOR_LBS ? 'var(--danger)' : 'var(--warn)'}
              />
              <Metric label="Stroke Length & SPM" value={`${stroke_length_m}m @ ${spm} SPM`} />
              <Metric label="Fluid Viscosity" value={`${viscosity_cp} cP`} colour="var(--warn)" />
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <HelpCircle size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>Physical card diagnostics</span>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 500, lineHeight: 1.5, color: 'var(--text-muted)' }}>
              {floating ? (
                <>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--danger)' }}>
                    Warning: Rod Floating & Impact Pounding Signature Detected
                  </p>
                  <p style={{ margin: 0 }}>
                    The downstroke load has collapsed towards zero because upward Couette viscous shear force exceeds the downward rod weight.
                    Slack bridle cables will violently re-engage at the turnaround, propagating destructive tensile shock waves down the steel string.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--good)' }}>Normal Harmonic Operation</p>
                  <p style={{ margin: 0 }}>
                    Smooth load build-up on upstroke (traveling valve closure) and regular load release on downstroke.
                    Net downstroke accelerating force is well above the minimum rod float threshold.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
