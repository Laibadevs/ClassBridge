import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import SubjectProgress from '@/components/SubjectProgress';
import { requireRole } from '@/lib/auth/server';
import { getTeacherStudentProfile } from '@/lib/teacher-data';
import { ArrowLeftIcon, ArrowRightIcon, CalendarCheckIcon, MessageIcon, SparklesIcon } from '@/components/icons';
import Link from 'next/link';

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  await requireRole('teacher');
  const profile = await getTeacherStudentProfile(params.id);
  if (!profile) notFound();

  const { student, attendance, subjects, note, status } = profile;
  const firstName = student.name.split(' ')[0];

  return (
    <div className="min-h-screen bg-surface">
      <Navigation variant="app" />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href="/teacher"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink focus-ring rounded-lg"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to dashboard
        </Link>

        <Card className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-brand-blue">
                {student.avatarInitials}
              </span>
              <div>
                <h1 className="text-2xl font-bold text-ink">{student.name}</h1>
                <p className="text-ink-muted">{student.className}</p>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
        </Card>

        <div className="mb-6 grid gap-6 sm:grid-cols-5">
          <Card className="sm:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-brand-greenDark">
                <CalendarCheckIcon className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-ink">Attendance</h2>
            </div>
            <p className="text-4xl font-bold text-ink">{attendance}%</p>
            <p className="mt-1 text-sm text-ink-muted">This term</p>
          </Card>

          <Card className="sm:col-span-3">
            <h2 className="mb-4 font-semibold text-ink">Subject performance</h2>
            <div className="space-y-4">
              {subjects.map((s) => (
                <SubjectProgress key={s.subject} {...s} />
              ))}
            </div>
          </Card>
        </div>

        <Card className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
              <MessageIcon className="h-4 w-4" />
            </span>
            <h2 className="font-semibold text-ink">Teacher notes</h2>
          </div>
          <p className="leading-relaxed text-ink-muted">&ldquo;{note}&rdquo;</p>
        </Card>

        <Card className="border-brand-blue/15 bg-gradient-to-br from-blue-50/60 to-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white">
                <SparklesIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">Generate Parent Update</h2>
                <p className="text-sm text-ink-muted">
                  Enter {firstName}&apos;s facts once — ClassBridge AI writes the bilingual update.
                </p>
              </div>
            </div>
            <Button href={`/teacher/student/${student.id}/generate-update`} className="w-full sm:w-auto">
              Open AI Generator <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
