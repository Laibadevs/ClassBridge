import {
  SparklesIcon,
  MessageIcon,
  CheckCircleIcon,
  ArrowUpRightIcon,
} from '@/components/icons';
import { sampleAIUpdate } from '@/lib/landing-content';
import Reveal from './Reveal';

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0 -rotate-90">
      <circle cx="12" cy="12" r={r} fill="none" stroke="#E2E8F0" strokeWidth="3" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (pct / 100) * c}
      />
    </svg>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-card">
      <span className="text-sm font-medium text-ink">{children}</span>
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-5 text-xl font-bold text-ink">{children}</h3>;
}

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            Less reporting. More understanding.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-muted">
            ClassBridge AI turns fragmented school data into clear, actionable insights for
            parents, fostering better connection without the noise.
          </p>
        </Reveal>

        {/* Top row: two wide cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
              <CardTitle>AI-Powered Updates</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-card">
                    <span className="text-sm font-medium text-ink">Attendance <span className="text-ink-muted">87%</span></span>
                    <Ring pct={87} color="#2563EB" />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-card">
                    <span className="text-sm font-medium text-ink">Math <span className="text-ink-muted">58%</span></span>
                    <Ring pct={58} color="#F97316" />
                  </div>
                  <Chip>
                    <span className="flex items-center gap-2">
                      <MessageIcon className="h-4 w-4 text-ink-muted" /> Teacher note
                    </span>
                  </Chip>
                </div>

                <svg width="56" height="120" viewBox="0 0 56 120" fill="none" className="shrink-0 text-brand-blue/40" aria-hidden>
                  <path d="M2 20C26 20 30 60 54 60M2 60h52M2 100C26 100 30 60 54 60" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M48 54l7 6-7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                <div className="w-[42%] shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-cardHover">
                  <SparklesIcon className="h-5 w-5 text-brand-blue" />
                  <p className="mt-2 text-[15px] font-semibold leading-snug text-ink">
                    Ali is doing well, but needs more Algebra practice.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={100}>
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
              <CardTitle>Simple English + Roman Urdu</CardTitle>
              <div className="flex items-stretch gap-4">
                <div className="flex-1">
                  <p className="mb-2 text-sm text-ink-muted">English</p>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[15px] leading-relaxed text-ink">{sampleAIUpdate.englishSummary}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-16 w-px bg-slate-200" />
                </div>
                <div className="flex-1">
                  <p className="mb-2 text-sm text-ink-muted">Roman Urdu</p>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[15px] leading-relaxed text-ink">
                      Ali ki performance theek hai, lekin Algebra mein thori extra practice chahiye.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bottom row: four cards */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal>
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <CardTitle>Early Support</CardTitle>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
                <p className="text-sm text-ink">Math</p>
                <p className="mt-1 text-3xl font-extrabold text-brand-blue">58%</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[58%] rounded-full bg-brand-blue" />
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Needs a little extra practice
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={80}>
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <CardTitle>Monthly Progress</CardTitle>
              <div className="relative">
                <svg viewBox="0 0 200 110" className="h-28 w-full" fill="none" aria-hidden>
                  <polyline points="0,90 40,70 80,78 120,50 160,55 200,20" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="0,98 40,88 80,60 120,66 160,34 200,10" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M186 16l14-6-4 14" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="absolute right-0 top-0 flex items-start gap-1 text-brand-green">
                  <ArrowUpRightIcon className="h-5 w-5" />
                  <div>
                    <p className="text-lg font-bold leading-none">+12%</p>
                    <p className="text-[11px]">Improvement</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-xs text-ink-muted">
                <span>Previous Month</span>
                <span className="font-medium text-ink">Current Month</span>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={160}>
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <CardTitle>Teacher-Friendly</CardTitle>
              <div className="space-y-2.5">
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink-muted">Attendance</span>
                  <span className="flex items-center rounded-lg border border-slate-200 px-2 py-1 text-xs text-ink-muted">
                    %
                  </span>
                </label>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink-muted">Grade</span>
                  <span className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-ink">Sample ▾</span>
                </label>
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-ink-muted">Quick note</span>
                  <span className="h-10 w-28 rounded-lg border border-slate-200 bg-white" />
                </div>
                <div className="flex justify-end pt-1">
                  <span className="rounded-full bg-brand-blue px-5 py-1.5 text-xs font-semibold text-white">Save</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={240}>
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <CardTitle>Parent-Friendly</CardTitle>
              <div className="relative mx-auto h-48 w-32 rounded-[1.6rem] border-[3px] border-ink/80 bg-slate-50 p-2">
                <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/70" aria-hidden />
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-card">
                  <p className="flex items-center gap-1 text-[11px] font-bold text-ink">
                    <SparklesIcon className="h-3 w-3 text-brand-blue" /> New update for Ali
                    <CheckCircleIcon className="ml-auto h-3.5 w-3.5 text-brand-green" />
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-ink-muted">
                    Ali&apos;s latest Math quiz shows improvement. Keep up the good work!
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
