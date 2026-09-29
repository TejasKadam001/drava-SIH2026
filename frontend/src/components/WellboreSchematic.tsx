import React, { useEffect, useState } from 'react';

interface ProfileSegment {
  depth_m: number;
  temperature_c: number;
  viscosity_cp: number;
}

interface WellboreSchematicProps {
  spm: number;
  oilRateBpd: number;
  reservoirTempC: number;
  isFloating: boolean;
  profile: ProfileSegment[];
}

// Geometry: 0 m sits just below the surface line, 1000 m near the bottom of the canvas.
const W = 640;
const H = 560;
const GROUND_Y = 112;
const WELL_X = 300;
const depthY = (d: number) => 132 + d * 0.39;
const PUMP_Y = depthY(900);
const RES_TOP_Y = depthY(930);

// Temperature -> glow intensity of the copper accent, 30°C cold to 200°C hot.
const heat = (t: number) => Math.min(0.85, Math.max(0.06, (t - 30) / 170));

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export const WellboreSchematic: React.FC<WellboreSchematicProps> = ({
  spm, oilRateBpd, reservoirTempC, isFloating, profile
}) => {
  const reduced = usePrefersReducedMotion();
  const animate = !reduced;

  const strokePeriod = `${(60 / Math.max(spm, 0.5)).toFixed(2)}s`;
  // Higher production -> oil climbs the tubing faster. Floating rods lift poorly.
  const flowSeconds = Math.min(14, Math.max(3, 900 / Math.max(oilRateBpd, 1))) * (isFloating ? 1.8 : 1);
  const particleCount = isFloating ? 4 : 8;

  const plumeScale = Math.min(1, Math.max(0.12, (reservoirTempC - 47) / 150));
  const plumeRx = 40 + 190 * plumeScale;
  const plumeRy = 14 + 14 * plumeScale;

  const rodColor = isFloating ? 'var(--danger)' : 'var(--text-muted)';
  const casingBottom = depthY(955);

  // Rod travel: smooth sine-like stroke when healthy. When floating, the rod
  // hangs on the downstroke (can't sink through thick fluid) and then drops hard.
  const rodValues = isFloating ? '0 8; 0 -8; 0 -3; 0 8' : '0 8; 0 -8; 0 8';
  const rodKeyTimes = isFloating ? '0;0.5;0.88;1' : '0;0.5;1';
  const rodSplines = isFloating
    ? '0.45 0 0.55 1; 0.2 0 0.8 1; 0.9 0 1 1'
    : '0.45 0 0.55 1; 0.45 0 0.55 1';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Wellbore schematic: pump at 900 m running ${spm} strokes per minute, reservoir at ${reservoirTempC} degrees C${isFloating ? ', rod floating detected' : ''}`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="wbTemp" gradientUnits="userSpaceOnUse" x1="0" y1={depthY(0)} x2="0" y2={casingBottom}>
          {profile.map((seg) => (
            <stop
              key={seg.depth_m}
              offset={Math.min(1, seg.depth_m / 955)}
              stopColor="var(--accent)"
              stopOpacity={heat(seg.temperature_c)}
            />
          ))}
        </linearGradient>
        <radialGradient id="wbPlume">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.15 + 0.55 * plumeScale} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </radialGradient>
        <pattern id="wbSand" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.8" fill="var(--text-faint)" opacity="0.5" />
          <circle cx="6.5" cy="6" r="0.6" fill="var(--text-faint)" opacity="0.35" />
        </pattern>
      </defs>

      {/* Faint alternating strata so the column reads as rock, not empty space */}
      {[[0, 300], [600, 930]].map(([a, b]) => (
        <rect key={a} x={64} y={depthY(a)} width={W - 80} height={depthY(b) - depthY(a)} fill="var(--surface-raised)" opacity="0.35" />
      ))}

      {/* Depth grid + axis */}
      {[0, 200, 400, 600, 800, 1000].map((d) => (
        <g key={d}>
          <line x1={64} x2={W - 16} y1={depthY(d)} y2={depthY(d)} stroke="var(--line)" strokeDasharray="2 6" />
          <text x={52} y={depthY(d) + 3.5} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-faint)">
            {d} m
          </text>
        </g>
      ))}

      {/* Reservoir: Jodhpur sandstone */}
      <rect x={64} y={RES_TOP_Y} width={W - 80} height={H - RES_TOP_Y - 8} fill="url(#wbSand)" />
      <line x1={64} x2={W - 16} y1={RES_TOP_Y} y2={RES_TOP_Y} stroke="var(--line-strong)" />
      <ellipse cx={WELL_X} cy={depthY(958)} rx={plumeRx} ry={plumeRy} fill="url(#wbPlume)"
        style={{ transition: 'rx 0.5s ease, ry 0.5s ease' }}>
        {animate && <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />}
      </ellipse>
      <text x={W - 24} y={H - 16} textAnchor="end" fontSize="10.5" fill="var(--text-muted)">Jodhpur sandstone reservoir</text>
      <text x={W - 24} y={H - 30} textAnchor="end" fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--accent)">{reservoirTempC}°C</text>

      {/* Ground */}
      <line x1={64} x2={W - 16} y1={GROUND_Y} y2={GROUND_Y} stroke="var(--line-strong)" strokeWidth="1.5" />

      {/* Pump jack: base, samson post, gearbox, rotating crank, rocking beam */}
      <rect x={316} y={GROUND_Y - 4} width={160} height={4} fill="var(--line-strong)" />
      <path d={`M 340 ${GROUND_Y - 4} L 362 46 L 384 ${GROUND_Y - 4}`} fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x={428} y={GROUND_Y - 30} width={26} height={26} rx="2" fill="var(--surface-raised)" stroke="var(--line-strong)" />
      <g>
        <line x1={441} y1={GROUND_Y - 17} x2={462} y2={GROUND_Y - 17} stroke="var(--text-faint)" strokeWidth="3" strokeLinecap="round" />
        <circle cx={462} cy={GROUND_Y - 17} r={9} fill="var(--surface-raised)" stroke="var(--text-faint)" strokeWidth="1.5" />
        {animate && (
          <animateTransform attributeName="transform" type="rotate"
            from={`0 441 ${GROUND_Y - 17}`} to={`360 441 ${GROUND_Y - 17}`}
            dur={strokePeriod} repeatCount="indefinite" />
        )}
      </g>
      <g>
        <line x1={310} y1={46} x2={446} y2={46} stroke="var(--text)" strokeWidth="4" strokeLinecap="round" />
        <path d="M 312 33 Q 292 46 312 59 L 318 59 L 318 33 Z" fill="var(--text)" />
        <circle cx={362} cy={46} r={3.5} fill="var(--bg)" stroke="var(--text)" strokeWidth="1.5" />
        {animate && (
          <animateTransform attributeName="transform" type="rotate"
            values="-7 362 46; 7 362 46; -7 362 46" keyTimes="0;0.5;1"
            calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
            dur={strokePeriod} repeatCount="indefinite" />
        )}
      </g>
      <text x={486} y={42} fontSize="12" fontFamily="var(--font-mono)" fill="var(--text)">{spm} SPM</text>
      <text x={486} y={57} fontSize="10" fill="var(--text-faint)">beam pump</text>

      {/* Casing, glowing by the real temperature profile */}
      <rect x={WELL_X - 18} y={depthY(0)} width={36} height={casingBottom - depthY(0)} fill="url(#wbTemp)" stroke="var(--line-strong)" />
      {/* Tubing */}
      <rect x={WELL_X - 9} y={depthY(0)} width={18} height={PUMP_Y - depthY(0) + 6} fill="var(--bg)" fillOpacity="0.72" stroke="var(--line)" strokeWidth="0.5" />
      {/* Perforations into the reservoir */}
      {[935, 942, 949].map((d) => (
        <g key={d} stroke="var(--accent)" strokeOpacity="0.7">
          <line x1={WELL_X - 27} x2={WELL_X - 18} y1={depthY(d)} y2={depthY(d)} />
          <line x1={WELL_X + 18} x2={WELL_X + 27} y1={depthY(d)} y2={depthY(d)} />
        </g>
      ))}
      {/* Wellhead */}
      <rect x={WELL_X - 12} y={GROUND_Y - 9} width={24} height={11} rx="1.5" fill="var(--surface-raised)" stroke="var(--line-strong)" />

      {/* Oil rising up the tubing */}
      {animate && Array.from({ length: particleCount }).map((_, i) => (
        <circle key={i} cx={WELL_X + (i % 2 === 0 ? -2 : 2)} r={1.8} fill="var(--accent)">
          <animate attributeName="cy" from={PUMP_Y - 4} to={depthY(0) + 4}
            dur={`${flowSeconds.toFixed(2)}s`} begin={`-${((i * flowSeconds) / particleCount).toFixed(2)}s`}
            repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.1;0.85;1"
            dur={`${flowSeconds.toFixed(2)}s`} begin={`-${((i * flowSeconds) / particleCount).toFixed(2)}s`}
            repeatCount="indefinite" />
        </circle>
      ))}

      {/* Pump barrel */}
      <rect x={WELL_X - 9} y={PUMP_Y - 8} width={18} height={24} rx="2" fill="var(--surface-raised)" stroke="var(--text-muted)" />
      <text x={WELL_X - 26} y={PUMP_Y + 7} textAnchor="end" fontSize="10.5" fill="var(--text-muted)">Pump</text>

      {/* Rod string + bridle + plunger, moving together */}
      <g>
        <line x1={WELL_X - 4} y1={52} x2={WELL_X - 4} y2={GROUND_Y - 9} stroke="var(--text-faint)" strokeWidth="1" />
        <line x1={WELL_X + 4} y1={52} x2={WELL_X + 4} y2={GROUND_Y - 9} stroke="var(--text-faint)" strokeWidth="1" />
        <rect x={WELL_X - 1.3} y={GROUND_Y - 22} width={2.6} height={PUMP_Y - GROUND_Y + 22} fill={rodColor} style={{ transition: 'fill 0.3s ease' }} />
        <rect x={WELL_X - 6} y={PUMP_Y - 2} width={12} height={9} rx="1" fill={rodColor} />
        {animate && (
          <animateTransform attributeName="transform" type="translate"
            values={rodValues} keyTimes={rodKeyTimes} calcMode="spline" keySplines={rodSplines}
            dur={strokePeriod} repeatCount="indefinite" />
        )}
      </g>

      {/* Impact shock at the pump when the floating rod slams back down */}
      {isFloating && animate && (
        <circle cx={WELL_X} cy={PUMP_Y + 2} r={4} fill="none" stroke="var(--danger)" strokeWidth="1.5">
          <animate attributeName="r" values="4;4;26" keyTimes="0;0.88;1" dur={strokePeriod} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.9" keyTimes="0;0.88;1" dur={strokePeriod} repeatCount="indefinite" />
        </circle>
      )}

      {/* Per-depth readouts, placed at their real depth */}
      {profile.map((seg) => {
        const y = depthY(seg.depth_m);
        return (
          <g key={seg.depth_m}>
            <circle cx={WELL_X + 18} cy={y} r={2.2} fill="var(--accent)" fillOpacity={0.3 + heat(seg.temperature_c)} />
            <line x1={WELL_X + 22} x2={402} y1={y} y2={y} stroke="var(--line-strong)" strokeDasharray="2 3" />
            <text x={410} y={y + 4} fontSize="11.5" fontFamily="var(--font-mono)">
              <tspan fill="var(--text-faint)">{String(seg.depth_m).padStart(3, ' ')} m  </tspan>
              <tspan fill="var(--text)">{seg.temperature_c}°C</tspan>
              <tspan fill="var(--text-faint)"> · </tspan>
              <tspan fill={seg.viscosity_cp > 2200 ? 'var(--danger)' : 'var(--text-muted)'}>{seg.viscosity_cp} cP</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
};
