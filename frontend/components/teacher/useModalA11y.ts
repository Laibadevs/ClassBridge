'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal behaviour shared by the note modals: Escape closes, Tab
 * stays inside the dialog, page scroll is locked while open, and focus goes
 * back to whatever opened it. (The dialog itself supplies role="dialog",
 * aria-modal and aria-labelledby.)
 */
export function useModalA11y(open: boolean, onClose: () => void, dialogRef: RefObject<HTMLElement>) {
  // The opener has to be captured while rendering the open state, BEFORE the
  // dialog mounts: a child's autoFocus runs during that commit and would
  // already have moved focus by the time any effect could look at it.
  const wasOpen = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  if (open && !wasOpen.current) {
    opener.current = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
  }
  wasOpen.current = open;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      const target = opener.current;
      if (target && document.contains(target)) target.focus();
    };
  }, [open, onClose, dialogRef]);
}
