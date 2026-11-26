'use client';

import { useRef, useState } from 'react';
import { CloseIcon, EditIcon, TrashIcon } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { NOTE_CATEGORIES, teacherApi, type TeacherNote } from '@/lib/teacher-api';
import ConfirmDialog from './ConfirmDialog';
import { useModalA11y } from './useModalA11y';

export function noteCategoryLabel(category: TeacherNote['category']): string | null {
  return NOTE_CATEGORIES.find((c) => c.value === category)?.label ?? null;
}

/** The date a note is about; older notes without one fall back to when they were written. */
export function noteDisplayDate(note: TeacherNote): string {
  const value = note.note_date ? `${note.note_date}T00:00:00` : note.created_at;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NoteDetailModal({
  note,
  teacherName,
  onClose,
  onEdit,
  onDeleted,
}: {
  note: TeacherNote | null;
  teacherName: string;
  onClose: () => void;
  onEdit: (note: TeacherNote) => void;
  onDeleted: (note: TeacherNote) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The confirm dialog is its own modal layered on top; only trap focus here
  // while it isn't showing.
  useModalA11y(!!note && !confirmOpen, onClose, dialogRef);

  if (!note) return null;
  const category = noteCategoryLabel(note.category);
  const edited = note.updated_at && new Date(note.updated_at).getTime() - new Date(note.created_at).getTime() > 1000;

  async function confirmDelete() {
    if (!note) return;
    setDeleting(true);
    setError(null);
    try {
      await teacherApi.deleteNote(note.student_id, note.id);
      onDeleted(note);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the note. Please try again.');
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-detail-title"
        className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-premium sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="note-detail-title" className="text-lg font-bold text-ink">
              Note Details
            </h2>
            {category && (
              <span className="mt-1.5 inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-brand-blue">
                {category}
              </span>
            )}
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

        <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-[0.95rem] leading-relaxed text-ink">
          {note.note}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Date</dt>
            <dd className="font-medium text-ink">{noteDisplayDate(note)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Teacher</dt>
            <dd className="font-medium text-ink">{teacherName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Created</dt>
            <dd className="font-medium text-ink">{formatDateTime(note.created_at)}</dd>
          </div>
          {edited && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Last updated</dt>
              <dd className="font-medium text-ink">{formatDateTime(note.updated_at)}</dd>
            </div>
          )}
        </dl>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 focus-ring"
          >
            <TrashIcon className="h-4 w-4" /> Delete Note
          </button>
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring"
          >
            <EditIcon className="h-4 w-4" /> Edit Note
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this note?"
        message="This observation will be permanently removed. This cannot be undone."
        confirmLabel="Delete Note"
        busyLabel="Deleting…"
        busy={deleting}
        error={null}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
