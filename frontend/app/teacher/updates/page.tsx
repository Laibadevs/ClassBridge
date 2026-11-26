import TeacherShell from '@/components/teacher/TeacherShell';
import TeacherParentUpdates from '@/components/teacher/TeacherParentUpdates';
import { requireRole } from '@/lib/auth/server';

export default async function TeacherUpdatesPage({ searchParams }: { searchParams: { student?: string } }) {
  const user = await requireRole('teacher');
  return (
    <TeacherShell userName={user.name}>
      <TeacherParentUpdates initialStudentId={searchParams.student} />
    </TeacherShell>
  );
}
