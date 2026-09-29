import React from 'react';

export function SubTabs({ tabs, active, onChange, title, subtitle }: {
  tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void; title: string; subtitle: string;
}) {
  return (
    <div style={{ padding: '28px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{title}</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</p>
      </div>
      <div className="segmented" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={active === t.id} data-active={active === t.id} onClick={() => onChange(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
