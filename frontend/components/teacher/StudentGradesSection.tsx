'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import { BarChartIcon, EditIcon, TrashIcon, PlusIcon } from '@/components/icons';
import GradeFormModal from './GradeFormModal';
import ConfirmDialog from './ConfirmDialog';
import { teacherApi, type TeacherGrade } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

function pct(score: string, maxScore: string): number {
  const s = Number(score);
  const m = Number(maxScore);
  return m > 0 ? Math.round((s / m) * 100) : 0;
}

/** "75", "75.5" — never the raw "75.00" the API's Decimal serializes as. */
function formatNumber(value: string): string {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StudentGradesSection({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [grades, setGrades] = useState<TeacherGrade[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<TeacherGrade | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<TeacherGrade | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadSeq = useRef(0);
  useEffect(() => {
    const seq = ++loadSeq.current;
    teacherApi
      .listGrades(studentId)
      .then((rows) => {
        if (seq !== loadSeq.current) return;
        setGrades(rows);
      })
      .catch((err) => {
        if (seq !== loadSeq.current) return;
        setError(err instanceof ApiError ? err.message : 'Could not load assessments.');
      });
  }, [studentId]);

  const subjectAverages = useMemo(() => {
    const bySubject = new Map<string, number[]>();
    for (const g of grades ?? []) {
      const list = bySubject.get(g.subject) ?? [];
      list.push(pct(g.score, g.max_score));
      bySubject.set(g.subject, list);
    }
    return Array.from(bySubject.entries())
      .map(([subject, pcts]) => ({ subject, average: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) }))
      .sort((a, b) => b.average - a.average);
  }, [grades]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await teacherApi.deleteGrade(studentId, deleteTarget.id);
      setGrades((current) => (current ?? []).filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete the assessment. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
            <BarChartIcon className="h-4 w-4" />
          </span>
          <h2 className="font-semibold text-ink">Grades</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingGrade(undefined);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Add assessment
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {grades === null && !error ? (
        <p className="text-sm text-ink-muted">Loading assessments…</p>
      ) : (grades ?? []).length === 0 ? (
        <p className="text-sm text-ink-muted">No assessments recorded yet.</p>
      ) : (
        <>
          {subjectAverages.length > 1 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {subjectAverages.map((s) => (
                <div key={s.subject} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="truncate text-xs text-ink-muted">{s.subject}</p>
                  <p className="text-lg font-bold text-ink">{s.average}%</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {(grades ?? []).map((g) => {
              const percentage = pct(g.score, g.max_score);
              return (
                <div
                  key={g.id}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-ink">{g.assessment_name || g.subject}</p>
                      <span
                        className={`shrink-0 text-sm font-bold ${percentage >= 65 ? 'text-brand-greenDark' : 'text-amber-600'}`}
                      >
                        {percentage}%
                      </span>
                    </div>
                    <p className="truncate text-xs text-ink-muted">
                      {g.subject} · {formatNumber(g.score)}/{formatNumber(g.max_score)} · {formatDate(g.assessment_date)}
                    </p>
                    {g.notes && <p className="mt-1 truncate text-xs text-ink-muted italic">{g.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGrade(g);
                        setFormOpen(true);
                      }}
                      aria-label={`Edit ${g.assessment_name || g.subject}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-white hover:text-brand-blue focus-ring"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(g)}
                      aria-label={`Delete ${g.assessment_name || g.subject}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-white hover:text-red-600 focus-ring"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <GradeFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        studentId={studentId}
        studentName={studentName}
        grade={editingGrade}
        onSaved={(saved) =>
          setGrades((current) => {
            const list = current ?? [];
            const exists = list.some((g) => g.id === saved.id);
            const next = exists ? list.map((g) => (g.id === saved.id ? saved : g)) : [saved, ...list];
            return [...next].sort((a, b) => b.assessment_date.localeCompare(a.assessment_date));
          })
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this assessment?"
        message={`"${deleteTarget?.assessment_name || deleteTarget?.subject}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete Assessment"
        busyLabel="Deleting…"
        busy={deleting}
        error={deleteError}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
