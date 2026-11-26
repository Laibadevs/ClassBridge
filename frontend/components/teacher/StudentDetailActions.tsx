'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditIcon, ArchiveIcon } from '@/components/icons';
import EditStudentModal, { type EditableStudent } from './EditStudentModal';
import AddNoteButton from './AddNoteButton';
import { teacherApi } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

function ArchiveConfirmModal({
  open,
  onCancel,
  onConfirm,
  archiving,
  error,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  archiving: boolean;
  error: string | null;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="archive-student-title"
        className="relative z-10 w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-premium sm:rounded-3xl"
      >
        <h2 id="archive-student-title" className="text-lg font-bold text-ink">
          Are you sure you want to archive this student?
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Archived students will no longer appear in the active student list. Their attendance, grades and notes are
          kept.
        </p>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink focus-ring"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={archiving}
            aria-busy={archiving}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-red-700 focus-ring disabled:opacity-60"
          >
            {archiving ? 'Archiving…' : 'Archive Student'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentDetailActions({
  isActive,
  editable,
}: {
  isActive: boolean;
  editable: EditableStudent;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  async function handleArchive() {
    setArchiving(true);
    setArchiveError(null);
    try {
      await teacherApi.deleteStudent(editable.id);
      router.push('/teacher/students');
      router.refresh();
    } catch (err) {
      setArchiveError(err instanceof ApiError ? err.message : 'Could not archive the student. Please try again.');
      setArchiving(false);
    }
  }

  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-ink-muted">
        Archived
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <AddNoteButton student={{ id: editable.id, name: editable.fullName }} />
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
        >
          <EditIcon className="h-4 w-4" /> Edit
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-card transition-colors hover:border-red-300 hover:bg-red-50 focus-ring"
        >
          <ArchiveIcon className="h-4 w-4" /> Archive
        </button>
      </div>

      <EditStudentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdated={() => router.refresh()}
        student={editable}
      />
      <ArchiveConfirmModal
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setArchiveError(null);
        }}
        onConfirm={handleArchive}
        archiving={archiving}
        error={archiveError}
      />
    </>
  );
}
