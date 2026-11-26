'use client';

/**
 * "+ Add Note" trigger. Opens the one shared AddNoteModal for the given
 * student; on save it announces the new note (so any visible notes list
 * updates immediately, no reload) and shows a small success message.
 */

import { useCallback, useState } from 'react';
import { PlusIcon } from '@/components/icons';
import Toast from '@/components/ui/Toast';
import { announceNoteChange } from '@/lib/note-events';
import AddNoteModal from './AddNoteModal';

export default function AddNoteButton({
  student,
  variant = 'primary',
  label = '+ Add Note',
  className = '',
}: {
  student: { id: string; name: string };
  variant?: 'primary' | 'compact';
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const closeModal = useCallback(() => setOpen(false), []);
  const clearToast = useCallback(() => setToast(null), []);

  const styles =
    variant === 'primary'
      ? 'bg-brand-blue px-4 py-2 text-sm text-white shadow-elevated hover:bg-brand-blueDark'
      : 'border border-slate-200 bg-white px-3 py-1.5 text-xs text-ink shadow-card hover:border-brand-blue hover:text-brand-blue';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Add note for ${student.name}`}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors focus-ring ${styles} ${className}`}
      >
        {variant === 'compact' && <PlusIcon className="h-3.5 w-3.5" />}
        {variant === 'compact' ? label.replace(/^\+\s*/, '') : label}
      </button>

      <AddNoteModal
        open={open}
        student={student}
        onClose={closeModal}
        onSaved={(note) => {
          announceNoteChange({ type: 'saved', note });
          setToast(`Note saved for ${student.name}`);
        }}
      />
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
