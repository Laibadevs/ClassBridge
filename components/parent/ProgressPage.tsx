'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AIUpdate, StudentProfile } from '@/lib/types';
import {
  RANGE_OPTIONS,
  attendanceSummary,
  attendanceTrend,
  deltaCaption,
  improvingCount,
  overallProgressNow,
  overallTrend,
  progressInsight,
  recommendedFocus,
  scopedTrend,
  subjectPerformances,
  supportFocus,
  trendDelta,
  type RangeKey,
  type SubjectPerformance,
  type TrendPoint,
} from '@/lib/parent-progress-data';
import type { SubjectTone } from '@/lib/parent-dashboard-data';
import TrendChart from './TrendChart';
import {
  ArrowRightIcon,
  BarChartIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  LightbulbIcon,
  SparklesIcon,
  TrendingUpIcon,
} from '@/components/icons';

const card = 'rounded-[20px] border border-slate-200 bg-white p-5 shadow-card sm:p-6';

const barTone: Record<SubjectTone, string> = {
  strong: 'bg-gradient-to-r from-emerald-400 to-brand-green',
  standard: 'bg-gradient-to-r from-blue-400 to-brand-blue',
  support: 'bg-gradient-to-r from-amber-200 to-amber-300',
};

const statusTone: Record<SubjectTone, string> = {
  strong: 'text-brand-greenDark',
  standard: 'text-brand-blue',
  support: 'text-amber-700',
};

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
    </div>
  );
}

/**
 * Change chips always state their own basis ("vs Jun"), so a positive number can
 * never be read as a promise it doesn't keep. Zero and dips stay neutral — this
 * product never shows a red alarm to a parent.
 */
function TrendPill({ value, caption }: { value: number; caption: string }) {
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        up ? 'bg-emerald-50 text-brand-greenDark' : 'bg-slate-100 text-ink-muted'
      }`}
    >
      {up && <TrendingUpIcon className="h-3.5 w-3.5" />}
      {up ? `+${value}%` : value === 0 ? 'No change' : `${value}%`}
      {caption && <span className="font-medium opacity-75">{caption}</span>}
    </span>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  pill,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  pill?: React.ReactNode;
  tone: 'blue' | 'green';
}) {
  return (
    <div className={card}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            tone === 'blue' ? 'bg-blue-50 text-brand-blue' : 'bg-emerald-50 text-brand-greenDark'
          }`}
        >
          {icon}
        </span>
        <p className="text-sm font-semibold text-ink-muted">{label}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-4xl font-bold tracking-tight text-ink">{value}</p>
        {pill}
      </div>
    </div>
  );
}

