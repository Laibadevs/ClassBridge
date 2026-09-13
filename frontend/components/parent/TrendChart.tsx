import type { TrendPoint } from '@/lib/parent-progress-data';

const W = 660;
const H = 260;
const PAD_X = 18;
const PAD_TOP = 30;
const PAD_BOTTOM = 46;

/**
 * Hand-built line chart — the app ships no chart dependency and a parent-facing
 * trend does not need one. Geometry lives in the SVG while every label is real
 * HTML positioned by percentage, so text stays crisp and legible at any width.
 */
export default function TrendChart({
  points,
  activeMonths,
  summary,
}: {
  points: TrendPoint[];
  /** Trailing points to emphasise; everything before them fades back. */
  activeMonths: number;
  summary: string;
}) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Snap to decades so the gridlines land on round numbers.
  const lo = Math.max(0, Math.floor((min - 6) / 10) * 10);
  const hi = Math.ceil((max + 6) / 10) * 10;
  const span = Math.max(1, hi - lo);

  const step = points.length > 1 ? (W - PAD_X * 2) / (points.length - 1) : 0;
  const x = (i: number) => PAD_X + i * step;
  const y = (v: number) => PAD_TOP + (1 - (v - lo) / span) * (H - PAD_TOP - PAD_BOTTOM);
  const baseY = H - PAD_BOTTOM;

  const activeStart = Math.max(0, points.length - activeMonths);

  // Cubic with horizontal-ish handles: smooth without overshooting the data.
  const line = points
    .map((p, i) => {
      if (i === 0) return `M${x(0)},${y(p.value)}`;
      const prev = points[i - 1];
      const cx = step / 2;
      return `C${x(i - 1) + cx},${y(prev.value)} ${x(i) - cx},${y(p.value)} ${x(i)},${y(p.value)}`;
    })
    .join(' ');
  const area = `${line} L${x(points.length - 1)},${baseY} L${x(0)},${baseY} Z`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={summary}>
        <defs>
          <linearGradient id="cb-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[lo, (lo + hi) / 2, hi].map((v) => (
          <line
            key={v}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={y(v)}
            y2={y(v)}
            stroke="#E2E8F0"
            strokeWidth={1}
            strokeDasharray="4 6"
          />
        ))}

        <path d={area} fill="url(#cb-trend-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#2563EB"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <circle
            key={p.month}
            cx={x(i)}
            cy={y(p.value)}
            r={i === points.length - 1 ? 5.5 : 4}
            fill="#FFFFFF"
            stroke={i === points.length - 1 ? '#1E3A8A' : '#2563EB'}
            strokeWidth={i === points.length - 1 ? 3 : 2}
          />
        ))}

        {/* Fade the history that sits outside the selected range. */}
        {activeStart > 0 && (
          <rect
            x={0}
            y={0}
            width={x(activeStart) - step / 2}
            height={H}
            fill="#F8FAFC"
            opacity={0.72}
          />
        )}
      </svg>

      {/* Value + month labels as HTML, anchored to the same coordinates. */}
      <div className="pointer-events-none absolute inset-0">
        {points.map((p, i) => {
          const isActive = i >= activeStart;
          const isLast = i === points.length - 1;
          return (
            <span
              key={`v-${p.month}`}
              className={`absolute -translate-x-1/2 -translate-y-[2rem] whitespace-nowrap rounded-md bg-white/85 px-1 text-[11px] font-semibold tabular-nums backdrop-blur-sm transition-colors sm:-translate-y-[1.85rem] sm:text-xs ${
                isLast ? 'text-brand-blueDark' : isActive ? 'text-brand-blue' : 'text-ink-muted'
              }`}
              style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(p.value) / H) * 100}%` }}
            >
              {p.value}%
            </span>
          );
        })}

        {points.map((p, i) => (
          <span
            key={`m-${p.month}`}
            className={`absolute -translate-x-1/2 text-[11px] font-medium transition-colors sm:text-xs ${
              i >= activeStart ? 'text-ink' : 'text-ink-muted'
            }`}
            style={{ left: `${(x(i) / W) * 100}%`, top: `${(baseY / H) * 100}%` }}
          >
            {p.month}
          </span>
        ))}
      </div>
    </div>
  );
}
