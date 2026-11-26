import GradesPage from '@/components/teacher/GradesPage';
import { requireRole } from '@/lib/auth/server';

export default async function GradesRoutePage() {
  const user = await requireRole('teacher');
  return <GradesPage userName={user.name} />;
}
