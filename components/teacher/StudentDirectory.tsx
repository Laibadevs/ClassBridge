'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SearchIcon, ChevronRightIcon } from '@/components/icons';
import { toDashboardStudent, type DashboardStudent, type StudentStatus } from '@/lib/teacher-dashboard-data';
import { teacherApi } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

type Filter = 'all' | StudentStatus;

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'doing-well', label: 'Doing Well' },
  { id: 'needs-support', label: 'Needs Support' },
];

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

function progressClasses(progress: string) {
  if (progress === 'Improving') return 'text-brand-greenDark';
  if (progress === 'Needs support') return 'text-amber-700';
  return 'text-ink-muted';
}

export default function StudentDirectory({ refreshKey }: { refreshKey?: number }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [students, setStudents] = useState<DashboardStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [load, refreshKey]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (students ?? []).filter((s) => {
      const matchesFilter = filter === 'all' || s.status === filter;
      const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [students, query, filter]);

  return (
    <section id="students">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">Your Students</h2>
          <p className="mt-1 text-sm text-ink-muted">Monitor progress and create meaningful parent updates.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/students"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blueDark focus-ring rounded"
          >
            View all <ChevronRightIcon className="h-4 w-4" />
          </Link>
          <div className="relative sm:w-64">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students…"
            aria-label="Search students"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25"
          />
        </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-4 inline-flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Filter students">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all focus-ring ${
                active ? 'bg-white text-brand-blue shadow-elevated' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {students === null && !error ? (
        <p className="mt-4 text-sm text-ink-muted">Loading students…</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3.5 font-semibold">Student</th>
                  <th className="px-5 py-3.5 font-semibold">Attendance</th>
                  <th className="px-5 py-3.5 font-semibold">Average Grade</th>
                  <th className="px-5 py-3.5 font-semibold">Progress</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-blue-50/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-brand-blue">
                          {s.initials}
                        </span>
                        <div>
                          <p className="font-semibold text-ink">{s.name}</p>
                          <p className="text-xs text-ink-muted">{s.className}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-ink">{s.attendance}%</td>
                    <td className="px-5 py-4 font-medium text-ink">{s.averageGrade}%</td>
                    <td className={`px-5 py-4 font-medium ${progressClasses(s.progress)}`}>{s.progress}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/teacher/student/${s.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 focus-ring"
                      >
                        View <ChevronRightIcon className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-ink-muted">
                {students?.length ? 'No students match your search.' : 'No students yet — add your first one above.'}
              </p>
            )}
          </div>

          {/* Mobile cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {rows.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-brand-blue">
                    {s.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{s.name}</p>
                    <p className="truncate text-xs text-ink-muted">{s.className}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 py-2">
                    <p className="text-xs text-ink-muted">Attendance</p>
                    <p className="font-semibold text-ink">{s.attendance}%</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 py-2">
                    <p className="text-xs text-ink-muted">Average</p>
                    <p className="font-semibold text-ink">{s.averageGrade}%</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 py-2">
                    <p className="text-xs text-ink-muted">Progress</p>
                    <p className={`font-semibold ${progressClasses(s.progress)}`}>{s.progress}</p>
                  </div>
                </div>
                <Link
                  href={`/teacher/student/${s.id}`}
                  className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark focus-ring"
                >
                  View student <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-muted">
                {students?.length ? 'No students match your search.' : 'No students yet — add your first one above.'}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
