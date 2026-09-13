import ParentShell from '@/components/parent/ParentShell';
import ParentOverview from '@/components/parent/ParentOverview';
import { requireRole } from '@/lib/auth/server';

export default async function ParentDashboardPage() {
  const user = await requireRole('parent');

  return (
    <ParentShell userName={user.name} greeting="Assalam-o-Alaikum 👋">
      <ParentOverview />
    </ParentShell>
  );
}
