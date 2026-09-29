// ISA-101 style analog indicator: value against its normal / warning / alarm bands.
// `invert` for metrics where low is bad (e.g. pump fillage).
export function RangeBar({ value, max, warn, danger, invert = false }: {
  value: number; max: number; warn: number; danger: number; invert?: boolean;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const bad = invert ? value <= danger : value >= danger;
  const caution = invert ? value <= warn : value >= warn;
  const tone = bad ? 'var(--danger)' : caution ? 'var(--warn)' : 'var(--text)';
  const [lo, hi] = invert ? [0, warn] : [warn, max];
  return (
    <div className="range-bar" aria-hidden>
      {invert
        ? <><span style={{ left: 0, width: pct(danger), background: 'var(--danger-soft)' }} /><span style={{ left: pct(danger), width: `calc(${pct(warn)} - ${pct(danger)})`, background: 'var(--warn-soft)' }} /></>
        : <><span style={{ left: pct(lo), width: `calc(${pct(danger)} - ${pct(lo)})`, background: 'var(--warn-soft)' }} /><span style={{ left: pct(danger), width: `calc(${pct(hi)} - ${pct(danger)})`, background: 'var(--danger-soft)' }} /></>}
      <i style={{ left: pct(value), background: tone }} />
    </div>
  );
}
