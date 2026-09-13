import ParentShell from '@/components/parent/ParentShell';
import UpdatesPage from '@/components/parent/UpdatesPage';
import { requireRole } from '@/lib/auth/server';
import { getStudentProfile, demoParentStudentId } from '@/lib/mock-data';
import { getAIUpdate } from '@/lib/ai-update-store';

export default async function ParentUpdatesPage() {
  const user = await requireRole('parent');
  const profile = getStudentProfile(demoParentStudentId);

  if (!profile) {
    return (
      <ParentShell userName={user.name} greeting="Assalam-o-Alaikum 👋">
        <p className="text-ink-muted">No student information is linked to this account yet.</p>
      </ParentShell>
    );
  }

  return (
    <ParentShell userName={user.name} greeting="Assalam-o-Alaikum 👋">
      <UpdatesPage profile={profile} update={getAIUpdate(profile.student.id) ?? null} />
    </ParentShell>
  );
}
