import Link from 'next/link';
import type { AIUpdate, StudentProfile, SubjectScore } from '@/lib/types';
import {
  relativeDay,
  toSubjectStat,
  isImproving,
  needsSupport,
  buildRecentUpdates,
  type SubjectTone,
} from '@/lib/parent-dashboard-data';
import { overallProgressNow } from '@/lib/parent-progress-data';
import {
  BarChartIcon,
  CalendarCheckIcon,
  CheckIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  GlobeIcon,
  LightbulbIcon,
  MessageIcon,
  SparklesIcon,
  TrendingUpIcon,
  AlertIcon,
} from '@/components/icons';
import TextToSpeechButton from '@/components/parent/TextToSpeechButton';

interface ParentDashboardProps {
  profile: StudentProfile;
  update: AIUpdate | null;
  monthNote: string;
  teacherName: string;
}

const barTone: Record<SubjectTone, string> = {
  strong: 'bg-gradient-to-r from-emerald-400 to-brand-green',
  standard: 'bg-gradient-to-r from-blue-400 to-brand-blue',
  support: 'bg-gradient-to-r from-amber-200 to-amber-300',
};

const labelTone: Record<SubjectTone, string> = {
  strong: 'text-brand-greenDark',
  standard: 'text-brand-blue',
  support: 'text-amber-700',
};

