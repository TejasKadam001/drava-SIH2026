import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Bot, Layers, Activity, GitBranch,
  Sparkles, Play, Search, PanelLeft, Waypoints, ChevronsUpDown, Circle
} from 'lucide-react';
import { WellId } from '../types/petro';

interface NavbarProps {
  selectedWell: WellId;
  onSelectWell: (id: WellId) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenJuryDemo: () => void;
  onOpenCopilot: () => void;
}

const GROUPS = [
  [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'autopilot', label: 'Autopilot', icon: Bot },
    { id: 'digital-twin', label: 'Digital twin', icon: Layers },
    { id: 'decisions', label: 'Decisions', icon: GitBranch },
    { id: 'live', label: 'Live operations', icon: Activity }
  ]
];

const WELLS: { id: WellId; tone: 'good' | 'warn' | 'danger' }[] = [
  { id: 'BW-DEMO-001', tone: 'good' },
  { id: 'BW-DEMO-002', tone: 'good' },
  { id: 'BW-DEMO-003', tone: 'danger' }
];

export const SIDEBAR_WIDTH = 272;

const Divider = () => <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />;

export const Navbar: React.FC<NavbarProps> = ({
  selectedWell,
  onSelectWell,
  activeTab,
  onSelectTab,
  onOpenJuryDemo,
  onOpenCopilot
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCollapsed(false);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const groups = GROUPS.map((g) => g.filter((t) => t.label.toLowerCase().includes(q))).filter((g) => g.length);

  const link = (key: string, label: string, Icon: React.ElementType, active: boolean, onClick: () => void, trailing?: React.ReactNode) => (
    <button key={key} onClick={onClick} className="sidebar-link" data-active={active}
      aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined}
      style={collapsed ? { justifyContent: 'center' } : undefined}>
      <Icon size={17} strokeWidth={1.6} />
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && trailing}
    </button>
  );

  return (
    <aside style={{
      width: collapsed ? 64 : SIDEBAR_WIDTH,
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--sidebar)',
      borderRight: '1px solid var(--line)',
      transition: 'width 0.18s ease'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: '16px 14px 12px' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
            <Waypoints size={19} strokeWidth={2} />
            Drava
          </div>
        )}
        <button className="icon-btn" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
          <PanelLeft size={16} strokeWidth={1.6} />
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div style={{ padding: '0 10px 10px' }}>
          <label className="sidebar-search">
            <Search size={15} strokeWidth={1.6} />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />
            <kbd>Ctrl K</kbd>
          </label>
        </div>
      )}

      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
        {groups.map((g, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Divider />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {g.map(({ id, label, icon }) => link(id, label, icon, activeTab === id, () => onSelectTab(id)))}
            </div>
          </React.Fragment>
        ))}

        <Divider />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {link('tour', 'System tour', Play, false, onOpenJuryDemo)}
          {link('copilot', 'Copilot', Sparkles, false, onOpenCopilot)}
        </div>

        <Divider />
        {!collapsed && <div className="sidebar-section">Wells</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {WELLS.map(({ id, tone }) =>
            link(id, id, Circle, selectedWell === id, () => onSelectWell(id),
              <span className="well-dot" style={{ background: `var(--${tone})` }} />)
          )}
        </div>
      </nav>

      {/* Usage card */}
      {!collapsed && (
        <div style={{ padding: '10px' }}>
          <div className="sidebar-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <span>Wells at risk</span>
              <span className="mono-num" style={{ fontSize: '0.74rem' }}>1 / 3</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--line-strong)', marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: '33%', height: '100%', background: 'var(--danger)' }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 8 }}>Simulation mode · live sync</div>
          </div>
        </div>
      )}

      {/* User row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderTop: '1px solid var(--line)', justifyContent: collapsed ? 'center' : undefined }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-raised)', border: '1px solid var(--line-strong)', display: 'grid', placeItems: 'center', fontSize: '0.78rem', fontWeight: 600 }}>
          M
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)' }}>MACH 2</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Oil India · Baghewala</div>
            </div>
            <ChevronsUpDown size={15} color="var(--text-faint)" />
          </>
        )}
      </div>
    </aside>
  );
};
