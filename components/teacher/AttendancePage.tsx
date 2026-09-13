'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TeacherShell from './TeacherShell';
import {
  AlertIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  LoaderIcon,
  SearchIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from '@/components/icons';
import {
  attendanceInsight,
  dayName,
  flaggedStudents,
  longDate,
  monthDay,
  monthDayYear,
  pct,
  pctWhole,
  shortDay,
  summarize,
  trendTakeaway,
  weeklyTrend,
  type AttendanceStatus,
  type DayMarks,
} from '@/lib/attendance-data';
import { bucketByDate, groupIntoClasses, rosterFromGroup, type ClassGroup } from '@/lib/attendance-real';
import { teacherApi, type TeacherStudentListItem } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

export interface AttendancePageProps {
  userName: string;
  /** School week computed on the server, oldest first. */
  days: string[];
  /** The server's calendar day, so "today" means the same on both sides. */
  today: string;
}

const card = 'rounded-[20px] border border-slate-200 bg-white shadow-card';

const statusOptions: { id: Exclude<AttendanceStatus, 'unmarked'>; label: string; active: string; idle: string }[] = [
  {
    id: 'present',
    label: 'Present',
    active: 'bg-emerald-50 text-brand-greenDark ring-brand-green/40',
    idle: 'bg-white text-ink-muted ring-slate-200 hover:text-brand-greenDark hover:ring-brand-green/40',
  },
  {
    id: 'late',
    label: 'Late',
    active: 'bg-amber-50 text-amber-700 ring-amber-300',
    idle: 'bg-white text-ink-muted ring-slate-200 hover:text-amber-700 hover:ring-amber-300',
  },
  {
    id: 'absent',
    label: 'Absent',
    active: 'bg-slate-200 text-ink ring-slate-300',
    idle: 'bg-white text-ink-muted ring-slate-200 hover:text-ink hover:ring-slate-300',
  },
];

const summaryTone = {
  green: 'bg-emerald-50 text-brand-greenDark',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-brand-blue',
  neutral: 'bg-slate-100 text-ink-muted',
} as const;

function SummaryCard({
  icon,
  tone,
  value,
  label,
  hint,
}: {
  icon: React.ReactNode;
  tone: keyof typeof summaryTone;
  value: string | number;
  label: string;
  hint: string;
}) {
  return (
    <div className={`${card} p-5 transition-shadow hover:shadow-elevated`}>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${summaryTone[tone]}`}>{icon}</span>
      <p className="mt-4 text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

function StatusControls({
  value,
  name,
  compact,
  onPick,
}: {
  value: AttendanceStatus;
  name: string;
  compact?: boolean;
  onPick: (status: Exclude<AttendanceStatus, 'unmarked'>) => void;
}) {
  return (
    <div className={`flex gap-1.5 ${compact ? '' : 'flex-wrap'}`} role="group" aria-label={`Attendance for ${name}`}>
      {statusOptions.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            title={active ? `Clear ${option.label.toLowerCase()} for ${name}` : `Mark ${name} as ${option.label.toLowerCase()}`}
            onClick={() => onPick(option.id)}
            className={`flex-1 whitespace-nowrap rounded-lg text-sm font-semibold ring-1 ring-inset transition-colors focus-ring ${
              compact ? 'px-2 py-2.5' : 'px-3 py-2'} ${active ? option.active : option.idle}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function RateCell({ rate }: { rate: number }) {
  const bar = rate >= 90 ? 'bg-brand-green' : rate >= 80 ? 'bg-brand-blue' : 'bg-amber-400';
  return (
    <div className="w-[92px]">
      <p className="text-sm font-semibold tabular-nums text-ink">{rate}%</p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

function ViewLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/teacher/student/${id}`}
      aria-label={`View ${name}'s profile`}
      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 focus-ring"
    >
      View <ChevronRightIcon className="h-4 w-4" />
    </Link>
  );
}

export default function AttendancePage({ userName, days, today }: AttendancePageProps) {
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [windowMarks, setWindowMarks] = useState<Record<string, DayMarks>>({});
  const [extraMarks, setExtraMarks] = useState<Record<string, DayMarks>>({});
  const [localSaved, setLocalSaved] = useState<Record<string, DayMarks>>({});

  const [drafts, setDrafts] = useState<Record<string, DayMarks>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [savedAt, setSavedAt] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<{ tone: 'success' | 'notice'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initial load: the whole roster plus the fixed trend window, in parallel.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [studentRows, attendanceRows] = await Promise.all([
          teacherApi.listStudents(),
          teacherApi.getAttendanceRange(days[0], days[days.length - 1]),
        ]);
        if (cancelled) return;
        setStudents(studentRows);
        setWindowMarks(bucketByDate(attendanceRows));
        const groups = groupIntoClasses(studentRows);
        setClassId((current) => current ?? groups[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "We couldn't load your students. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A date picked outside the fixed trend window (e.g. an older date) needs
  // its own small fetch — everything inside the window already came back
  // from the one range call above.
  useEffect(() => {
    if (loading || days.includes(date) || date in extraMarks) return;
    let cancelled = false;
    teacherApi
      .getAttendanceRange(date, date)
      .then((rows) => {
        if (cancelled) return;
        setExtraMarks((current) => ({ ...current, ...bucketByDate(rows), [date]: bucketByDate(rows)[date] ?? {} }));
      })
      .catch(() => {
        /* the register still works for taking new attendance without history */
      });
    return () => {
      cancelled = true;
    };
  }, [date, days, loading, extraMarks]);

  const classes = useMemo(() => groupIntoClasses(students), [students]);
  const currentGroup: ClassGroup | undefined = useMemo(
    () => classes.find((c) => c.id === classId) ?? classes[0],
    [classes, classId]
  );
  const roster = useMemo(() => (currentGroup ? rosterFromGroup(currentGroup) : []), [currentGroup]);

  const key = `${currentGroup?.id ?? 'none'}|${date}`;
  const savedByDate = useMemo(
    () => ({ ...windowMarks, ...extraMarks, ...localSaved }),
    [windowMarks, extraMarks, localSaved]
  );

  const stored = savedByDate[date] ?? {};
  const marks = drafts[key] ?? stored;

  const summary = summarize(marks, roster);
  const trend = useMemo(() => weeklyTrend(roster, days, date, marks, savedByDate), [roster, days, date, marks, savedByDate]);
  const flagged = useMemo(() => flaggedStudents(days, date, marks, savedByDate), [days, date, marks, savedByDate]);
  const insight = attendanceInsight(trend, flagged.length);
  const takeaway = trendTakeaway(trend);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? roster.filter((s) => s.name.toLowerCase().includes(q)) : roster), [roster, q]);

  const isToday = date === today;
  const hasUnsaved = Boolean(dirty[key]);
  const justSaved = Boolean(savedAt[key]) && !hasUnsaved;
  const firstDay = days[0] ?? date;
  const lastDay = days[days.length - 1] ?? date;

  function writeDay(next: DayMarks) {
    setDrafts((current) => ({ ...current, [key]: next }));
    setDirty((current) => ({ ...current, [key]: true }));
    setError(null);
  }

  function setStatus(studentId: string, picked: Exclude<AttendanceStatus, 'unmarked'>) {
    const previous = marks[studentId];
    // Tapping the status that is already chosen clears the row — quicker than
    // reaching for a separate "unmark" control.
    if (previous?.status === picked) {
      writeDay({ ...marks, [studentId]: { status: 'unmarked' } });
      return;
    }
    writeDay({ ...marks, [studentId]: { status: picked } });
  }

  function markAllPresent() {
    const next: DayMarks = {};
    for (const student of roster) next[student.id] = { status: 'present' };
    writeDay(next);
    setError(null);
    setFlash({ tone: 'success', text: `All ${roster.length} students marked present.` });
  }

  function clearAttendance() {
    const next: DayMarks = {};
    for (const student of roster) next[student.id] = { status: 'unmarked' };
    writeDay(next);
    setError(null);
    setFlash({ tone: 'notice', text: `Attendance cleared for ${currentGroup?.label ?? 'this class'}.` });
  }

  function cancel() {
    setDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setDirty((current) => ({ ...current, [key]: false }));
    setFlash(null);
    setError(null);
  }

  async function save() {
    if (!currentGroup) return;
    const marksPayload = roster
      .map((student) => ({ student, mark: marks[student.id] }))
      .filter((row) => row.mark && row.mark.status !== 'unmarked')
      .map((row) => ({ student_id: row.student.id, status: row.mark!.status as Exclude<AttendanceStatus, 'unmarked'> }));

    setSaving(true);
    setError(null);
    setFlash(null);

    try {
      const rows = await teacherApi.setAttendanceDay({
        date,
        rosterStudentIds: roster.map((s) => s.id),
        marks: marksPayload,
      });

      const settled: DayMarks = {};
      for (const student of roster) settled[student.id] = { status: 'unmarked' };
      for (const row of rows) settled[row.student_id] = { status: row.status };

      setLocalSaved((current) => ({ ...current, [date]: { ...(current[date] ?? {}), ...settled } }));
      setDrafts((current) => ({ ...current, [key]: settled }));
      setDirty((current) => ({ ...current, [key]: false }));
      setSavedAt((current) => ({ ...current, [key]: new Date().toISOString() }));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We couldn't save the attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const savedMessage = isToday
    ? "Today's attendance has been updated successfully."
    : `Attendance for ${monthDay(date)} has been updated successfully.`;

  if (loading) {
    return (
      <TeacherShell userName={userName}>
        <div className={`${card} p-10 text-center text-ink-muted`}>Loading your class roster…</div>
      </TeacherShell>
    );
  }

  if (loadError) {
    return (
      <TeacherShell userName={userName}>
        <div className={`${card} p-10 text-center`}>
          <AlertIcon className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-3 font-semibold text-ink">{loadError}</p>
        </div>
      </TeacherShell>
    );
  }

  if (!currentGroup) {
    return (
      <TeacherShell userName={userName}>
        <div className={`${card} px-6 py-16 text-center`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
            <UsersIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">No students yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Add a student first — once they&apos;re on your roster, they&apos;ll appear here ready to mark.
          </p>
          <Link
            href="/teacher/students"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-glowBlue transition-colors hover:bg-brand-blueDark focus-ring"
          >
            Add a student
          </Link>
        </div>
      </TeacherShell>
    );
  }

  return (
    <TeacherShell userName={userName}>
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">Attendance</h1>
          <p className="mt-1 text-ink-muted">Keep track of your students&apos; attendance and daily participation.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:justify-end">
          <div className="relative flex min-w-[15rem] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-card transition hover:border-brand-blue/40">
            <CalendarCheckIcon className="h-4 w-4 shrink-0 text-brand-blue" />
            <span className="flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Date</span>
              <span className="block text-sm font-semibold text-ink">{monthDayYear(date)}</span>
            </span>
            {/* A transparent native field on top keeps typing and the OS picker, while
                the readable value stays ours. */}
            <input
              type="date"
              value={date}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) return;
                setDate(next);
                setFlash(null);
                setError(null);
              }}
              onClick={(event) => {
                // Click anywhere on the control, not just the tiny native indicator.
                const field = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
                try {
                  field.showPicker?.();
                } catch {
                  /* older browsers keep the ordinary field behaviour */
                }
              }}
              aria-label={`Attendance date, currently ${longDate(date)}`}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <label className="flex min-w-[15rem] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-card transition hover:border-brand-blue/40">
            <UserIcon className="h-4 w-4 shrink-0 text-brand-blue" />
            <span className="flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Class</span>
              <span className="relative block">
                <select
                  value={currentGroup.id}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setFlash(null);
                    setError(null);
                  }}
                  aria-label="Class"
                  className="w-full cursor-pointer appearance-none rounded bg-transparent text-sm font-semibold text-ink outline-none focus-ring"
                >
                  {classes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          tone="green"
          icon={<CheckIcon className="h-5 w-5" />}
          value={summary.present}
          label="Present"
          hint={summary.total ? `${pct(summary.rate)} of the class` : 'No students on this roster'}
        />
        <SummaryCard
          tone="neutral"
          icon={<UserIcon className="h-5 w-5" />}
          value={summary.absent}
          label="Absent"
          hint={`${pct(summary.absentShare)} of the class`}
        />
        <SummaryCard
          tone="amber"
          icon={<ClockIcon className="h-5 w-5" />}
          value={summary.late}
          label="Late"
          hint={`${pct(summary.lateShare)} of the class`}
        />
        <SummaryCard
          tone="blue"
          icon={<CalendarCheckIcon className="h-5 w-5" />}
          value={pct(summary.rate)}
          label="Attendance Rate"
          hint={`${summary.present} of ${summary.total} present${isToday ? ' today' : ` on ${monthDay(date)}`}`}
        />
      </div>

      {/* Controls: search + bulk actions */}
      <div className={`${card} mt-6 p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative lg:max-w-md lg:flex-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search students..."
              aria-label="Search students"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/25"
            />
          </div>

          <div className="flex flex-wrap gap-3 lg:ml-auto">
            <button
              type="button"
              onClick={markAllPresent}
              title={`Mark every student in ${currentGroup.label} present`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:border-brand-green hover:text-brand-greenDark focus-ring"
            >
              <CheckIcon className="h-4 w-4 text-brand-green" /> Mark all present
            </button>
            <button
              type="button"
              onClick={clearAttendance}
              title="Clear every mark for this class and date"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-muted shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
            >
              Clear attendance
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span>
            {currentGroup.label} · {summary.total} students
          </span>
          {summary.marked < summary.total ? (
            <span>{summary.total - summary.marked} still to mark</span>
          ) : (
            <span className="font-semibold text-brand-greenDark">Everyone accounted for</span>
          )}
          {q && (
            <span>
              Showing {visible.length} of {summary.total}
            </span>
          )}
        </div>
      </div>

      {flash && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${
            flash.tone === 'success'
              ? 'border-brand-green/25 bg-emerald-50/70'
              : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          <CheckCircleIcon
            className={`mt-0.5 h-5 w-5 shrink-0 ${flash.tone === 'success' ? 'text-brand-green' : 'text-ink-muted'}`}
          />
          <p className="text-sm font-medium text-ink">{flash.text}</p>
        </div>
      )}

      {/* Register */}
      {visible.length === 0 ? (
        <div className={`${card} mt-6 px-6 py-16 text-center`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
            <SearchIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">No students found</h2>
          <p className="mt-1 text-sm text-ink-muted">No one in {currentGroup.label} matches “{query}”.</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${card} mt-6 hidden overflow-hidden md:block`}>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-xs uppercase tracking-wide text-ink-muted">
                  <th className="w-[16rem] px-5 py-3.5 font-semibold">Student</th>
                  <th className="w-[16.5rem] px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Attendance Rate</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((student) => {
                  const mark = marks[student.id] ?? { status: 'unmarked' as AttendanceStatus };
                  return (
                    <tr key={student.id} className="transition-colors hover:bg-blue-50/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-brand-blue">
                            {student.initials}
                          </span>
                          <span className="font-semibold text-ink">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusControls
                          value={mark.status}
                          name={student.name}
                          onPick={(picked) => setStatus(student.id, picked)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <RateCell rate={student.rate} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ViewLink id={student.id} name={student.name} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {visible.map((student) => {
              const mark = marks[student.id] ?? { status: 'unmarked' as AttendanceStatus };
              return (
                <div key={student.id} className={`${card} p-4`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-brand-blue">
                      {student.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{student.name}</p>
                      <p className="truncate text-xs text-ink-muted">{student.rate}% attendance this term</p>
                    </div>
                    <ViewLink id={student.id} name={student.name} />
                  </div>

                  <div className="mt-3">
                    <StatusControls
                      compact
                      value={mark.status}
                      name={student.name}
                      onPick={(picked) => setStatus(student.id, picked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Trend + insight */}
      <div className="mt-8 grid grid-cols-1 gap-6 pb-2 xl:grid-cols-3">
        <section className={`${card} p-5 sm:p-6 xl:col-span-2`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">Attendance trend</h2>
            <p className="text-xs text-ink-muted">
              Daily rate · {monthDay(firstDay)} – {monthDay(lastDay)}
            </p>
          </div>

          <div className="mt-6 flex items-end gap-2 border-b border-slate-200 pb-3 sm:gap-4">
            {trend.map((entry) => {
              const selected = entry.day === date;
              return (
                <button
                  key={entry.day}
                  type="button"
                  onClick={() => {
                    setDate(entry.day);
                    setFlash(null);
                    setError(null);
                  }}
                  title={`Show the register for ${dayName(entry.day)}`}
                  aria-label={`Show the register for ${longDate(entry.day)}`}
                  aria-current={selected ? 'date' : undefined}
                  className="group flex h-40 flex-1 flex-col justify-end rounded-lg pb-1 focus-ring"
                >
                  <span
                    className={`mb-2 text-center text-xs font-semibold tabular-nums ${
                      selected ? 'text-brand-blue' : 'text-ink-muted'
                    }`}
                  >
                    {entry.rate > 0 ? pctWhole(entry.rate) : '—'}
                  </span>
                  {entry.rate > 0 ? (
                    <span
                      className={`w-full rounded-t-lg transition-all ${
                        selected
                          ? 'bg-gradient-to-t from-brand-blueDark to-brand-blue'
                          : 'bg-gradient-to-t from-blue-400/80 to-blue-300 group-hover:from-brand-blue group-hover:to-blue-400'
                      }`}
                      style={{ height: `${entry.rate}%` }}
                    />
                  ) : (
                    <span className="h-1.5 w-full rounded-full bg-slate-100" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2 sm:gap-4">
            {trend.map((entry) => (
              <span
                key={entry.day}
                className={`flex-1 text-center text-xs font-semibold ${
                  entry.day === date ? 'text-brand-blue' : 'text-ink-muted'
                }`}
              >
                {shortDay(entry.day)}
              </span>
            ))}
          </div>

          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-ink">{takeaway}</p>
        </section>

        <section id="ai-insight" className={`${card} scroll-mt-24 p-5 sm:p-6`}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue">
            <SparklesIcon className="h-3.5 w-3.5" /> ClassBridge AI Insight
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">How the week is going</h2>
          <p className="mt-3 leading-relaxed text-ink">{insight}</p>

          {flagged.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Worth a quiet check-in</p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {flagged.map((id) => {
                  const student = roster.find((s) => s.id === id);
                  if (!student) return null;
                  return (
                    <li key={id}>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-ink">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {student.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-ink-muted">
            Saved attendance stays with this class register, so ClassBridge AI can mention it when a parent update is
            drafted.
          </p>
        </section>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-20 mt-6">
        <div className="rounded-t-[20px] border border-slate-200 bg-white/95 p-4 shadow-elevated backdrop-blur-md sm:rounded-2xl sm:px-5">
          {justSaved ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                <div>
                  <p className="font-semibold text-ink">Attendance saved</p>
                  <p className="text-sm text-ink-muted">{savedMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSavedAt((current) => ({ ...current, [key]: '' }))}
                className="self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring sm:self-auto"
              >
                Edit register
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">
                  {summary.marked} of {summary.total} students marked
                </p>
                <p className="text-sm text-ink-muted">
                  {hasUnsaved ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Unsaved changes for {monthDayYear(date)}
                    </span>
                  ) : summary.marked === 0 ? (
                    `${currentGroup.label} · nothing marked yet`
                  ) : (
                    `${summary.present} present · ${summary.late} late · ${summary.absent} absent`
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {error && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                    <AlertIcon className="h-4 w-4 shrink-0" />
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={cancel}
                  disabled={saving}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-slate-300 hover:text-ink focus-ring disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {saving ? (
                    <>
                      <LoaderIcon className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4" /> Save Attendance
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TeacherShell>
  );
}
