import {
  UsersIcon,
  CheckCircleIcon,
  ThumbsUpIcon,
  AlertIcon,
  SparklesIcon,
  EditIcon,
  TargetIcon,
  ArrowUpRightIcon,
} from '@/components/icons';
import { aliProfile, sampleAIUpdate, teacherDashboardStats } from '@/lib/landing-content';
import Reveal from './Reveal';

const iconMap = {
  users: UsersIcon,
  check: CheckCircleIcon,
  thumbs: ThumbsUpIcon,
  alert: AlertIcon,
};

const toneTile: Record<string, { icon: string; bar: string }> = {
  blue: { icon: 'bg-blue-100 text-brand-blue', bar: 'bg-brand-blue' },
  green: { icon: 'bg-emerald-100 text-brand-green', bar: 'bg-brand-green' },
};

export default function TeacherSection() {
  const { student } = aliProfile;

  return (
    <section id="for-teachers" className="scroll-mt-20 bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <h2 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              Give teachers their time back.
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
              Record the important details once. ClassBridge AI turns them into meaningful parent
              communication automatically.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-brand-greenDark">
                <ArrowUpRightIcon className="h-4 w-4" />
              </span>
              <span className="text-[15px] font-medium text-ink">
                Save hours of repetitive communication.
              </span>
            </div>
          </Reveal>

          <Reveal delayMs={150}>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-cardHover sm:p-6">
              {/* Stat tiles */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {teacherDashboardStats.map((s) => {
                  const Icon = iconMap[s.icon];
                  const tone = toneTile[s.tone];
                  return (
                    <div key={s.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="p-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.icon}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="mt-2 text-2xl font-extrabold text-ink">{s.value}</p>
                        <p className="text-[11px] leading-tight text-ink-muted">{s.label}</p>
                      </div>
                      <div className="h-1 w-full bg-slate-100">
                        <div className={`h-full ${tone.bar} ${s.bar}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Student + note */}
              <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-2xl font-bold text-ink">{student.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink">
                      Math — 58%
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-brand-blueDark">
                      Attendance — 87%
                    </span>
                  </div>
                </div>
                <div className="sm:border-l sm:border-slate-200 sm:pl-4">
                  <p className="text-xs text-ink-muted">Teacher note</p>
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                    <EditIcon className="h-4 w-4 shrink-0 text-ink-muted" />
                    <span className="text-sm text-ink">Needs additional Algebra practice</span>
                  </div>
                </div>
              </div>

              {/* Generate */}
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-3.5 text-base font-semibold text-white shadow-card transition-colors hover:bg-brand-blueDark focus-ring"
              >
                <SparklesIcon className="h-5 w-5" /> Generate Parent Update
              </button>

              {/* Outputs */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-3.5">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                    Simple English
                  </span>
                  <p className="mt-2 text-[13px] leading-snug text-ink">{sampleAIUpdate.englishSummary}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3.5">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                    Friendly Roman Urdu
                  </span>
                  <p className="mt-2 text-[13px] leading-snug text-ink">{sampleAIUpdate.romanUrduSummary}</p>
                </div>
                <div className="rounded-2xl border border-brand-green/30 bg-emerald-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-semibold text-white">
                      Parent Action
                    </span>
                    <TargetIcon className="h-4 w-4 text-brand-greenDark" />
                  </div>
                  <p className="mt-2 text-[13px] leading-snug text-ink">{sampleAIUpdate.parentAction}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
