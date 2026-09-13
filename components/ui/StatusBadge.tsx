import type { StudentStatus } from '@/lib/types';

const config: Record<StudentStatus, { label: string; dot: string; classes: string }> = {
  'doing-well': {
    label: 'Doing well',
    dot: 'bg-brand-green',
    classes: 'bg-emerald-50 text-brand-greenDark border-emerald-200',
  },
  'needs-attention': {
    label: 'Needs a little attention',
    dot: 'bg-amber-500',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

export default function StatusBadge({ status }: { status: StudentStatus }) {
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${c.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
