'use client';

/** Generic destructive-action confirmation modal — same shape as the
 * archive-confirm dialog on the student detail page, factored out so grade
 * and note deletion can reuse it instead of duplicating the markup. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busyLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-10 w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-premium sm:rounded-3xl"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
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
            disabled={busy}
            aria-busy={busy}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-red-700 focus-ring disabled:opacity-60"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
