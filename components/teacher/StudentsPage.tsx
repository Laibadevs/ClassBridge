'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import TeacherShell from './TeacherShell';
import AddStudentModal from './AddStudentModal';
import {
  SearchIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MoreVerticalIcon,
  UsersIcon,
  TrendingUpIcon,
  AlertIcon,
  UserIcon,
  NoteIcon,
  BarChartIcon,
  SparklesIcon,
} from '@/components/icons';
import type { DashboardStudent, StudentStatus, StatTone } from '@/lib/teacher-dashboard-data';
import { toDashboardStudent } from '@/lib/teacher-dashboard-data';
import { teacherApi } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

type StatusFilter = 'all' | StudentStatus;
type SortKey = 'recent' | 'name' | 'grade' | 'attendance';

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All Students' },
  { id: 'doing-well', label: 'Doing Well' },
  { id: 'needs-support', label: 'Needs Support' },
];

const sortOptions: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Recently Updated' },
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'grade', label: 'Highest Average' },
  { id: 'attendance', label: 'Best Attendance' },
];

const summaryTone: Record<StatTone, { ring: string; icon: string; badge: string }> = {
  blue: { ring: 'border-slate-200', icon: 'bg-blue-50 text-brand-blue', badge: 'text-brand-blue' },
  green: { ring: 'border-slate-200', icon: 'bg-emerald-50 text-brand-greenDark', badge: 'text-brand-greenDark' },
  amber: { ring: 'border-slate-200', icon: 'bg-amber-50 text-amber-600', badge: 'text-amber-600' },
};

const summaryIcons: Record<string, React.ReactNode> = {
  total: <UsersIcon className="h-5 w-5" />,
  'doing-well': <TrendingUpIcon className="h-5 w-5" />,
  'needs-support': <AlertIcon className="h-5 w-5" />,
};

function StatusBadge({ status }: { status: StudentStatus }) {
  const map: Record<StudentStatus, { label: string; classes: string; dot: string }> = {
    'doing-well': { label: 'Doing well', classes: 'bg-emerald-50 text-brand-greenDark', dot: 'bg-brand-green' },
    'needs-support': { label: 'Needs some support', classes: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function Avatar({ student, size = 'md' }: { student: DashboardStudent; size?: 'md' | 'lg' }) {
  const tint =
    student.status === 'doing-well' ? 'bg-emerald-50 text-brand-greenDark' : 'bg-blue-50 text-brand-blue';
  const dim = size === 'lg' ? 'h-11 w-11 text-sm' : 'h-10 w-10 text-sm';
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-bold ${tint} ${dim}`}>
      {student.initials}
    </span>
  );
}

function ProgressCell({ student }: { student: DashboardStudent }) {
  const bar =
    student.progress === 'Improving'
      ? 'from-emerald-400 to-brand-green'
      : student.progress === 'Needs support'
        ? 'from-amber-300 to-amber-400'
        : 'from-blue-400 to-brand-blue';
  const label =
    student.progress === 'Improving'
      ? 'text-brand-greenDark'
      : student.progress === 'Needs support'
        ? 'text-amber-700'
        : 'text-brand-blue';
  return (
    <div className="w-32">
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-xs font-semibold ${label}`}>{student.progress}</span>
        <span className="text-xs text-ink-muted">{student.averageGrade}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${bar}`} style={{ width: `${student.averageGrade}%` }} />
      </div>
    </div>
  );
}

function RowMenu({ student }: { student: DashboardStudent }) {
  const [open, setOpen] = useState(false);
  const items = [
    { label: 'View Profile', icon: UserIcon, href: `/teacher/student/${student.id}` },
    { label: 'Add Note', icon: NoteIcon, href: `/teacher/student/${student.id}` },
    { label: 'View Progress', icon: BarChartIcon, href: `/teacher/student/${student.id}` },
    { label: 'Generate Update', icon: SparklesIcon, href: `/teacher/student/${student.id}/generate-update` },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Actions for ${student.name}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-ring"
      >
        <MoreVerticalIcon className="h-5 w-5" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-elevated">
            {items.map((item) => {
              const Icon = item.icon;
              const inner = (
                <>
                  <Icon className="h-4 w-4 text-ink-muted" />
                  {item.label}
                </>
              );
              const cls =
                'flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-ink transition-colors hover:bg-slate-50';
              return (
                <Link key={item.label} href={item.href} className={cls} onClick={() => setOpen(false)}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCards({ students }: { students: DashboardStudent[] }) {
  const summary: { id: string; label: string; value: string; tone: StatTone }[] = [
    { id: 'total', label: 'Total Students', value: String(students.length), tone: 'blue' },
    {
      id: 'doing-well',
      label: 'Doing Well',
      value: String(students.filter((s) => s.status === 'doing-well').length),
      tone: 'green',
    },
    {
      id: 'needs-support',
      label: 'Needs Some Support',
      value: String(students.filter((s) => s.status === 'needs-support').length),
      tone: 'amber',
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {summary.map((stat) => {
        const tone = summaryTone[stat.tone];
        return (
          <div
            key={stat.id}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone.icon}`}>
              {summaryIcons[stat.id]}
            </span>
            <div>
              <p className="text-2xl font-bold tracking-tight text-ink">{stat.value}</p>
              <p className="text-sm font-medium text-ink-muted">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
        <SearchIcon className="h-7 w-7" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-ink">No students found</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">Try changing your search or filters.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
      >
        Clear Filters
      </button>
    </div>
  );
}

