'use client';

import { useEffect } from 'react';
import { CheckIcon } from '@/components/icons';

/** Small, non-blocking success message. Announced politely to screen readers
 * and dismissed automatically. */
export default function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      {message && (
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-premium">
          <CheckIcon className="h-4 w-4 text-brand-green" /> {message}
        </div>
      )}
    </div>
  );
}
