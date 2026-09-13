import Link from 'next/link';
import { LecternIcon, UsersIcon, SparklesIcon } from '@/components/icons';
import Reveal from './Reveal';

function TeacherPreview() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-ink">Class Progress</span>
          <span className="text-ink-muted">85%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[85%] rounded-full bg-brand-blue" />
        </div>
      </div>
      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs">
        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 px-3 py-1.5 text-ink-muted">
          <span>Student</span>
          <span>Subject</span>
          <span>Status</span>
        </div>
        <div className="grid grid-cols-3 items-center gap-2 px-3 py-2">
          <span className="font-medium text-ink">Alex Johnson</span>
          <span className="text-ink-muted">Math</span>
          <span className="justify-self-start rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-brand-greenDark">
            • On Track
          </span>
        </div>
      </div>
    </div>
  );
}

function ParentPreview() {
  const bubbles = [
    {
      text: 'Your child Sarah is excelling in Science this week! 🎉',
      time: '4:20 PM',
      align: 'right' as const,
    },
    {
      text: 'Aap ki beti Sarah is haftay Science mein behtareen karkardagi dikha rahi hain! 🎉',
      time: '2:30 AM',
      align: 'left' as const,
    },
  ];
  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      {bubbles.map((b) => (
        <div key={b.time} className={`flex items-end gap-2 ${b.align === 'right' ? 'flex-row-reverse' : ''}`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-200 to-emerald-200 text-[10px] font-bold text-brand-blueDark">
            S
          </span>
          <div className="max-w-[80%]">
            <div className="rounded-2xl bg-white px-3 py-2 text-xs leading-snug text-ink shadow-card">
              {b.text}
            </div>
            <p className={`mt-0.5 text-[10px] text-ink-muted ${b.align === 'right' ? 'text-right' : ''}`}>
              {b.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RolePreview() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            See ClassBridge in action.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
            Choose your experience and explore how classroom data becomes clear parent
            communication.
          </p>
        </Reveal>

        <div className="relative mt-14 grid gap-6 lg:grid-cols-2 lg:gap-10">
          {/* connecting arc */}
          <svg
            className="pointer-events-none absolute inset-x-0 top-24 hidden h-40 w-full lg:block"
            viewBox="0 0 1000 160"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="arcGrad" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563EB" />
                <stop offset="1" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <path d="M120 150C300 20 700 20 880 150" stroke="url(#arcGrad)" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
            <circle cx="500" cy="46" r="6" fill="#10B981" />
          </svg>

          <Reveal>
            <div className="flex h-full flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-brand-blue">
                <LecternIcon className="h-10 w-10" />
              </span>
              <h3 className="mt-5 text-2xl font-bold text-ink">I&apos;m a Teacher</h3>
              <p className="mt-2 text-ink-muted">
                Record student progress and generate parent-friendly updates in seconds.
              </p>
              <div className="mt-6 w-full text-left">
                <TeacherPreview />
              </div>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-blueDark focus-ring"
              >
                Explore Teacher Dashboard
              </Link>
            </div>
          </Reveal>

          <Reveal delayMs={120}>
            <div className="flex h-full flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-brand-greenDark">
                <UsersIcon className="h-10 w-10" />
              </span>
              <h3 className="mt-5 text-2xl font-bold text-ink">I&apos;m a Parent</h3>
              <p className="mt-2 text-ink-muted">
                See your child&apos;s progress in simple English and Friendly Roman Urdu.
              </p>
              <div className="mt-6 w-full">
                <ParentPreview />
              </div>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-greenDark focus-ring"
              >
                <SparklesIcon className="h-4 w-4" />
                Explore Parent Dashboard
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
