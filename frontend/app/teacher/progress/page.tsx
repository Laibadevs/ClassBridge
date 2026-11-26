import TeacherShell from '@/components/teacher/TeacherShell';
import TeacherProgress from '@/components/teacher/TeacherProgress';
import { requireRole } from '@/lib/auth/server';

export default async function TeacherProgressPage({ searchParams }: { searchParams: { student?: string } }) {
  const user = await requireRole('teacher');
  return (
    <TeacherShell userName={user.name}>
      <TeacherProgress teacherName={user.name} initialStudentId={searchParams.student} />
    </TeacherShell>
  );
}
