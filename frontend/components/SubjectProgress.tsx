import type { SubjectScore } from '@/lib/types';

function barColor(score: number) {
  if (score < 65) return 'bg-amber-500';
  if (score < 80) return 'bg-brand-blue';
  return 'bg-brand-green';
}

export default function SubjectProgress({ subject, score, previousScore }: SubjectScore) {
  const delta = previousScore !== undefined ? score - previousScore : undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{subject}</span>
        <span className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-ink">{score}%</span>
          {typeof delta === 'number' && delta !== 0 && (
            <span
              className={`text-xs font-medium ${
                delta > 0 ? 'text-brand-greenDark' : 'text-ink-muted'
              }`}
            >
              {delta > 0 ? `↑ ${delta}` : `↓ ${Math.abs(delta)}`}
            </span>
          )}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barColor(score)} transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
        />
      </div>
    </div>
  );
}
