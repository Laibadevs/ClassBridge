import { HeartIcon, TargetIcon, CheckCircleIcon, ArrowUpRightIcon } from '@/components/icons';
import { aliProfile, sampleAIUpdate } from '@/lib/landing-content';
import Reveal from './Reveal';

function barColor(score: number) {
  return score < 65 ? 'bg-brand-blue' : 'bg-brand-green';
}

export default function ParentSection() {
  const { subjects } = aliProfile;

  return (
    <section id="for-parents" className="scroll-mt-20 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 px-4 py-2 text-sm font-semibold text-brand-blue">
              👋 Small steps. Better progress.
            </span>
            <h2 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Finally, understand how your child is doing.
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
              No confusing academic jargon. Just clear, supportive updates in Simple English and
              Friendly Roman Urdu.
            </p>
          </Reveal>

          <Reveal delayMs={150} className="flex justify-center lg:justify-end">
            <div className="w-[300px] rounded-[2.75rem] border-[6px] border-ink bg-ink p-1.5 shadow-cardHover">
              <div className="relative overflow-hidden rounded-[2.25rem] bg-white">
                {/* dynamic island */}
                <div className="absolute left-1/2 top-2.5 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" aria-hidden />

                <div className="space-y-3 px-4 pb-5 pt-10">
                  <div>
                    <p className="text-xl font-bold text-ink">Ali Khan</p>
                    <p className="text-xs text-ink-muted">Grade 8</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-brand-greenDark">
                      Overall Progress: Good <ArrowUpRightIcon className="h-3 w-3" />
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <CheckCircleIcon className="h-5 w-5 text-brand-green" />
                      <span className="text-[10px] leading-tight text-ink-muted">
                        Attendance<br />
                        <span className="text-xs font-bold text-ink">87%</span>
                      </span>
                    </span>
                  </div>

                  <div className="space-y-2.5 rounded-2xl border border-slate-100 p-3 shadow-card">
                    {subjects.map((s) => (
                      <div key={s.subject}>
                        <p className="text-[11px] font-medium text-ink">
                          {s.subject} — {s.score}%
                        </p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${barColor(s.score)}`} style={{ width: `${s.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-100 p-3 shadow-card">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink">
                      <HeartIcon className="h-4 w-4 text-red-500" /> An update from your child&apos;s teacher
                    </p>
                    <p className="text-[10px] font-semibold text-ink-muted">Simple English</p>
                    <p className="mb-2 text-[11px] leading-snug text-ink">{sampleAIUpdate.englishSummary}</p>
                    <p className="text-[10px] font-semibold text-ink-muted">Roman Urdu</p>
                    <p className="text-[11px] leading-snug text-ink">{sampleAIUpdate.romanUrduSummary}</p>
                  </div>

                  <div className="flex items-start gap-2 rounded-2xl border border-brand-green/25 bg-emerald-50 p-3">
                    <TargetIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-greenDark" />
                    <div>
                      <p className="text-[11px] font-bold text-ink">This week&apos;s focus</p>
                      <p className="text-[11px] leading-snug text-ink">{sampleAIUpdate.parentAction}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
