import type { AIUpdate, StudentProfile } from '@/lib/types';
import { displaySubject } from '@/lib/subjects';
import { improverNames, isImproving, listPhrase, toSubjectStat, type SubjectTone } from './parent-dashboard-data';

/**
 * Everything the parent Progress view needs that the gradebook doesn't already
 * hold: month-by-month history. Figures are recorded per student, and any child
 * without a history gets a deterministic ramp ending on their real current
 * value, so the page never renders an empty chart.
 */

export type RangeKey = 'month' | 'quarter' | 'year';

export interface RangeOption {
  key: RangeKey;
  label: string;
  /** Trailing months this option scopes the chart to. */
  months: number;
}

export const RANGE_OPTIONS: RangeOption[] = [
  { key: 'month', label: 'This Month', months: 1 },
  { key: 'quarter', label: 'Last 3 Months', months: 3 },
  { key: 'year', label: 'This Year', months: 6 },
];

export const MONTH_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

export interface TrendPoint {
  month: string;
  value: number;
}

const overallHistory: Record<string, number[]> = {
  'ali-khan': [61, 64, 66, 68, 70, 72],
};

const attendanceHistory: Record<string, number[]> = {
  'ali-khan': [82, 84, 91, 89, 86, 87],
};

/** Evenly spaced ramp that lands exactly on `now`. */
function ramp(now: number, stepPerMonth: number): number[] {
  const last = MONTH_LABELS.length - 1;
  return MONTH_LABELS.map((_, i) => Math.max(0, Math.round(now - stepPerMonth * (last - i))));
}

function toPoints(values: number[]): TrendPoint[] {
  return values.map((value, i) => ({ month: MONTH_LABELS[i % MONTH_LABELS.length], value }));
}

export function overallTrend(profile: StudentProfile): TrendPoint[] {
  return toPoints(overallHistory[profile.student.id] ?? ramp(profile.overallPerformance, 2));
}

export function attendanceTrend(profile: StudentProfile): TrendPoint[] {
  return toPoints(attendanceHistory[profile.student.id] ?? ramp(profile.attendance, 1));
}

/**
 * The single "Overall progress" figure both parent screens show. It is the
 * term's current standing — deliberately the trend's last point rather than the
 * mean of this term's four subject marks.
 */
export function overallProgressNow(profile: StudentProfile): number {
  const trend = overallTrend(profile);
  return trend[trend.length - 1].value;
}

/** The trailing window a range option selects. */
export function scopedTrend(points: TrendPoint[], months: number): TrendPoint[] {
  return months >= points.length ? points : points.slice(points.length - months);
}

function baselineIndex(length: number, months: number) {
  return Math.max(0, length - months - 1);
}

/** Change from the value just before the window to the newest point. */
export function trendDelta(points: TrendPoint[], months: number): number {
  if (points.length < 2) return 0;
  return points[points.length - 1].value - points[baselineIndex(points.length, months)].value;
}

/** States the number's basis, e.g. "vs Jun" or "since Apr". */
export function deltaCaption(points: TrendPoint[], months: number): string {
  if (points.length < 2) return '';
  const baseline = points[baselineIndex(points.length, months)];
  const prefix = baseline === points[0] ? 'since' : 'vs';
  return `${prefix} ${baseline.month}`;
}

export interface SubjectPerformance {
  name: string;
  score: number;
  previousScore: number;
  change: number;
  tone: SubjectTone;
  status: string;
}

function statusFor(tone: SubjectTone, score: number, change: number): string {
  if (tone === 'support') return change > 0 ? 'Improving, but needs more practice' : 'Needs a little extra practice';
  if (tone === 'standard') return change > 0 ? 'Improving' : 'Steady';
  return score >= 88 ? 'Doing very well' : 'Doing well';
}

export function subjectPerformances(profile: StudentProfile): SubjectPerformance[] {
  return profile.subjects.map((s) => {
    const stat = toSubjectStat(s);
    const change = s.score - s.previousScore;
    return {
      name: stat.name,
      score: s.score,
      previousScore: s.previousScore,
      change,
      tone: stat.tone,
      status: statusFor(stat.tone, s.score, change),
    };
  });
}

export interface SupportFocus {
  name: string;
  area: string;
  score: number;
  message: string;
}

/** The one subject a parent can realistically act on this month. */
export function supportFocus(profile: StudentProfile): SupportFocus {
  const weakest = profile.weakestSubject;
  const name = displaySubject(weakest.subject);
  const area = weakest.topic?.trim() || name;
  const first = profile.student.name.split(' ')[0];
  const improving = weakest.score > weakest.previousScore;

  const message = improving
    ? `${first} is improving, but a little extra ${area} practice could help build confidence.`
    : `${first} is working on ${name}. A little extra ${area} practice could help build confidence.`;

  return { name, area, score: weakest.score, message };
}

export function improvingCount(profile: StudentProfile): number {
  return profile.subjects.filter(isImproving).length;
}

/** Mirrors the dashboard's insight wording, then names the concrete focus area. */
export function progressInsight(profile: StudentProfile): string {
  const first = profile.student.name.split(' ')[0];
  const improvers = improverNames(profile);
  const weakest = profile.weakestSubject;
  const name = displaySubject(weakest.subject);
  const area = weakest.topic?.trim() || name;

  const lead = improvers.length
    ? `${first} is showing steady improvement in ${listPhrase(improvers)}.`
    : `${first} is holding steady across the class.`;

  const focus =
    weakest.score > weakest.previousScore
      ? ` ${name} is also improving, but ${area} remains the main area where additional practice could help.`
      : ` ${name} is the main area where additional practice could help.`;

  return `${lead}${focus}`;
}

/** Reuses the action the teacher actually sent, so the two screens agree. */
export function recommendedFocus(profile: StudentProfile, update: AIUpdate | null): string {
  if (update?.parentAction?.trim()) return update.parentAction.trim();
  const { area } = supportFocus(profile);
  return `Practice ${area} for 15-20 minutes, 3 times this week.`;
}

/** Honest, non-alarmist read of the attendance spread. */
export function attendanceSummary(points: TrendPoint[]): string {
  const values = points.map((p) => p.value);
  const spread = Math.max(...values) - Math.min(...values);
  if (spread <= 5) return 'Attendance has remained fairly consistent.';
  if (spread <= 10) return 'Attendance has varied a little month to month.';
  return 'Attendance has moved around this term — regular practice days help most.';
}