function StudentsContent({ students }: { students: DashboardStudent[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [klass, setKlass] = useState('all');
  const [sort, setSort] = useState<SortKey>('recent');

  const classOptions = useMemo(() => Array.from(new Set(students.map((s) => s.className))), [students]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = students.filter((s) => {
      const matchesStatus = status === 'all' || s.status === status;
      const matchesClass = klass === 'all' || s.className === klass;
      const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
      return matchesStatus && matchesClass && matchesQuery;
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'grade':
          return b.averageGrade - a.averageGrade;
        case 'attendance':
          return b.attendance - a.attendance;
        default:
          return a.updatedRank - b.updatedRank;
      }
    });
    return sorted;
  }, [students, query, status, klass, sort]);

  const hasActiveFilters = query.trim() !== '' || status !== 'all' || klass !== 'all';
  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setKlass('all');
  };

  return (
    <div className="mb-1">
      {/* Toolbar */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative lg:max-w-md lg:flex-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students..."
              aria-label="Search students"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/25"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
            <SelectControl label="Class" value={klass} onChange={setKlass}>
              <option value="all">All Classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectControl>
            <SelectControl label="Sort" value={sort} onChange={(v) => setSort(v as SortKey)}>
              {sortOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </SelectControl>
          </div>
        </div>

        {/* Status filter pills (horizontally scrollable on mobile) */}
        <div className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by status">
          {statusFilters.map((f) => {
            const active = status === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(f.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all focus-ring ${
                  active
                    ? 'bg-brand-blue text-white shadow-elevated'
                    : 'border border-slate-200 bg-white text-ink-muted hover:border-brand-blue/40 hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState onClear={clearFilters} />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3.5 font-semibold">Student</th>
                  <th className="px-5 py-3.5 font-semibold">Class</th>
                  <th className="px-5 py-3.5 font-semibold">Attendance</th>
                  <th className="px-5 py-3.5 font-semibold">Avg. Grade</th>
                  <th className="px-5 py-3.5 font-semibold">Progress</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Last Update</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-blue-50/40">
                    <td className="px-5 py-4">
                      <Link
                        href={`/teacher/student/${s.id}`}
                        className="group flex items-center gap-3 rounded-lg focus-ring"
                      >
                        <Avatar student={s} />
                        <span className="font-semibold text-ink transition-colors group-hover:text-brand-blue">
                          {s.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-ink-muted">{s.className}</td>
                    <td className="px-5 py-4 font-medium text-ink">{s.attendance}%</td>
                    <td className="px-5 py-4 font-medium text-ink">{s.averageGrade}%</td>
                    <td className="px-5 py-4">
                      <ProgressCell student={s} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-4 text-ink-muted">{s.lastUpdate}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/teacher/student/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 focus-ring"
                        >
                          View Student <ChevronRightIcon className="h-4 w-4" />
                        </Link>
                        <RowMenu student={s} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {rows.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <Avatar student={s} size="lg" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/teacher/student/${s.id}`}
                      className="truncate font-semibold text-ink focus-ring rounded hover:text-brand-blue"
                    >
                      {s.name}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">{s.className} · Updated {s.lastUpdate.toLowerCase()}</p>
                  </div>
                  <RowMenu student={s} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge status={s.status} />
                  <div className="flex gap-4 text-xs text-ink-muted">
                    <span>
                      Attendance <span className="font-semibold text-ink">{s.attendance}%</span>
                    </span>
                    <span>
                      Average <span className="font-semibold text-ink">{s.averageGrade}%</span>
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressCell student={s} />
                </div>
                <Link
                  href={`/teacher/student/${s.id}`}
                  className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark focus-ring"
                >
                  View Student <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {hasActiveFilters && rows.length > 0 && (
        <p className="mt-4 text-sm text-ink-muted">
          Showing {rows.length} of {students.length} students
        </p>
      )}
    </div>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm font-medium text-ink shadow-card outline-none transition hover:border-brand-blue/40 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 h-4 w-4 text-ink-muted" />
    </label>
  );
}

export default function StudentsPage({ userName }: { userName: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [students, setStudents] = useState<DashboardStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * React 18 Strict Mode double-invokes this effect on mount in dev, firing
   * two overlapping requests — and network resolution order isn't
   * guaranteed to match call order. Without a guard, a slow response from
   * an earlier call (e.g. the initial mount fetch) can land *after* a
   * later one (e.g. the refetch right after creating a student) and
   * silently overwrite fresher data with stale data. This sequence
   * counter ensures only the most recently *initiated* call is ever
   * allowed to update state.
   */
  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const data = await teacherApi.listStudents();
      if (seq !== loadSeq.current) return;
      setStudents(data.map(toDashboardStudent));
      setError(null);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(err instanceof ApiError ? err.message : 'Could not load students. Please try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <TeacherShell userName={userName}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">Students</h1>
          <p className="mt-1 text-ink-muted">View and manage your students&apos; classroom progress.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-full bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring sm:self-auto"
        >
          <PlusIcon className="h-4 w-4" /> Add Student
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {students === null && !error ? (
        <p className="mt-6 text-sm text-ink-muted">Loading students…</p>
      ) : (
        <>
          <SummaryCards students={students ?? []} />
          <StudentsContent students={students ?? []} />
        </>
      )}

      <AddStudentModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} teacherName={userName} />
    </TeacherShell>
  );
}
