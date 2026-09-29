import React from 'react';
import {
  Thermometer, Droplets, Flame, Activity, Zap, AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TelemetryFrame } from '../types/petro';

interface DashboardProps {
  telemetry: TelemetryFrame | null;
  history: any[];
  onNavigateTab: (tab: string) => void;
}

const AXIS_STYLE = { fontSize: 11, fill: 'var(--text-faint)' };

function StatCell({
  icon, label, value, unit, meta, tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  meta: string;
  tone?: 'good' | 'warn' | 'danger';
}) {
  const valueColor = tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : 'var(--text)';
  return (
    <div style={{ padding: '18px 20px', flex: '1 1 220px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-faint)', marginBottom: '10px' }}>
        {icon}
        <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span className="mono-num" style={{ fontSize: '1.7rem', color: valueColor }}>{value}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{unit}</span>
      </div>
      <div style={{ marginTop: '5px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>{meta}</div>
    </div>
  );
}

function StatusRow({
  label, headline, meta, statusText, tone
}: {
  label: string;
  headline: string;
  meta: string;
  statusText: string;
  tone: 'good' | 'warn' | 'danger' | 'neutral';
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 20px', gap: '16px'
    }}>
      <div style={{ minWidth: '160px' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {label}
        </div>
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>{headline}</div>
      </div>
      <div style={{ flex: 1, fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'right' }}>{meta}</div>
      <span className={`status-text ${tone}`}>{statusText}</span>
    </div>
  );
}

function ChartCard({
  title, subtitle, legend, children
}: {
  title: string;
  subtitle: string;
  legend: { label: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="panel" style={{ padding: '20px', flex: '1 1 460px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: '14px' }}>
          {legend.map((l) => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: '250px' }}>{children}</div>
    </div>
  );
}

export const OverviewDashboard: React.FC<DashboardProps> = ({ telemetry, history, onNavigateTab }) => {
  if (!telemetry) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading telemetry stream...</div>;
  }

  const { thermal_state, fluid_state, production_state, srp_operating_state, cycle_info, pressure_state } = telemetry;
  const isRodFloating = srp_operating_state.rod_floating_detected;
  const viscosityHigh = fluid_state.estimated_viscosity_cp > 2000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '28px 24px' }}>

      {isRodFloating && (
        <div style={{
          background: 'var(--danger-soft)',
          borderLeft: '3px solid var(--danger)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--danger)' }}>
                Rod floating detected
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Viscosity ({fluid_state.estimated_viscosity_cp} cP) drag exceeds sinking capacity at {srp_operating_state.spm} SPM.
              </div>
            </div>
          </div>
          <button onClick={() => onNavigateTab('srp-optimizer')} className="btn btn-primary">
            Resolve in SRP Optimizer
          </button>
        </div>
      )}

      {/* Primary readouts, hairline-divided, no boxed card grid */}
      <div className="panel" style={{ display: 'flex', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', flex: '1 1 100%' }}>
          {[
            <StatCell
              key="prod"
              icon={<Droplets size={15} />}
              label="Oil production"
              value={production_state.oil_rate_bpd}
              unit="bbl/day"
              meta={`Water ${production_state.water_rate_bpd} bpd · Cum ${production_state.cumulative_oil_bbl} bbl`}
            />,
            <StatCell
              key="temp"
              icon={<Thermometer size={15} />}
              label="Reservoir temp"
              value={thermal_state.reservoir_temperature_c}
              unit="°C"
              meta={`Cooling from ${thermal_state.peak_cycle_temperature_c}°C peak, day ${cycle_info.days_in_production}`}
            />,
            <StatCell
              key="visc"
              icon={<Flame size={15} />}
              label="Viscosity"
              value={fluid_state.estimated_viscosity_cp}
              unit="cP"
              tone={viscosityHigh ? 'danger' : undefined}
              meta={`Mobility ${fluid_state.darcy_mobility_md_cp} mD/cP`}
            />,
            <StatCell
              key="pprl"
              icon={<Activity size={15} />}
              label="Peak rod load"
              value={srp_operating_state.pprl_lbs}
              unit="lbs"
              meta={`MPRL ${srp_operating_state.mprl_lbs} lbs · rated 22,000 lbs`}
            />,
            <StatCell
              key="sor"
              icon={<Zap size={15} />}
              label="Steam-oil ratio"
              value={cycle_info.sor_cumulative}
              unit="m3/m3"
              meta={`${srp_operating_state.kwh_per_barrel} kWh/bbl`}
            />
          ].map((cell, i) => (
            <div key={i} style={{
              flex: '1 1 220px',
              borderLeft: i > 0 ? '1px solid var(--line)' : 'none',
              borderTop: '1px solid var(--line)'
            }}>
              {cell}
            </div>
          ))}
        </div>
      </div>

      {/* System status, plain rows instead of colored-left-bar cards */}
      <div className="panel">
        <StatusRow
          label="Reservoir"
          headline="Formation stable"
          meta={`Pressure ${pressure_state.bottomhole_pressure_bar} bar, native 55`}
          statusText="94%"
          tone="good"
        />
        <div style={{ borderTop: '1px solid var(--line)' }} />
        <StatusRow
          label="Pump"
          headline="Volumetric efficiency"
          meta="Seated 900m, plunger 2.25 in"
          statusText={`${production_state.pump_volumetric_efficiency_pct}%`}
          tone="neutral"
        />
        <div style={{ borderTop: '1px solid var(--line)' }} />
        <StatusRow
          label="Rod string"
          headline={isRodFloating ? 'Floating / shock' : 'Goodman normal'}
          meta="API grade D steel, sinker bar OK"
          statusText={`Risk ${Math.round(srp_operating_state.rod_floating_risk * 100)}%`}
          tone={isRodFloating ? 'danger' : 'warn'}
        />
        <div style={{ borderTop: '1px solid var(--line)' }} />
        <StatusRow
          label="Thermal cycle"
          headline="Cooling phase"
          meta={`Day ${cycle_info.days_in_production} of ~120`}
          statusText={`Cycle ${cycle_info.cycle_number}`}
          tone="neutral"
        />
        <div style={{ borderTop: '1px solid var(--line)' }} />
        <StatusRow
          label="Data quality"
          headline="Signal integrity"
          meta="Monotonic, range validated"
          statusText="Good"
          tone="good"
        />
      </div>

      {/* Charts */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <ChartCard
          title="90-day production and thermal dissipation"
          subtitle="CSS thermal cooling against heavy oil inflow decay"
          legend={[
            { label: 'Oil rate (bpd)', color: 'var(--text)' },
            { label: 'Temp (°C)', color: 'var(--accent)' }
          ]}
        >
          <ResponsiveContainer>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorOil" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--text)" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="var(--text)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--line-strong)" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="var(--line-strong)" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--line-strong)" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 6, fontSize: '0.78rem' }} />
              <Area yAxisId="left" type="monotone" dataKey="oil_rate_bpd" stroke="var(--text)" fill="url(#colorOil)" strokeWidth={1.5} name="Oil (bpd)" />
              <Area yAxisId="right" type="monotone" dataKey="reservoir_temperature_c" stroke="var(--accent)" fill="url(#colorTemp)" strokeWidth={1.5} name="Temp (°C)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Polished rod load vs. viscosity drag"
          subtitle="Downstroke MPRL drops as viscosity triggers rod floating"
          legend={[
            { label: 'PPRL', color: 'var(--text)' },
            { label: 'MPRL', color: 'var(--danger)' }
          ]}
        >
          <ResponsiveContainer>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorPPRL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--text)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="var(--text)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--line-strong)" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--line-strong)" tick={AXIS_STYLE} tickLine={false} axisLine={false} domain={[0, 20000]} width={44} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 6, fontSize: '0.78rem' }} />
              <Area type="monotone" dataKey="pprl_lbs" stroke="var(--text)" fill="url(#colorPPRL)" strokeWidth={1.5} name="PPRL (lbs)" />
              <Area type="monotone" dataKey="mprl_lbs" stroke="var(--danger)" fill="none" strokeWidth={1.5} name="MPRL (lbs)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};
