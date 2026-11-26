import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import StudentDetailActions from '@/components/teacher/StudentDetailActions';
import StudentAttendanceSection from '@/components/teacher/StudentAttendanceSection';
import StudentGradesSection from '@/components/teacher/StudentGradesSection';
import StudentNotesSection from '@/components/teacher/StudentNotesSection';
import { requireRole } from '@/lib/auth/server';
import { getTeacherStudentProfile } from '@/lib/teacher-data';
import { ArrowLeftIcon, ArrowRightIcon, BarChartIcon, CalendarCheckIcon, SparklesIcon, UserIcon, MessageIcon } from '@/components/icons';
import Link from 'next/link';

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole('teacher');
  const profile = await getTeacherStudentProfile(params.id);
  if (!profile) notFound();

  const { student, attendance, status } = profile;
  const record = profile.record ?? {
    rollNumber: null,
    studentKey: null,
    section: null,
    gradeLevel: null,
    parentName: null,
    whatsappNumber: null,
    whatsappOptIn: false,
    homeAddress: null,
    location: null,
    isActive: true,
  };
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
                <p className="text-ink-muted">
                  {student.className}
                  {record.rollNumber ? ` · Roll #${record.rollNumber}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              <StudentDetailActions
                isActive={record.isActive}
                editable={{
                  id: student.id,
                  fullName: student.name,
                  rollNumber: record.rollNumber ?? '',
                  section: record.section ?? '',
                  className: student.className === 'Unassigned' ? '' : student.className,
                  gradeLevel: record.gradeLevel ?? '',
                  parentName: record.parentName ?? '',
                  whatsappNumber: record.whatsappNumber ?? '',
                  whatsappOptIn: record.whatsappOptIn,
                  homeAddress: record.homeAddress ?? '',
                  location: record.location ?? '',
                }}
              />
            </div>
          </div>
        </Card>

        <nav aria-label="Student sections" className="mb-6 flex flex-wrap gap-2">
          <Link
            href={`/teacher/progress?student=${student.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
          >
            <BarChartIcon className="h-4 w-4" /> Progress
          </Link>
          <Link
            href={`/teacher/updates?student=${student.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
          >
            <MessageIcon className="h-4 w-4" /> Parent Updates
          </Link>
        </nav>

        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
                <UserIcon className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-ink">Student Information</h2>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Full name</dt>
                <dd className="font-medium text-ink">{student.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Grade/Class</dt>
                <dd className="font-medium text-ink">{student.className}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Student ID / Roll number</dt>
                <dd className="font-medium text-ink">{record.rollNumber ?? '—'}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-brand-greenDark">
                <MessageIcon className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-ink">Parent Information</h2>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Parent name</dt>
                <dd className="font-medium text-ink">{record.parentName ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">WhatsApp number</dt>
                <dd className="font-medium text-ink">{record.whatsappNumber ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">WhatsApp consent</dt>
                <dd
                  className={`font-medium ${record.whatsappOptIn ? 'text-brand-greenDark' : 'text-ink-muted'}`}
                >
                  {record.whatsappOptIn ? 'Consented' : 'Not consented'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Home address</dt>
                <dd className="text-right font-medium text-ink">{record.homeAddress ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Location</dt>
                <dd className="font-medium text-ink">{record.location ?? '—'}</dd>
              </div>
            </dl>
          </Card>
        </div>

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

          <StudentAttendanceSection studentId={student.id} className="sm:col-span-3" />
        </div>

        <StudentGradesSection studentId={student.id} studentName={student.name} />

        <StudentNotesSection studentId={student.id} studentName={student.name} teacherName={user.name} />

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
