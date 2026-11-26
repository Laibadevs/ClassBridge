'use client';

/**
 * The teacher's central Parent Updates list. It only lists and links: opening
 * an update (or creating one) goes to the existing per-student update page,
 * which owns generation, editing, approval, audio and WhatsApp sending. There
 * is no second editor here.
 *
 * The teacher's updates are fetched once (the API scopes them to the signed-in
 * teacher); student/status filters and text search then run in the browser, so
 * typing never triggers a request.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { ChevronRightIcon, CloseIcon, MessageIcon, PlusIcon, SearchIcon } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { parentUpdateApi, type ParentUpdateStatus, type TeacherUpdateListItem } from '@/lib/parent-update-api';
import { teacherApi, type TeacherStudentListItem } from '@/lib/teacher-api';
import UpdateStatusBadge, { LANGUAGE_LABEL } from './UpdateStatusBadge';
import { useModalA11y } from './useModalA11y';

type StatusFilter = 'all' | ParentUpdateStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'approved', label: 'Approved' },
  { id: 'sent', label: 'Sent' },
];

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CreateUpdateDialog({
  open,
  students,
  defaultStudentId,
  onClose,
}: {
  open: boolean;
  students: TeacherStudentListItem[];
  defaultStudentId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [studentId, setStudentId] = useState(defaultStudentId);
  const [error, setError] = useState<string | null>(null);
  useModalA11y(open, onClose, dialogRef);

  useEffect(() => {
    if (open) {
      setStudentId(defaultStudentId);
      setError(null);
    }
  }, [open, defaultStudentId]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-update-title"
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-5 shadow-premium sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="create-update-title" className="text-lg font-bold text-ink">
              Create Parent Update
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              Choose a student. The update is written from their real attendance, grades and notes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-ring"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!studentId) {
              setError('Please choose a student first.');
              return;
            }
            router.push(`/teacher/student/${studentId}/generate-update`);
          }}
        >
          <div>
            <label htmlFor="create-update-student" className="mb-1.5 block text-sm font-medium text-ink">
              Student
            </label>
            <select
              id="create-update-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={fieldClass}
              autoFocus
            >
              <option value="">Choose a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                  {s.class_name ? ` — ${s.class_name}` : ''}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeacherParentUpdates({ initialStudentId }: { initialStudentId?: string }) {
  const [updates, setUpdates] = useState<TeacherUpdateListItem[] | null>(null);
  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState(initialStudentId ?? '');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  useEffect(() => {
    Promise.all([parentUpdateApi.listAll(), teacherApi.listStudents()])
      .then(([u, s]) => {
        setUpdates(u);
        setStudents(s);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your parent updates.'));
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (updates ?? []).filter(
      (u) =>
        (!studentFilter || u.student_id === studentFilter) &&
        (status === 'all' || u.status === status) &&
        (!q || u.student_name.toLowerCase().includes(q) || u.preview.toLowerCase().includes(q))
    );
  }, [updates, studentFilter, status, query]);

  const counts = useMemo(() => {
    const scoped = (updates ?? []).filter((u) => !studentFilter || u.student_id === studentFilter);
    return {
      all: scoped.length,
      draft: scoped.filter((u) => u.status === 'draft').length,
      approved: scoped.filter((u) => u.status === 'approved').length,
      sent: scoped.filter((u) => u.status === 'sent').length,
    } satisfies Record<StatusFilter, number>;
  }, [updates, studentFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Parent Updates</h1>
          <p className="mt-1 text-sm text-ink-muted">Create, review and send progress updates to parents.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring"
        >
          <PlusIcon className="h-4 w-4" /> Create Update
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="updates-student-filter" className="mb-1.5 block text-sm font-medium text-ink">
            Student
          </label>
          <select
            id="updates-student-filter"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className={fieldClass}
          >
            <option value="">All Students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="updates-search" className="mb-1.5 block text-sm font-medium text-ink">
            Search
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="updates-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Student name or update text…"
              className={`${fieldClass} pl-10`}
            />
          </div>
        </div>
      </div>

      <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 sm:inline-flex" role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatus(f.id)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all focus-ring ${
                active ? 'bg-white text-brand-blue shadow-elevated' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {f.label} <span className="ml-0.5 text-xs font-medium opacity-70">{counts[f.id]}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {updates === null && !error ? (
        <p className="text-sm text-ink-muted">Loading updates…</p>
      ) : rows.length === 0 && !error ? (
        <Card className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
            <MessageIcon className="h-6 w-6" />
          </span>
          {(updates ?? []).length === 0 ? (
            <>
              <p className="mt-3 font-semibold text-ink">No parent updates yet</p>
              <p className="mt-1 text-sm text-ink-muted">Create your first update from a student’s real attendance, grades and notes.</p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated hover:bg-brand-blueDark focus-ring"
              >
                <PlusIcon className="h-4 w-4" /> Create Update
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 font-semibold text-ink">No updates match these filters</p>
              <p className="mt-1 text-sm text-ink-muted">Try another student, status or search.</p>
            </>
          )}
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((u) => (
            <li key={u.id}>
              <Link
                href={`/teacher/student/${u.student_id}/generate-update?update=${u.id}`}
                aria-label={`View ${u.status} update for ${u.student_name}`}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-cardHover focus-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{u.student_name}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(u.created_at)} · {LANGUAGE_LABEL[u.preferred_language ?? 'english']}
                    </p>
                  </div>
                  <UpdateStatusBadge status={u.status} />
                </div>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink">{u.preview}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-blue group-hover:text-brand-blueDark">
                  View Update <ChevronRightIcon className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateUpdateDialog open={createOpen} students={students} defaultStudentId={studentFilter} onClose={closeCreate} />
    </div>
  );
}
