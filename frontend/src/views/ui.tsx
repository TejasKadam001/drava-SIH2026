import React from 'react';

/** Small presentational pieces shared by the optimiser screens. */

interface LabelledSliderProps {
  label: string;
  readout: React.ReactNode;
  readoutColour?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  integer?: boolean;
}

export const LabelledSlider: React.FC<LabelledSliderProps> = ({
  label, readout, readoutColour = 'var(--accent)', min, max, step, value, onChange, integer,
}) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem' }}>
      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: readoutColour }}>{readout}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(integer ? parseInt(e.target.value) : parseFloat(e.target.value))}
    />
  </div>
);

interface StatTileProps {
  title: string;
  value: React.ReactNode;
  valueColour?: string;
  caption?: React.ReactNode;
  captionColour?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  title, value, valueColour = 'var(--text)', caption, captionColour = 'var(--text-muted)',
}) => (
  <div style={{ padding: 12, borderRadius: 4, background: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>{title}</div>
    <div style={{ fontSize: '1.4rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: valueColour }}>{value}</div>
    {caption && <div style={{ fontSize: '0.68rem', fontWeight: 600, color: captionColour }}>{caption}</div>}
  </div>
);

export const PageHeader: React.FC<{
  icon: React.ReactNode; title: string; subtitle: string; badge?: React.ReactNode;
}> = ({ icon, title, subtitle, badge }) => (
  <div
    className="glass-panel"
    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px' }}
  >
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
        {icon}
        <span>{title}</span>
      </div>
      <div style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-muted)' }}>{subtitle}</div>
    </div>
    {badge}
  </div>
);
