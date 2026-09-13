/**
 * Pure attendance helpers shared by the real, backend-wired attendance page.
 * Nothing here invents data — every figure (counts, percentages, trend,
 * insight) is derived from whatever `DayMarks` the caller passes in, which
 * for the real page comes from `lib/attendance-real.ts` (real students, real
 * `Attendance` rows). Kept dependency-free so it stays easy to reason about
 * and test.
 */

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'unmarked';

export interface RosterStudent {
  id: string;
  name: string;
  initials: string;
  /** Term attendance rate, shown in the table's "Attendance Rate" column —
   * always the real, server-computed rollup (see TeacherStudentListItem). */
  rate: number;
}

export interface AttendanceMark {
  status: AttendanceStatus;
}

export type DayMarks = Record<string, AttendanceMark>;

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

// ------------------------------------------------------------------ calendar

const DAY_MS = 86_400_000;

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local calendar key for a date, e.g. "2026-09-11". */
export function dateKey(from: Date = new Date()): string {
  return toKey(from);
}

/**
 * The last `count` school days (Mon–Fri), oldest first. Computed on the server
 * and passed down as props, so a browser in another timezone can never render a
 * different date than the one that was marked.
 */
export function schoolDays(count = 5, from: Date = new Date()): string[] {
  const days: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  while (days.length < count) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) days.unshift(toKey(cursor));
    cursor.setTime(cursor.getTime() - DAY_MS);
  }
  return days;
}

function fromKey(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** "Friday, September 11, 2026" */
export function longDate(iso: string): string {
  return fromKey(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** "September 11, 2026" — the header's date control. */
export function monthDayYear(iso: string): string {
  return fromKey(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "September 11" — sentences that need a date without the year. */
export function monthDay(iso: string): string {
  return fromKey(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/** "Mon" — the weekly trend's axis. */
export function shortDay(iso: string): string {
  return fromKey(iso).toLocaleDateString('en-US', { weekday: 'short' });
}

/** "Monday" — used when a sentence names the day. */
export function dayName(iso: string): string {
  return fromKey(iso).toLocaleDateString('en-US', { weekday: 'long' });
}

// ----------------------------------------------------------------- roll-ups

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  marked: number;
  total: number;
  /** Present-only share of the class, matching how the cards are labelled. */
  rate: number;
  lateShare: number;
  absentShare: number;
  complete: boolean;
}

export function summarize(marks: DayMarks, roster: RosterStudent[]): AttendanceSummary {
  let present = 0;
  let late = 0;
  let absent = 0;

  for (const student of roster) {
    const status = marks[student.id]?.status;
    if (status === 'present') present += 1;
    else if (status === 'late') late += 1;
    else if (status === 'absent') absent += 1;
  }

  const marked = present + late + absent;
  const total = roster.length;

  return {
    present,
    late,
    absent,
    marked,
    total,
    rate: total ? (present / total) * 100 : 0,
    lateShare: total ? (late / total) * 100 : 0,
    absentShare: total ? (absent / total) * 100 : 0,
    complete: marked === total,
  };
}

/** "87.5%" and "6.25%" for fractions, "94%" for whole numbers — never "87.50000%". */
export function pct(value: number): string {
  const trimmed = Math.round(value * 100) / 100;
  return `${trimmed}%`;
}

/** Weekly figures read better as whole numbers. */
export function pctWhole(value: number): string {
  return `${Math.round(value)}%`;
}

export interface TrendDay {
  label: string;
  /** "Monday" — for sentences that name the day in full. */
  name: string;
  day: string;
  rate: number;
}

/**
 * Daily attendance rate across `days`, using `liveMarks` for `liveDay` (so an
 * unsaved edit shows up immediately) and `dayMarksByDate` — real saved marks
 * for the rest of the window — for everything else.
 */
export function weeklyTrend(
  roster: RosterStudent[],
  days: string[],
  liveDay: string,
  liveMarks: DayMarks,
  dayMarksByDate: Record<string, DayMarks>
): TrendDay[] {
  return days.map((day) => {
    const marks = day === liveDay ? liveMarks : (dayMarksByDate[day] ?? {});
    return { label: shortDay(day), name: dayName(day), day, rate: summarize(marks, roster).rate };
  });
}

/** Students with a late or absent entry anywhere in `days`. */
export function flaggedStudents(
  days: string[],
  liveDay: string,
  liveMarks: DayMarks,
  dayMarksByDate: Record<string, DayMarks>
): string[] {
  const seen = new Set<string>();
  for (const day of days) {
    const marks = day === liveDay ? liveMarks : (dayMarksByDate[day] ?? {});
    for (const [studentId, mark] of Object.entries(marks)) {
      if (mark.status === 'late' || mark.status === 'absent') seen.add(studentId);
    }
  }
  return [...seen];
}

/**
 * One-line read of the shape of the week, for under the trend chart. Derived from
 * the bars it sits under, so the sentence and the chart can never disagree. The
 * numbers themselves stay on the chart rather than being repeated here.
 */
export function trendTakeaway(trend: TrendDay[]): string {
  const rated = trend.filter((t) => t.rate > 0);
  if (!rated.length) return 'Nothing marked yet — the chart fills in as you take the register.';

  const peak = rated.reduce((best, t) => (t.rate > best.rate ? t : best), rated[0]);
  const when = trend.indexOf(peak) <= Math.floor(trend.length / 2) ? 'earlier this week' : 'later in the week';
  return `Attendance was strongest ${when}.`;
}

/**
 * Plain read of the week for the teacher: how steady it looks and how many names
 * are worth a quiet check-in. Supportive, not disciplinary — an attendance dip
 * is usually a story, not a misdemeanour.
 */
export function attendanceInsight(trend: TrendDay[], flaggedCount: number): string {
  const rates = trend.map((t) => t.rate).filter((r) => r > 0);
  if (!rates.length) {
    return 'Attendance has not been marked for this week yet. Taking the register at the start of the lesson keeps these insights accurate.';
  }

  const spread = Math.max(...rates) - Math.min(...rates);
  const steady =
    spread <= 10
      ? 'Attendance has remained fairly consistent this week.'
      : spread <= 18
        ? 'Attendance has varied a little across the week.'
        : 'Attendance has moved around quite a bit this week.';

  const watch =
    flaggedCount === 0
      ? 'Every student was present on time all week.'
      : `${flaggedCount} ${flaggedCount === 1 ? 'student has' : 'students have'} had late or absent records that may be worth monitoring.`;

  return `${steady} ${watch}`;
}
