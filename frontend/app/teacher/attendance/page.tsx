import AttendancePage from '@/components/teacher/AttendancePage';
import { requireRole } from '@/lib/auth/server';
import { dateKey, schoolDays } from '@/lib/attendance-data';

/**
 * `days`/`today` are computed here (server-side) so a browser in another
 * timezone can never resolve a different calendar day than the one actually
 * being marked. Everything else — the real roster and real attendance rows —
 * is fetched client-side via lib/teacher-api.ts, same as the Students page.
 */
export default async function AttendanceRoutePage() {
  const user = await requireRole('teacher');

  const now = new Date();
  const days = schoolDays(5, now);

  return <AttendancePage userName={user.name} days={days} today={dateKey(now)} />;
}
