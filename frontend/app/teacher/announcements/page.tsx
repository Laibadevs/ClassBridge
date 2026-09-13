import AnnouncementsPage from '@/components/teacher/AnnouncementsPage';
import { requireRole } from '@/lib/auth/server';

export default async function TeacherAnnouncementsPage() {
  const user = await requireRole('teacher');
  return <AnnouncementsPage userName={user.name} />;
}
