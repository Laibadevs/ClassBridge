'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import TeacherShell from './TeacherShell';
import StudentGradesSection from './StudentGradesSection';
import { SearchIcon, UsersIcon, ChevronRightIcon } from '@/components/icons';
import { teacherApi, type TeacherStudentListItem } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export default function GradesPage({ userName }: { userName: string }) {
  const [students, setStudents] = useState<TeacherStudentListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadSeq = useRef(0);
  useEffect(() => {
    const seq = ++loadSeq.current;
    teacherApi
      .listStudents()
      .then((rows) => {
        if (seq !== loadSeq.current) return;
        setStudents(rows);
        setSelectedId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch((err) => {
        if (seq !== loadSeq.current) return;
        setError(err instanceof ApiError ? err.message : "We couldn't load your students. Please try again.");
      });
  }, []);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => (students ?? []).filter((s) => !q || s.full_name.toLowerCase().includes(q)),
    [students, q]
  );
  const selected = (students ?? []).find((s) => s.id === selectedId) ?? null;

  return (
    <TeacherShell userName={userName}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">Grades</h1>
        <p className="mt-1 text-ink-muted">Record and review assessments for each student.</p>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {students === null && !error ? (
        <p className="mt-6 text-sm text-ink-muted">Loading students…</p>
      ) : (students ?? []).length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
            <UsersIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">No students yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Add a student first — once they&apos;re on your roster, you can start recording assessments.
          </p>
          <Link
            href="/teacher/students"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-glowBlue transition-colors hover:bg-brand-blueDark focus-ring"
          >
            Add a student
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
          {/* Student picker */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card lg:h-fit">
            <div className="relative mb-2">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students…"
                aria-label="Search students"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/25"
              />
            </div>
            <ul className="max-h-[32rem] space-y-1 overflow-y-auto" role="listbox" aria-label="Students">
              {visible.map((s) => {
                const active = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelectedId(s.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors focus-ring ${
                        active ? 'bg-blue-50 text-brand-blue' : 'text-ink hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          active ? 'bg-brand-blue text-white' : 'bg-blue-50 text-brand-blue'
                        }`}
                      >
                        {initialsOf(s.full_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{s.full_name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {s.class_name ?? 'Unassigned'}
                          {s.average_grade !== null ? ` · ${Math.round(s.average_grade)}% avg` : ''}
                        </span>
                      </span>
                      {active && <ChevronRightIcon className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && <p className="px-2.5 py-4 text-sm text-ink-muted">No students match “{query}”.</p>}
            </ul>
          </div>

          {/* Selected student's gradebook */}
          <div>
            {selected ? (
              <StudentGradesSection studentId={selected.id} studentName={selected.full_name} />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
                <p className="text-sm text-ink-muted">Select a student to view or add assessments.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
