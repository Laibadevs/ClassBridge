'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CloseIcon } from '@/components/icons';
import { teacherApi, type TeacherGrade } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25';

function Field({ id, label, optional, children }: { id: string; label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label} {optional && <span className="font-normal text-ink-muted">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Shared create/edit form for an assessment — used by both the student
 * detail page's Grades section and the standalone Grades gradebook page, so
 * "add assessment" and "edit assessment" never drift into two behaviors. */
export default function GradeFormModal({
  open,
  onClose,
  onSaved,
  studentId,
  studentName,
  grade,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (grade: TeacherGrade) => void;
  studentId: string;
  studentName: string;
  /** Present = editing that assessment; absent = creating a new one. */
  grade?: TeacherGrade;
}) {
  const isEdit = Boolean(grade);
  const [subject, setSubject] = useState('');
  const [assessmentName, setAssessmentName] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubject(grade?.subject ?? '');
    setAssessmentName(grade?.assessment_name ?? '');
    setScore(grade?.score ?? '');
    setMaxScore(grade?.max_score ?? '');
    setAssessmentDate(grade?.assessment_date ?? todayIso());
    setNotes(grade?.notes ?? '');
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, grade, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const scoreNum = Number(score);
    const maxNum = Number(maxScore);
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!assessmentDate) {
      setError('Assessment date is required.');
      return;
    }
    if (score.trim() === '' || Number.isNaN(scoreNum) || scoreNum < 0) {
      setError('Enter a valid score (0 or greater).');
      return;
    }
    if (maxScore.trim() === '' || Number.isNaN(maxNum) || maxNum <= 0) {
      setError('Enter a valid maximum score (greater than 0).');
      return;
    }
    if (scoreNum > maxNum) {
      setError('Score cannot exceed the maximum score.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        subject: subject.trim(),
        assessment_name: assessmentName.trim() || null,
        score: scoreNum,
        max_score: maxNum,
        assessment_date: assessmentDate,
        notes: notes.trim() || null,
      };
      const saved = isEdit
        ? await teacherApi.updateGrade(studentId, grade!.id, payload)
        : await teacherApi.addGrade(studentId, payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grade-form-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-premium sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="grade-form-title" className="text-xl font-bold text-ink">
              {isEdit ? 'Edit Assessment' : 'Add Assessment'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">For {studentName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-ring"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field id="grade-subject" label="Subject">
            <input
              id="grade-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              className={inputClasses}
            />
          </Field>
          <Field id="grade-assessment-name" label="Assessment name" optional>
            <input
              id="grade-assessment-name"
              type="text"
              value={assessmentName}
              onChange={(e) => setAssessmentName(e.target.value)}
              placeholder="e.g. Algebra Quiz"
              className={inputClasses}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="grade-score" label="Score">
              <input
                id="grade-score"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field id="grade-max-score" label="Maximum score">
              <input
                id="grade-max-score"
                type="number"
                inputMode="decimal"
                min={0.01}
                step="0.01"
                required
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className={inputClasses}
              />
            </Field>
          </div>
          <Field id="grade-date" label="Assessment date">
            <input
              id="grade-date"
              type="date"
              required
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field id="grade-notes" label="Note" optional>
            <textarea
              id="grade-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context for this assessment"
              className={`${inputClasses} resize-none`}
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:opacity-60"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
