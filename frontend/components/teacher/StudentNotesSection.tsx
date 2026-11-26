'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';
import { MessageIcon, ChevronRightIcon } from '@/components/icons';
import { teacherApi, type TeacherNote } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';
import { announceNoteChange, onNoteChange } from '@/lib/note-events';
import AddNoteButton from './AddNoteButton';
import AddNoteModal from './AddNoteModal';
import NoteDetailModal, { noteCategoryLabel, noteDisplayDate } from './NoteDetailModal';

/** Notes newest-first by the date they're about, then by when they were written. */
function sortNotes(notes: TeacherNote[]): TeacherNote[] {
  return [...notes].sort((a, b) => {
    const da = a.note_date ?? a.created_at.slice(0, 10);
    const db = b.note_date ?? b.created_at.slice(0, 10);
    return db.localeCompare(da) || b.created_at.localeCompare(a.created_at);
  });
}

export function NoteCard({
  note,
  teacherName,
  onOpen,
}: {
  note: TeacherNote;
  teacherName: string;
  onOpen: (note: TeacherNote) => void;
}) {
  const category = noteCategoryLabel(note.category);
  return (
    <button
      type="button"
      onClick={() => onOpen(note)}
      aria-label={`Open note: ${note.note.slice(0, 60)}`}
      className="group block w-full rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-left transition-colors hover:border-brand-blue/40 hover:bg-blue-50/40 focus-ring"
    >
      <div className="flex items-center justify-between gap-2">
        {category ? (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-brand-blue">{category}</span>
        ) : (
          <span className="text-xs font-semibold text-ink-muted">Note</span>
        )}
        <ChevronRightIcon className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-blue" />
      </div>
      <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{note.note}</p>
      <p className="mt-1.5 text-xs text-ink-muted">
        {noteDisplayDate(note)} · {teacherName}
      </p>
    </button>
  );
}

export default function StudentNotesSection({
  studentId,
  studentName,
  teacherName,
}: {
  studentId: string;
  studentName: string;
  teacherName: string;
}) {
  const [notes, setNotes] = useState<TeacherNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TeacherNote | null>(null);
  const [editing, setEditing] = useState<TeacherNote | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const closeEditor = useCallback(() => setEditing(null), []);
  const closeDetail = useCallback(() => setSelected(null), []);

  const loadSeq = useRef(0);
  useEffect(() => {
    const seq = ++loadSeq.current;
    teacherApi
      .listNotes(studentId)
      .then((rows) => {
        if (seq === loadSeq.current) setNotes(rows);
      })
      .catch((err) => {
        if (seq === loadSeq.current) {
          setError(err instanceof ApiError ? err.message : 'Could not load teacher notes.');
        }
      });
  }, [studentId]);

  // A note saved from anywhere (the header button, the student list, edit)
  // shows up here immediately — no reload.
  useEffect(
    () =>
      onNoteChange((change) => {
        if (change.type === 'saved' && change.note.student_id === studentId) {
          setNotes((current) => {
            const rest = (current ?? []).filter((n) => n.id !== change.note.id);
            return [change.note, ...rest];
          });
        } else if (change.type === 'deleted' && change.studentId === studentId) {
          setNotes((current) => (current ?? []).filter((n) => n.id !== change.noteId));
        }
      }),
    [studentId]
  );

  return (
    <Card className="mb-6" id="teacher-notes">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
            <MessageIcon className="h-4 w-4" />
          </span>
          <h2 className="font-semibold text-ink">Teacher Notes</h2>
        </div>
        <AddNoteButton student={{ id: studentId, name: studentName }} variant="compact" label="Add Note" />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {notes === null && !error ? (
        <p className="text-sm text-ink-muted">Loading notes…</p>
      ) : (notes ?? []).length === 0 ? (
        <p className="text-sm text-ink-muted">No notes recorded yet. Use “Add Note” to record your first observation.</p>
      ) : (
        <ul className="space-y-2.5">
          {sortNotes(notes ?? []).map((note) => (
            <li key={note.id}>
              <NoteCard note={note} teacherName={teacherName} onOpen={setSelected} />
            </li>
          ))}
        </ul>
      )}

      <NoteDetailModal
        note={selected}
        teacherName={teacherName}
        onClose={closeDetail}
        onEdit={(note) => {
          setSelected(null);
          setEditing(note);
        }}
        onDeleted={(note) => {
          announceNoteChange({ type: 'deleted', studentId: note.student_id, noteId: note.id });
          setSelected(null);
          setToast('Note deleted');
        }}
      />
      <AddNoteModal
        open={!!editing}
        student={{ id: studentId, name: studentName }}
        note={editing}
        onClose={closeEditor}
        onSaved={(note) => {
          announceNoteChange({ type: 'saved', note });
          setToast('Note updated');
        }}
      />
      <Toast message={toast} onDone={clearToast} />
    </Card>
  );
}
