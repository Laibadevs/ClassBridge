import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { requireRole } from '@/lib/auth/server';

export default async function TeacherDashboardPage() {
  const user = await requireRole('teacher');
  return <TeacherDashboard userName={user.name} />;
}
