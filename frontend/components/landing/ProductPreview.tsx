import { SparklesIcon, CheckCircleIcon, GlobeIcon } from '@/components/icons';
import { aliProfile, heroMetrics, sampleAIUpdate } from '@/lib/landing-content';

const toneBar: Record<string, string> = {
  blue: 'bg-gradient-to-r from-blue-400 to-brand-blue',
  green: 'bg-gradient-to-r from-emerald-400 to-brand-green',
};

export default function ProductPreview() {
  const { student } = aliProfile;

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* soft brand glow behind the card */}
      <div className="pointer-events-none absolute -inset-12" aria-hidden>
        <div className="absolute left-1/4 top-0 h-60 w-60 rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-60 w-60 rounded-full bg-brand-green/20 blur-3xl" />
      </div>

      {/* gradient-border card */}
      <div className="animate-floatY relative rounded-[1.75rem] bg-gradient-to-br from-blue-200/80 via-white/70 to-emerald-200/80 p-[1.5px] shadow-premium">
        <div className="rounded-[1.7rem] bg-white/95 p-5 backdrop-blur-sm sm:p-6">
          {/* Student header */}
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-green text-sm font-bold text-white shadow-glowBlue">
              {student.avatarInitials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{student.name}</p>
              <p className="text-xs text-ink-muted">Grade 8 · Section Blue</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-brand-greenDark ring-1 ring-brand-green/20">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Live
            </span>
          </div>

          {/* Metric chips */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {heroMetrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 transition-colors hover:bg-white"
              >
                <p className="text-[11px] font-medium text-ink-muted">{m.label}</p>
                <p className="mt-0.5 text-sm font-bold tracking-tight text-ink">{m.value}%</p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
                  <div className={`h-full rounded-full ${toneBar[m.tone]}`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* AI Parent Update */}
          <div className="mt-4 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-blueDark text-white shadow-glowBlue">
                <SparklesIcon className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold text-ink">AI Parent Update</p>
              <span className="ml-auto rounded-full bg-gradient-to-r from-brand-blue to-brand-green px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                AI
              </span>
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue">Simple English</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink">{sampleAIUpdate.englishSummary}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-greenDark">Roman Urdu</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink">{sampleAIUpdate.romanUrduSummary}</p>
              </div>
            </div>
          </div>

          {/* This week's focus */}
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-brand-green/25 bg-gradient-to-br from-emerald-50 to-emerald-50/40 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-brand-green shadow-card">
              <CheckCircleIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">This week&apos;s focus</p>
              <p className="ml-2 text-sm text-ink-muted">{sampleAIUpdate.parentAction}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Left connector: teacher data — rendered after the card so it paints
          on top where the two overlap, instead of being hidden behind it */}
      <div className="pointer-events-none absolute -left-16 top-24 hidden 2xl:block" aria-hidden>
        <div className="flex flex-col items-center">
          <span className="mb-2 text-xs font-medium leading-tight text-ink-muted">
            Teacher<br />data
          </span>
          <svg width="70" height="120" viewBox="0 0 70 120" fill="none" className="text-brand-blue/50">
            <path
              d="M64 6H20a8 8 0 0 0-8 8v34a8 8 0 0 0 8 8h44"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path d="M60 50l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Right connector: AI understanding -> parent action */}
      <div
        className="pointer-events-none absolute -right-10 top-28 hidden w-24 2xl:flex 2xl:flex-col 2xl:items-center"
        aria-hidden
      >
        <svg width="40" height="70" viewBox="0 0 40 70" fill="none" className="text-brand-blue/50">
          <path d="M6 6h18a8 8 0 0 1 8 8v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-blueDark text-white shadow-glowBlue">
          <SparklesIcon className="h-5 w-5" />
        </span>
        <span className="my-1 text-center text-xs font-medium leading-tight text-ink-muted">
          AI<br />understanding
        </span>
        <svg width="20" height="70" viewBox="0 0 20 70" fill="none" className="text-brand-blue/50">
          <path d="M10 2v58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 54l6 8 6-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-center text-xs font-medium leading-tight text-ink-muted">
          Parent<br />action
        </span>
      </div>

      {/* floating badges for depth — a clear gap from the card edge on both
          so they read as floating above/below it, not glued to the corner */}
      <div
        className="animate-floatY absolute -right-3 -top-6 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-greenDark shadow-elevated ring-1 ring-brand-green/20 sm:-right-6"
        style={{ animationDelay: '0.8s' }}
      >
        <CheckCircleIcon className="h-3.5 w-3.5 text-brand-green" /> Update sent
      </div>
      <div
        className="animate-floatY absolute -top-6 -left-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-blueDark shadow-elevated ring-1 ring-brand-blue/20 sm:-left-6"
        style={{ animationDelay: '1.6s' }}
      >
        <GlobeIcon className="h-3.5 w-3.5 text-brand-blue" /> 2 languages
      </div>
    </div>
  );
}
