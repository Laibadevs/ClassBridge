import TeacherShell from '@/components/teacher/TeacherShell';
import ComingSoonPage from '@/components/teacher/ComingSoonPage';
import { BarChartIcon } from '@/components/icons';
import { requireRole } from '@/lib/auth/server';

export default async function TeacherProgressPage() {
  const user = await requireRole('teacher');
  return (
    <TeacherShell userName={user.name}>
      <ComingSoonPage
        icon={BarChartIcon}
        title="Progress Reports"
        description="Class-wide progress reports across subjects and terms are on the way."
      />
    </TeacherShell>
  );
}
