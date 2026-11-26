'use client';

/**
 * Tiny cross-component channel so a note added from the student header, the
 * student list or the notes section itself all update the visible notes list
 * without a page reload (and without lifting state through a server page).
 */

import type { TeacherNote } from './teacher-api';

const EVENT = 'cb:note-changed';

export type NoteChange =
  | { type: 'saved'; note: TeacherNote }
  | { type: 'deleted'; studentId: string; noteId: string };

export function announceNoteChange(change: NoteChange): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NoteChange>(EVENT, { detail: change }));
}

export function onNoteChange(handler: (change: NoteChange) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<NoteChange>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
