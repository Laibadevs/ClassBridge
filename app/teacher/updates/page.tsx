import TeacherShell from '@/components/teacher/TeacherShell';
import ComingSoonPage from '@/components/teacher/ComingSoonPage';
import { MessageIcon } from '@/components/icons';
import { requireRole } from '@/lib/auth/server';

export default async function TeacherUpdatesPage() {
  const user = await requireRole('teacher');
  return (
    <TeacherShell userName={user.name}>
      <ComingSoonPage
        icon={MessageIcon}
        title="Parent Updates"
        description="A full history of every AI-generated update you've sent is on the way. You can already generate and send one from a student's profile."
      />
    </TeacherShell>
  );
}
