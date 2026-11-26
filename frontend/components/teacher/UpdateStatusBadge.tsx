import type { ParentUpdateStatus } from '@/lib/parent-update-api';

const CONFIG: Record<ParentUpdateStatus, { label: string; dot: string; classes: string }> = {
  draft: { label: 'Draft', dot: 'bg-slate-400', classes: 'bg-slate-100 text-ink-muted border-slate-200' },
  approved: { label: 'Approved', dot: 'bg-brand-blue', classes: 'bg-blue-50 text-brand-blueDark border-blue-200' },
  sent: { label: 'Sent', dot: 'bg-brand-green', classes: 'bg-emerald-50 text-brand-greenDark border-emerald-200' },
};

export const LANGUAGE_LABEL: Record<string, string> = {
  english: 'English',
  roman_urdu: 'Roman Urdu',
  urdu: 'Urdu',
};

/** The three real backend statuses (draft / approved / sent), colour-coded
 * in the existing blue + green palette. */
export default function UpdateStatusBadge({ status }: { status: ParentUpdateStatus }) {
  const c = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden />
      {c.label}
    </span>
  );
}
