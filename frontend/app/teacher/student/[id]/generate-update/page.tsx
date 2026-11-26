import { notFound } from 'next/navigation';
import TeacherShell from '@/components/teacher/TeacherShell';
import UpdateGenerator from '@/components/teacher/UpdateGenerator';
import { requireRole } from '@/lib/auth/server';
import { getTeacherStudentProfile } from '@/lib/teacher-data';

export default async function GenerateParentUpdatePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { update?: string };
}) {
  const user = await requireRole('teacher');
  const profile = await getTeacherStudentProfile(params.id);
  if (!profile) notFound();

  const [grade = '', section = ''] = profile.student.className.split(' - ');

  return (
    <TeacherShell userName={user.name}>
      <UpdateGenerator
        initialUpdateId={searchParams.update}
        student={{
          id: profile.student.id,
          name: profile.student.name,
          initials: profile.student.avatarInitials,
          grade,
          section,
        }}
      />
    </TeacherShell>
  );
}