const card = 'rounded-[20px] border border-slate-200 bg-white p-5 shadow-card sm:p-6';

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  hint: string;
  tone: 'blue' | 'green' | 'amber';
}) {
  const tile =
    tone === 'blue'
      ? 'bg-blue-50 text-brand-blue'
      : tone === 'green'
        ? 'bg-emerald-50 text-brand-greenDark'
        : 'bg-amber-50 text-amber-600';
  return (
    <div className={`${card} p-5`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile}`}>{icon}</span>
      <p className="mt-3.5 text-3xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{label}</p>
      <p className="text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

function ChildProfileCard({
  profile,
  statusLabel,
  lastUpdated,
}: {
  profile: StudentProfile;
  statusLabel: string;
  lastUpdated: string;
}) {
  const { student } = profile;
  const [grade, section] = student.className.split(' - ');
  return (
    <div className={`${card} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-brand-blue">
          {student.avatarInitials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-ink">{student.name}</h2>
          <p className="truncate text-sm text-ink-muted">
            {grade}
            {section ? ` · Class ${section}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-brand-greenDark">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
          {statusLabel}
        </span>
        <div className="border-l border-slate-200 pl-4 sm:pl-6">
          <p className="text-xs text-ink-muted">Last updated</p>
          <p className="text-sm font-semibold text-ink">{lastUpdated}</p>
        </div>
      </div>
    </div>
  );
}

function LatestUpdateCard({
  update,
  firstName,
  teacherName,
}: {
  update: AIUpdate;
  firstName: string;
  teacherName: string;
}) {
  return (
    <div className={`${card} shadow-elevated`}>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue">
          <SparklesIcon className="h-3.5 w-3.5" /> AI Parent Update
        </span>
        <span className="ml-auto text-xs text-ink-muted">Updated {relativeDay(update.createdAt).toLowerCase()}</span>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue text-white">
              <GlobeIcon className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-blueDark">Simple English</h3>
            <TextToSpeechButton
              text={update.englishSummary}
              language="english"
              label="the English update"
              className="ml-auto"
            />
          </div>
          <p className="text-[1.05rem] leading-[1.9] text-ink">{update.englishSummary}</p>
        </div>

        <div className="border-t border-dashed border-slate-200 pt-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-green text-white">
              <MessageIcon className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-greenDark">
              Friendly Roman Urdu
            </h3>
            <TextToSpeechButton
              text={update.romanUrduSummary}
              language="roman_urdu"
              label="the Roman Urdu update"
              className="ml-auto"
            />
          </div>
          <p className="text-[1.05rem] leading-[1.9] text-ink">{update.romanUrduSummary}</p>
        </div>

        {update.urduSummary && (
          <div className="border-t border-dashed border-slate-200 pt-6">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                <MessageIcon className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-700">Urdu (اردو)</h3>
              <TextToSpeechButton
                text={update.urduSummary}
                language="urdu"
                label="the Urdu update"
                className="ml-auto"
              />
            </div>
            <p className="text-[1.05rem] leading-[1.9] text-ink" dir="rtl">
              {update.urduSummary}
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-ink-muted">
        Shared by {teacherName}, {firstName}&apos;s class teacher
      </p>
    </div>
  );
}

function WeekActionCard({ action }: { action: string }) {
  return (
    <div className="rounded-[20px] border border-brand-green/25 bg-emerald-50/70 p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white">
          <CheckIcon className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold text-brand-greenDark">What you can do this week</h3>
      </div>
      <p className="mt-4 text-lg font-semibold leading-relaxed text-ink">{action}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Small, regular practice can help build confidence.
      </p>
    </div>
  );
}

function SubjectCard({ stat }: { stat: ReturnType<typeof toSubjectStat> }) {
  return (
    <div className={card}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate font-semibold text-ink">{stat.name}</p>
        <p className="text-lg font-bold text-ink">{stat.score}%</p>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barTone[stat.tone]}`} style={{ width: `${stat.score}%` }} />
      </div>
      <p className={`mt-2.5 text-sm font-medium ${labelTone[stat.tone]}`}>{stat.label}</p>
    </div>
  );
}

function AreasToSupport({ weakest }: { weakest: SubjectScore }) {
  return (
    <div className="rounded-[20px] border border-amber-200/70 bg-amber-50/40 p-6">
      <h3 className="text-base font-bold text-ink">Areas to support</h3>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{toSubjectStat(weakest).name}</p>
            {weakest.topic && <p className="truncate text-sm text-ink-muted">{weakest.topic}</p>}
          </div>
          <span className="text-lg font-bold text-ink">{weakest.score}%</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-200 to-amber-300"
            style={{ width: `${weakest.score}%` }}
          />
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Could use a little extra practice
        </p>
        <Link
          href="/parent/progress"
          className="mt-4 inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blueDark focus-ring"
        >
          View progress <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function MonthlyProgress({ subjects, insight }: { subjects: SubjectScore[]; insight: string }) {
  const gain = (s: SubjectScore) => s.score - s.previousScore;
  return (
    <div className={card}>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
          <BarChartIcon className="h-4 w-4" />
        </span>
        <h3 className="font-bold text-ink">Monthly progress</h3>
        <span className="ml-auto text-xs text-ink-muted">Last month → this month</span>
      </div>

      <div className="space-y-5">
        {subjects.map((s) => {
          const stat = toSubjectStat(s);
          const improved = gain(s) > 0;
          return (
            <div key={s.subject}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{stat.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-ink-muted">{s.previousScore}%</span>
                  <ChevronRightIcon className="h-3.5 w-3.5 text-ink-muted" />
                  <span className="font-semibold text-ink">{s.score}%</span>
                  {improved && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-brand-greenDark">
                      <TrendingUpIcon className="h-3 w-3" /> +{gain(s)}
                    </span>
                  )}
                </span>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${improved ? 'bg-gradient-to-r from-emerald-400 to-brand-green' : barTone[stat.tone]}`}
                  style={{ width: `${s.score}%` }}
                />
                {improved && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-white ring-1 ring-slate-200"
                    style={{ left: `${s.previousScore}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl bg-slate-50 p-4">
        <LightbulbIcon className="h-5 w-5 shrink-0 text-brand-blue" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">AI insight</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{insight}</p>
        </div>
      </div>
    </div>
  );
}

export default function ParentDashboard({ profile, update, monthNote, teacherName }: ParentDashboardProps) {
  const { student, attendance, subjects, weakestSubject } = profile;
  const firstName = student.name.split(' ')[0];

  const improvingCount = subjects.filter(isImproving).length;
  const supportCount = subjects.filter(needsSupport).length;
  const stats = subjects.map(toSubjectStat);
  const recent = buildRecentUpdates(subjects, update, weakestSubject);
  // Supportive framing: a child below the line is still making steady progress.
  const statusLabel = supportCount === 0 ? 'Doing well' : 'Steady progress';

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.85rem]">
          Here&apos;s how {firstName} is doing.
        </h1>
        <p className="mt-1.5 text-ink-muted">Stay connected with your child&apos;s learning journey.</p>
      </header>

      <ChildProfileCard
        profile={profile}
        statusLabel={statusLabel}
        lastUpdated={update ? relativeDay(update.createdAt) : 'Recently'}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={<TrendingUpIcon className="h-5 w-5" />}
          value={`${overallProgressNow(profile)}%`}
          label="Overall Progress"
          hint="This term"
          tone="blue"
        />
        <StatCard
          icon={<CalendarCheckIcon className="h-5 w-5" />}
          value={`${attendance}%`}
          label="Attendance"
          hint="This term"
          tone="green"
        />
        <StatCard
          icon={<CheckCircleIcon className="h-5 w-5" />}
          value={`${improvingCount}`}
          label="Subjects Improving"
          hint="Trending upward"
          tone="green"
        />
        <StatCard
          icon={<AlertIcon className="h-5 w-5" />}
          value={`${supportCount}`}
          label="Needs Some Support"
          hint="Extra practice helps"
          tone="amber"
        />
      </div>

      {/* The heart of the product: what the teacher's AI update says */}
      <section>
        <SectionHeading title="Your latest update" subtitle="An update from your child's teacher" />
        {update ? (
          <div
            className={`grid grid-cols-1 gap-6 ${
              update.parentAction || update.whyThisMatters ? 'xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]' : ''
            }`}
          >
            <LatestUpdateCard update={update} firstName={firstName} teacherName={teacherName} />
            {(update.parentAction || update.whyThisMatters) && (
              <div className="space-y-6">
                {update.parentAction && <WeekActionCard action={update.parentAction} />}
                {update.whyThisMatters && (
                  <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-card">
                    <p className="text-sm font-semibold text-ink">Why this helps</p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{update.whyThisMatters}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={`${card} py-14 text-center`}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
              <MessageIcon className="h-6 w-6" />
            </span>
            <p className="mt-4 font-semibold text-ink">No update yet</p>
            <p className="mt-1 text-sm text-ink-muted">Your teacher will share an update with you soon.</p>
          </div>
        )}
      </section>

      {/* Subject progress */}
      <section id="subject-progress" className="scroll-mt-24">
        <SectionHeading title="Subject progress" subtitle="How each subject is moving this term." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <SubjectCard key={stat.name} stat={stat} />
          ))}
        </div>
      </section>

      {/* Support areas, the monthly trend and the update history — stacked in the
          order a parent reads them on mobile, side-by-side from lg up. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="space-y-6">
          <AreasToSupport weakest={weakestSubject} />
          <MonthlyProgress subjects={subjects} insight={monthNote} />
        </div>

        {/* Recent updates */}
        <section id="recent-updates" className="scroll-mt-24">
          <div className={card}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-bold text-ink">Recent updates</h3>
              <Link
                href="/parent/updates"
                className="inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blueDark focus-ring"
              >
                View all updates <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {recent.map((row) => (
                <li key={`${row.subject}-${row.kind}-${row.when}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      row.sent ? 'bg-blue-50 text-brand-blue' : 'bg-slate-100 text-ink-muted'
                    }`}
                  >
                    {row.sent ? <SparklesIcon className="h-4 w-4" /> : <MessageIcon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{row.subject}</p>
                    <p className="truncate text-xs text-ink-muted">{row.kind}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-muted">{row.when}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <p className="pt-2 text-center text-xs text-ink-muted">
        Questions about {firstName}&apos;s progress? Message the class teacher from the{' '}
        <Link href="/parent/updates" className="font-semibold text-brand-blue transition-colors hover:text-brand-blueDark focus-ring rounded">
          Updates
        </Link>{' '}
        section.
      </p>
    </div>
  );
}
