import StudentsPage from '@/components/teacher/StudentsPage';
import { requireRole } from '@/lib/auth/server';

export default async function StudentsManagementPage() {
  const user = await requireRole('teacher');
  return <StudentsPage userName={user.name} />;
}
