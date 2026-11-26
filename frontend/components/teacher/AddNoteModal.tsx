'use client';

/**
 * THE note form — used to add a note from the student profile, the student
 * list and the notes section, and (with `note` set) to edit an existing one.
 * There is deliberately no second note form anywhere.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CloseIcon } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { NOTE_CATEGORIES, teacherApi, type NoteCategory, type TeacherNote } from '@/lib/teacher-api';
import { useModalA11y } from './useModalA11y';

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25';

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" is the teacher's today). */
function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export interface AddNoteModalProps {
  open: boolean;
  student: { id: string; name: string };
  /** When set, the modal edits this note instead of creating a new one. */
  note?: TeacherNote | null;
  onClose: () => void;
  /** Called with the saved note after the server confirmed it. */
  onSaved: (note: TeacherNote, mode: 'created' | 'updated') => void;
}

export default function AddNoteModal({ open, student, note = null, onClose, onSaved }: AddNoteModalProps) {
  const editing = !!note;
  const dialogRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<NoteCategory | ''>('');
  const [date, setDate] = useState(todayLocal());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalA11y(open, onClose, dialogRef);

  useEffect(() => {
    if (!open) return;
    setText(note?.note ?? '');
    setCategory(note?.category ?? '');
    setDate(note ? (note.note_date ?? note.created_at.slice(0, 10)) : todayLocal());
    setError(null);
    setBusy(false);
    submitting.current = false;
  }, [open, note]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return; // a double-click can't send two requests
    if (!text.trim()) {
      setError('Please write a note before saving.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const input = { note: text.trim(), category: category || null, note_date: date || null };
      const saved = editing
        ? await teacherApi.updateNote(student.id, note!.id, input)
        : await teacherApi.addNote(student.id, input);
      onSaved(saved, editing ? 'updated' : 'created');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the note. Please try again.');
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-modal-title"
        className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-premium sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="note-modal-title" className="text-lg font-bold text-ink">
              {editing ? 'Edit Note' : 'Add Note'}
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">For {student.name}. Only you can see teacher notes.</p>
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="note-text" className="mb-1.5 block text-sm font-medium text-ink">
              Note
            </label>
            <textarea
              id="note-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={4000}
              autoFocus
              placeholder="e.g. Participates well in class but needs more practice with algebraic equations."
              className={`${inputClasses} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="note-category" className="mb-1.5 block text-sm font-medium text-ink">
                Category <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <select
                id="note-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as NoteCategory | '')}
                className={inputClasses}
              >
                <option value="">No category</option>
                {NOTE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note-date" className="mb-1.5 block text-sm font-medium text-ink">
                Date <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="note-date"
                type="date"
                value={date}
                max={todayLocal()}
                onChange={(e) => setDate(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
