'use client';

/**
 * Per-student progress overview. Everything here is computed in the browser
 * from the same real records the rest of the app uses (grades, attendance,
 * notes, parent updates) — nothing is invented, and a metric with too little
 * data says "Not enough data yet" instead of showing a made-up number.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';
import { BarChartIcon, CalendarCheckIcon, ChevronRightIcon, MessageIcon, SearchIcon } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { announceNoteChange, onNoteChange } from '@/lib/note-events';
import { parentUpdateApi, type ParentUpdate } from '@/lib/parent-update-api';
import {
  teacherApi,
  type TeacherAttendance,
  type TeacherGrade,
  type TeacherNote,
  type TeacherStudentListItem,
} from '@/lib/teacher-api';
import AddNoteButton from './AddNoteButton';
import AddNoteModal from './AddNoteModal';
import NoteDetailModal from './NoteDetailModal';
import { NoteCard } from './StudentNotesSection';
import UpdateStatusBadge, { LANGUAGE_LABEL } from './UpdateStatusBadge';

const NOT_ENOUGH = 'Not enough data yet';

interface StudentData {
  grades: TeacherGrade[];
  attendance: TeacherAttendance[];
  notes: TeacherNote[];
  updates: ParentUpdate[];
}

function pct(g: TeacherGrade): number {
  return (Number(g.score) / Number(g.max_score)) * 100;
}

function shortDate(iso: string): string {
  // Dates like "2026-09-01" are calendar days, not instants — parse as local.
  const value = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Metric({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      {value ? (
        <p className="mt-0.5 text-2xl font-bold text-ink">{value}</p>
      ) : (
        <p className="mt-1 text-sm font-medium text-ink-muted">{NOT_ENOUGH}</p>
      )}
      {hint && value && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/** Tiny dependency-free line chart of a subject's percentages over time. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const step = w / (values.length - 1);
  // Scaled to this subject's own range (never less than a 20-point span, so
  // a small wobble doesn't look dramatic). The exact percentages are always
  // printed next to the chart.
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(20, max - min);
  const lo = (min + max) / 2 - span / 2;
  const y = (v: number) => h - 3 - ((v - lo) / span) * (h - 6);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-28 shrink-0" role="img" aria-label="Score trend chart">
      <polyline points={points} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={y(v)} r="2.5" fill={i === values.length - 1 ? '#16A34A' : '#2563EB'} />
      ))}
    </svg>
  );
}

const ATTENDANCE_DOT: Record<string, string> = {
  present: 'bg-brand-green',
  late: 'bg-amber-400',
  absent: 'bg-red-500',
};

export default function TeacherProgress({
  teacherName,
  initialStudentId,
}: {
  teacherName: string;
  initialStudentId?: string;
}) {
  const [students, setStudents] = useState<TeacherStudentListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(initialStudentId ?? '');
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openNote, setOpenNote] = useState<TeacherNote | null>(null);
  const [editingNote, setEditingNote] = useState<TeacherNote | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const closeDetail = useCallback(() => setOpenNote(null), []);
  const closeEditor = useCallback(() => setEditingNote(null), []);

  useEffect(() => {
    teacherApi
      .listStudents()
      .then(setStudents)
      .catch((err) => setListError(err instanceof ApiError ? err.message : 'Could not load your students.'));
  }, []);

  const loadSeq = useRef(0);
  useEffect(() => {
    if (!selectedId) {
      setData(null);
      return;
    }
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    Promise.all([
      teacherApi.listGrades(selectedId),
      teacherApi.listAttendance(selectedId),
      teacherApi.listNotes(selectedId),
      parentUpdateApi.list(selectedId),
    ])
      .then(([grades, attendance, notes, updates]) => {
        if (seq === loadSeq.current) setData({ grades, attendance, notes, updates });
      })
      .catch((err) => {
        if (seq === loadSeq.current) {
          setData(null);
          setError(err instanceof ApiError ? err.message : 'Could not load this student’s progress.');
        }
      })
      .finally(() => {
        if (seq === loadSeq.current) setLoading(false);
      });
  }, [selectedId]);

  // Notes added/edited/deleted anywhere on this page update the list live.
  useEffect(
    () =>
      onNoteChange((change) => {
        setData((current) => {
          if (!current) return current;
          if (change.type === 'saved' && change.note.student_id === selectedId) {
            return { ...current, notes: [change.note, ...current.notes.filter((n) => n.id !== change.note.id)] };
          }
          if (change.type === 'deleted' && change.studentId === selectedId) {
            return { ...current, notes: current.notes.filter((n) => n.id !== change.noteId) };
          }
          return current;
        });
      }),
    [selectedId]
  );

  const selected = students?.find((s) => s.id === selectedId) ?? null;
  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (students ?? []).filter(
      (s) => s.id === selectedId || !q || s.full_name.toLowerCase().includes(q) || (s.class_name ?? '').toLowerCase().includes(q)
    );
  }, [students, query, selectedId]);

  const summary = useMemo(() => {
    if (!data) return null;
    const grades = [...data.grades].sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));
    const percentages = grades.map(pct);
    const attendance = [...data.attendance].sort((a, b) => a.date.localeCompare(b.date));
    const count = (status: string) => attendance.filter((a) => a.status === status).length;
    const attended = count('present') + count('late');
    const bySubject = new Map<string, TeacherGrade[]>();
    grades.forEach((g) => bySubject.set(g.subject, [...(bySubject.get(g.subject) ?? []), g]));
    return {
      grades,
      average: percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : null,
      recent: grades.length ? { pct: Math.round(pct(grades[grades.length - 1])), subject: grades[grades.length - 1].subject } : null,
      assessments: grades.length,
      attendance,
      present: count('present'),
      late: count('late'),
      absent: count('absent'),
      attendanceRate: attendance.length ? Math.round((attended / attendance.length) * 100) : null,
      recentAttendance: attendance.slice(-14),
      subjects: Array.from(bySubject.entries()).sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [data]);

  const recentNotes = useMemo(
    () =>
      [...(data?.notes ?? [])]
        .sort((a, b) => (b.note_date ?? b.created_at.slice(0, 10)).localeCompare(a.note_date ?? a.created_at.slice(0, 10)) || b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [data]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Student Progress</h1>
        <p className="mt-1 text-sm text-ink-muted">A factual overview of one student’s grades, attendance and notes.</p>
      </div>

      <Card>
        <label htmlFor="progress-student" className="mb-1.5 block text-sm font-medium text-ink">
          Select Student
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-72">
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
          <select
            id="progress-student"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25 sm:flex-1"
          >
            <option value="">{students === null ? 'Loading students…' : 'Choose a student'}</option>
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.class_name ? ` — ${s.class_name}` : ''}
              </option>
            ))}
          </select>
        </div>
        {listError && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {listError}
          </p>
        )}
        {students !== null && students.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            You have no students yet. <Link href="/teacher/students" className="font-semibold text-brand-blue">Add your first student</Link>.
          </p>
        )}
      </Card>

      {!selectedId && students !== null && students.length > 0 && (
        <Card className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
            <BarChartIcon className="h-6 w-6" />
          </span>
          <p className="mt-3 font-semibold text-ink">Pick a student to see their progress</p>
          <p className="mt-1 text-sm text-ink-muted">Grades, attendance, notes and parent updates appear here.</p>
        </Card>
      )}

      {selectedId && loading && <p className="text-sm text-ink-muted">Loading progress…</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {selected && data && summary && !loading && (
        <>
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">{selected.full_name}</h2>
                <p className="text-sm text-ink-muted">
                  {[selected.grade_level, selected.class_name, selected.section ? `Section ${selected.section}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'No class recorded'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AddNoteButton student={{ id: selected.id, name: selected.full_name }} variant="compact" label="Add Note" />
                <Link
                  href={`/teacher/student/${selected.id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
                >
                  Open profile <ChevronRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="mb-3 text-lg font-bold text-ink">
              Progress Summary
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Average score" value={summary.average !== null ? `${summary.average}%` : null} hint="Across all assessments" />
              <Metric
                label="Most recent score"
                value={summary.recent ? `${summary.recent.pct}%` : null}
                hint={summary.recent?.subject}
              />
              <Metric label="Assessments" value={summary.assessments ? String(summary.assessments) : null} />
              <Metric
                label="Attendance"
                value={summary.attendanceRate !== null ? `${summary.attendanceRate}%` : null}
                hint={`${summary.attendance.length} days recorded`}
              />
            </div>
          </section>

          {/* Subject progress */}
          <Card>
            <h2 className="mb-3 text-lg font-bold text-ink">Subject Progress</h2>
            {summary.subjects.length === 0 ? (
              <p className="text-sm text-ink-muted">{NOT_ENOUGH} — no grades have been recorded for this student.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {summary.subjects.map(([subject, rows]) => {
                  const values = rows.map(pct);
                  const shown = values.slice(-6).map((v) => `${Math.round(v)}%`);
                  return (
                    <li key={subject} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{subject}</p>
                        <p className="break-words text-sm text-ink-muted">{shown.join(' → ')}</p>
                        {values.length < 2 && <p className="text-xs text-ink-muted">Only one assessment so far — no trend yet.</p>}
                      </div>
                      <Sparkline values={values.slice(-6)} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Academic progress list */}
          <Card>
            <h2 className="mb-3 text-lg font-bold text-ink">Academic Progress</h2>
            {summary.grades.length === 0 ? (
              <p className="text-sm text-ink-muted">No assessments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {[...summary.grades].reverse().map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {g.subject}
                        {g.assessment_name ? <span className="font-normal text-ink-muted"> · {g.assessment_name}</span> : null}
                      </p>
                      <p className="text-xs text-ink-muted">{shortDate(g.assessment_date)}</p>
                    </div>
                    <p className="font-semibold text-ink">
                      {Number(g.score)}/{Number(g.max_score)} <span className="text-brand-blue">({Math.round(pct(g))}%)</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Attendance */}
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-brand-greenDark">
                <CalendarCheckIcon className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-ink">Attendance</h2>
            </div>
            {summary.attendance.length === 0 ? (
              <p className="text-sm text-ink-muted">{NOT_ENOUGH} — no attendance has been recorded.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-emerald-50 py-3">
                    <p className="text-2xl font-bold text-brand-greenDark">{summary.present}</p>
                    <p className="text-xs text-ink-muted">Present</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 py-3">
                    <p className="text-2xl font-bold text-amber-700">{summary.late}</p>
                    <p className="text-xs text-ink-muted">Late</p>
                  </div>
                  <div className="rounded-xl bg-red-50 py-3">
                    <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                    <p className="text-xs text-ink-muted">Absent</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink">
                  <span className="font-semibold">{summary.attendanceRate}%</span> attendance (present and late count as attended).
                </p>
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-ink-muted">Last {summary.recentAttendance.length} recorded days (oldest → newest)</p>
                  <div className="flex flex-wrap gap-1.5" role="list" aria-label="Recent attendance">
                    {summary.recentAttendance.map((a) => (
                      <span
                        key={a.id}
                        role="listitem"
                        title={`${shortDate(a.date)}: ${a.status}`}
                        aria-label={`${shortDate(a.date)}: ${a.status}`}
                        className={`h-4 w-4 rounded-full ${ATTENDANCE_DOT[a.status] ?? 'bg-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Recent notes */}
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-ink">Recent Teacher Notes</h2>
              <Link
                href={`/teacher/student/${selected.id}#teacher-notes`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:text-brand-blueDark focus-ring rounded"
              >
                View all notes <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>
            {recentNotes.length === 0 ? (
              <p className="text-sm text-ink-muted">No notes recorded yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {recentNotes.map((n) => (
                  <li key={n.id}>
                    <NoteCard note={n} teacherName={teacherName} onOpen={setOpenNote} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Parent updates */}
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
                  <MessageIcon className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-bold text-ink">Recent Parent Updates</h2>
              </div>
              <Link
                href={`/teacher/updates?student=${selected.id}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:text-brand-blueDark focus-ring rounded"
              >
                All updates <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>
            {data.updates.length === 0 ? (
              <p className="text-sm text-ink-muted">No parent updates yet for {selected.full_name}.</p>
            ) : (
              <ul className="space-y-2">
                {data.updates.slice(0, 5).map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/teacher/student/${selected.id}/generate-update?update=${u.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 transition-colors hover:border-brand-blue/40 hover:bg-blue-50/40 focus-ring"
                    >
                      <span className="text-sm font-medium text-ink">{shortDate(u.created_at)}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-ink-muted">{LANGUAGE_LABEL[selected.preferred_language ?? 'english']}</span>
                        <UpdateStatusBadge status={u.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <NoteDetailModal
        note={openNote}
        teacherName={teacherName}
        onClose={closeDetail}
        onEdit={(note) => {
          setOpenNote(null);
          setEditingNote(note);
        }}
        onDeleted={(note) => {
          announceNoteChange({ type: 'deleted', studentId: note.student_id, noteId: note.id });
          setOpenNote(null);
          setToast('Note deleted');
        }}
      />
      {selected && (
        <AddNoteModal
          open={!!editingNote}
          student={{ id: selected.id, name: selected.full_name }}
          note={editingNote}
          onClose={closeEditor}
          onSaved={(note) => {
            announceNoteChange({ type: 'saved', note });
            setToast('Note updated');
          }}
        />
      )}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
