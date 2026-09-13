'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import TeacherShell from './TeacherShell';
import StudentDirectory from './StudentDirectory';
import AddStudentModal from './AddStudentModal';
import {
  UsersIcon,
  CalendarCheckIcon,
  TrendingUpIcon,
  AlertIcon,
  PlusIcon,
  SparklesIcon,
  ChevronRightIcon,
} from '@/components/icons';
import {
  attentionFrom,
  initialsOf,
  relativeTime,
  toDashboardStudent,
  STRONG_THRESHOLD,
  type DashboardStat,
  type StatTone,
} from '@/lib/teacher-dashboard-data';
import { teacherApi, type TeacherDashboardStats } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

const statIcons: Record<string, ReactNode> = {
  total: <UsersIcon className="h-5 w-5" />,
  attendance: <CalendarCheckIcon className="h-5 w-5" />,
  'doing-well': <TrendingUpIcon className="h-5 w-5" />,
  'needs-support': <AlertIcon className="h-5 w-5" />,
};

const toneClasses: Record<StatTone, string> = {
  blue: 'bg-blue-50 text-brand-blue',
  green: 'bg-emerald-50 text-brand-greenDark',
  amber: 'bg-amber-50 text-amber-600',
};

function StatCard({ stat }: { stat: DashboardStat }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[stat.tone]}`}>
          {statIcons[stat.id]}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-ink">{stat.value}</p>
      <p className="mt-1 text-sm font-medium text-ink">{stat.label}</p>
      <p className="text-xs text-ink-muted">{stat.hint}</p>
    </div>
  );
}

function AttentionPanel({ items }: { items: ReturnType<typeof attentionFrom> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="font-semibold text-ink">Students needing attention</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">No students currently need extra attention.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((s) => (
            <Link
              key={s.id}
              href={`/teacher/student/${s.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:border-amber-200 focus-ring"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-600">
                {s.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
                <p className="truncate text-xs text-ink-muted">{s.reason} needs a little extra attention</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-600">{s.value}%</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Link
        href="/teacher/students"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blueDark focus-ring rounded"
      >
        View all <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ClassPerformance({ subjects }: { subjects: TeacherDashboardStats['subject_performance'] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="font-semibold text-ink">Class performance</h3>
      {subjects.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Add grades for your students to see subject averages here.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {subjects.map((s) => {
            const value = Math.round(s.average_pct);
            const strong = value >= STRONG_THRESHOLD;
            return (
              <div key={s.subject}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{s.subject}</span>
                  <span className={strong ? 'font-semibold text-brand-greenDark' : 'font-semibold text-ink-muted'}>
                    {value}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${strong ? 'bg-gradient-to-r from-emerald-400 to-brand-green' : 'bg-gradient-to-r from-blue-400 to-brand-blue'}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentUpdates({ updates }: { updates: TeacherDashboardStats['recent_updates'] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="font-semibold text-ink">Recent AI updates</h3>
      {updates.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Generate a parent update from any student&apos;s profile to see it here.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {updates.map((u) => (
            <Link
              key={`${u.student_id}-${u.created_at}`}
              href={`/teacher/student/${u.student_id}`}
              className="flex items-center gap-3 rounded-lg focus-ring"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-brand-blue">
                {initialsOf(u.student_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{u.student_name}</p>
                <p className="truncate text-xs text-ink-muted">AI update generated</p>
              </div>
              <span className="shrink-0 text-xs text-ink-muted">{relativeTime(u.created_at)}</span>
            </Link>
          ))}
        </div>
      )}
      <Link
        href="/teacher/students"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blueDark focus-ring rounded"
      >
        View all students <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function TeacherDashboard({ userName }: { userName: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStat[]>([]);
  const [attention, setAttention] = useState<ReturnType<typeof attentionFrom>>([]);

  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const [roster, dashStats] = await Promise.all([teacherApi.listStudents(), teacherApi.getDashboardStats()]);
      if (seq !== loadSeq.current) return;

      const mapped = roster.map(toDashboardStudent);
      const totalAttendance = roster.filter((s) => s.attendance_rate !== null);
      const averageAttendance = totalAttendance.length
        ? Math.round(
            totalAttendance.reduce((sum, s) => sum + (s.attendance_rate ?? 0), 0) / totalAttendance.length
          )
        : null;
      const doingWell = mapped.filter((s) => s.status === 'doing-well').length;
      const needsSupport = mapped.filter((s) => s.status === 'needs-support').length;

      setDashboardStats([
        { id: 'total', label: 'Total Students', value: String(mapped.length), hint: 'Your class', tone: 'blue' },
        {
          id: 'attendance',
          label: 'Average Attendance',
          value: averageAttendance !== null ? `${averageAttendance}%` : '—',
          hint: 'Across all students',
          tone: 'green',
        },
        { id: 'doing-well', label: 'Doing Well', value: String(doingWell), hint: 'This class', tone: 'green' },
        {
          id: 'needs-support',
          label: 'Needs Some Support',
          value: String(needsSupport),
          hint: 'Extra attention',
          tone: 'amber',
        },
      ]);
      setAttention(attentionFrom(mapped));
      setStats(dashStats);
    } catch {
      // Best-effort: an empty/failed dashboard still lets the teacher use
      // StudentDirectory and Add Student below, which fetch independently.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <TeacherShell userName={userName}>
          {/* Hero + primary actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">
                Good morning, {userName} 👋
              </h1>
              <p className="mt-1 text-ink-muted">Here&apos;s what&apos;s happening in your classroom today.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/teacher/students"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
              >
                <SparklesIcon className="h-4 w-4 text-brand-green" /> Generate Parent Update
              </Link>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring"
              >
                <PlusIcon className="h-4 w-4" /> Add Student Data
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardStats.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>

          {/* Content grid */}
          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <StudentDirectory refreshKey={refreshKey} />
            </div>
            <aside className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-1">
              <AttentionPanel items={attention} />
              <ClassPerformance subjects={stats?.subject_performance ?? []} />
              <RecentUpdates updates={stats?.recent_updates ?? []} />
            </aside>
          </div>

          <AddStudentModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onCreated={() => setRefreshKey((k) => k + 1)}
            teacherName={userName}
          />
    </TeacherShell>
  );
}
