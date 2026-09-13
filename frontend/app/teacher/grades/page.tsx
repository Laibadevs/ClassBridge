import TeacherShell from '@/components/teacher/TeacherShell';
import ComingSoonPage from '@/components/teacher/ComingSoonPage';
import { ClipboardIcon } from '@/components/icons';
import { requireRole } from '@/lib/auth/server';

export default async function GradesPage() {
  const user = await requireRole('teacher');
  return (
    <TeacherShell userName={user.name}>
      <ComingSoonPage
        icon={ClipboardIcon}
        title="Grades"
        description="Recording and tracking grades from here is on the way."
      />
    </TeacherShell>
  );
}
