import type { ReactNode } from 'react';
import Card from './ui/Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'neutral';
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  blue: 'bg-blue-50 text-brand-blue',
  green: 'bg-emerald-50 text-brand-greenDark',
  amber: 'bg-amber-50 text-amber-600',
  neutral: 'bg-slate-100 text-ink-muted',
};

export default function StatCard({ label, value, icon, tone = 'neutral' }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-ink">{value}</p>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}
