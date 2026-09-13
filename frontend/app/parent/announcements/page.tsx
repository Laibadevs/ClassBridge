import ParentShell from '@/components/parent/ParentShell';
import ParentAnnouncementsView from '@/components/parent/ParentAnnouncementsView';
import { requireRole } from '@/lib/auth/server';

export default async function ParentAnnouncementsPage() {
  const user = await requireRole('parent');
  return (
    <ParentShell userName={user.name} greeting="Assalam-o-Alaikum 👋">
      <ParentAnnouncementsView />
    </ParentShell>
  );
}