function SubjectCard({ stat }: { stat: SubjectPerformance }) {
  return (
    <div className={card}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate font-semibold text-ink">{stat.name}</p>
        <p className="text-2xl font-bold tracking-tight text-ink">{stat.score}%</p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barTone[stat.tone]}`} style={{ width: `${stat.score}%` }} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-sm">
        <span className="text-ink-muted">
          Previous: <span className="font-medium text-ink">{stat.previousScore}%</span>
        </span>
        <TrendPill value={stat.change} caption="" />
      </div>

      <p className={`mt-3 text-sm font-medium ${statusTone[stat.tone]}`}>{stat.status}</p>
    </div>
  );
}

function AttendanceTrend({ points }: { points: TrendPoint[] }) {
  const values = points.map((p) => p.value);
  const lo = Math.min(...values) - 4;
  const hi = Math.max(...values) + 3;
  const height = (v: number) => Math.max(14, Math.round(((v - lo) / Math.max(1, hi - lo)) * 100));

  return (
    <div className="mt-5 flex h-[124px] items-end gap-3">
      {points.map((p, i) => {
        const isNow = i === points.length - 1;
        return (
          <div key={p.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className={`text-xs font-semibold tabular-nums ${isNow ? 'text-brand-blue' : 'text-ink-muted'}`}>
              {p.value}%
            </span>
            <div
              className={`w-full max-w-[42px] rounded-t-lg transition-all duration-500 ${
                isNow ? 'bg-gradient-to-t from-brand-blue to-brand-blueDark' : 'bg-blue-100'
              }`}
              style={{ height: `${height(p.value)}%` }}
            />
            <span className={`text-xs font-medium ${isNow ? 'text-ink' : 'text-ink-muted'}`}>{p.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProgressPage({
  profile,
  update,
}: {
  profile: StudentProfile;
  update: AIUpdate | null;
}) {
  const [range, setRange] = useState<RangeKey>('quarter');
  const months = RANGE_OPTIONS.find((o) => o.key === range)?.months ?? 3;

  const first = profile.student.name.split(' ')[0];
  const trend = overallTrend(profile);
  const delta = trendDelta(trend, months);
  const caption = deltaCaption(trend, months);

  const attendanceHistory = attendanceTrend(profile);
  const attendancePoints = scopedTrend(attendanceHistory, 4);
  const performances = subjectPerformances(profile);
  const improving = improvingCount(profile);
  const focus = supportFocus(profile);
  const insight = progressInsight(profile);
  const action = recommendedFocus(profile, update);

  const period = months === 1 ? 'the past month' : `the past ${months} months`;
  const story =
    delta > 0
      ? `${first} has shown steady progress over ${period}.`
      : delta === 0
        ? `${first} has held steady over ${period}.`
        : `${first} dipped a little over ${period} — a gentle check-in can help.`;

  return (
    <div className="space-y-8">
      {/* Header + time range */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.85rem]">{first}&apos;s Progress</h1>
          <p className="mt-1.5 text-ink-muted">See how your child&apos;s learning is changing over time.</p>
        </div>

        <div
          role="group"
          aria-label="Time range"
          className="-mx-1 flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-card sm:mx-0"
        >
          {RANGE_OPTIONS.map((option) => {
            const active = option.key === range;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-ring ${
                  active ? 'bg-brand-blue text-white shadow-elevated' : 'text-ink-muted hover:bg-slate-50 hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Progress summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<TrendingUpIcon className="h-5 w-5" />}
          value={`${overallProgressNow(profile)}%`}
          label="Overall Progress"
          pill={<TrendPill value={delta} caption={caption} />}
          tone="blue"
        />
        <SummaryCard
          icon={<CalendarCheckIcon className="h-5 w-5" />}
          value={`${profile.attendance}%`}
          label="Attendance"
          pill={
            <TrendPill
              value={trendDelta(attendanceHistory, 4)}
              caption={deltaCaption(attendanceHistory, 4)}
            />
          }
          tone="green"
        />
        <SummaryCard
          icon={<CheckCircleIcon className="h-5 w-5" />}
          value={`${improving}`}
          label="Subjects Improving"
          pill={
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">
              out of {profile.subjects.length} subjects
            </span>
          }
          tone="green"
        />
      </div>

      {/* Main trend */}
      <section>
        <div className={card}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
                <BarChartIcon className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-ink sm:text-xl">Overall Progress</h2>
            </div>
            <TrendPill value={delta} caption={caption} />
          </div>

          <TrendChart
            points={trend}
            activeMonths={months}
            summary={`${first}'s overall progress by month: ${trend.map((p) => `${p.month} ${p.value}%`).join(', ')}.`}
          />

          <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-ink-muted">
            <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
            {story}
          </p>
        </div>
      </section>

      {/* Subject performance */}
      <section>
        <SectionHeading title="Subject Performance" subtitle="Where each subject finished this term." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {performances.map((stat) => (
            <SubjectCard key={stat.name} stat={stat} />
          ))}
        </div>
      </section>

      {/* Support area + AI insight */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[20px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink">Where {first} needs a little support</h2>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{focus.name}</p>
                <p className="truncate text-sm text-ink-muted">{focus.area}</p>
              </div>
              <span className="text-2xl font-bold tracking-tight text-ink">{focus.score}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-200 to-amber-300"
                style={{ width: `${focus.score}%` }}
              />
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink">{focus.message}</p>
          <a
            href="#ai-insight"
            className="mt-5 inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blueDark focus-ring"
          >
            View recommendation <ChevronRightIcon className="h-4 w-4" />
          </a>
        </div>

        <section id="ai-insight" className="scroll-mt-24">
          <div className={`${card} h-full`}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue">
              <SparklesIcon className="h-3.5 w-3.5" /> ClassBridge AI Insight
            </span>
            <h2 className="mt-4 text-lg font-bold text-ink sm:text-xl">What&apos;s changing?</h2>
            <p className="mt-3 text-[1.05rem] leading-[1.9] text-ink">{insight}</p>

            <div className="mt-6 rounded-2xl border border-brand-green/25 bg-emerald-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-greenDark">Recommended focus</p>
              <p className="mt-2 flex items-start gap-2 font-semibold leading-relaxed text-ink">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-brand-green" />
                {action}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Attendance */}
      <section className={card}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-brand-greenDark">
              <CalendarCheckIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">Attendance</h2>
              <p className="text-sm text-ink-muted">{attendanceSummary(attendancePoints)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold tracking-tight text-ink">{profile.attendance}%</p>
            <TrendPill
              value={trendDelta(attendanceHistory, 4)}
              caption={deltaCaption(attendanceHistory, 4)}
            />
          </div>
        </div>

        <AttendanceTrend points={attendancePoints} />
      </section>

      {/* Parent takeaway */}
      <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-elevated sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
              <LightbulbIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Your focus this month</p>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink">
                Support {focus.area} practice
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
                Short, regular practice can help {first} build confidence and strengthen problem-solving skills.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link
              href="/parent/updates"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-glowBlue transition-colors hover:bg-brand-blueDark focus-ring"
            >
              View latest update <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/parent/updates"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
            >
              View all updates
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
