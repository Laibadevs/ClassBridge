import {
  CalendarCheckIcon,
  GraduationCapIcon,
  EditIcon,
  SparklesIcon,
  UsersIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from '@/components/icons';
import { sampleAIUpdate } from '@/lib/landing-content';
import Reveal from './Reveal';

const gradeChips = [
  { label: 'Math 58%', cls: 'bg-blue-100 text-brand-blueDark' },
  { label: 'Science 76%', cls: 'bg-emerald-100 text-brand-greenDark' },
  { label: 'English 84%', cls: 'bg-blue-100 text-brand-blueDark' },
];

function StepCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
      <p className="text-3xl font-extrabold text-brand-blue">{number}</p>
      <h3 className="mt-1 text-xl font-bold text-ink">{title}</h3>
      <div className="mt-5 flex-1">{children}</div>
    </div>
  );
}

function TeacherMock() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="mb-3 text-xs font-medium text-ink-muted">Teacher dashboard</p>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <CalendarCheckIcon className="h-4 w-4 text-brand-blue" /> Attendance
          </span>
          <span className="text-sm font-semibold text-ink">87%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[87%] rounded-full bg-brand-blue" />
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-slate-200 bg-white p-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <GraduationCapIcon className="h-4 w-4 text-brand-blue" /> Subject grades
        </span>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {gradeChips.map((c) => (
            <span key={c.label} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${c.cls}`}>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-slate-200 bg-white p-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <EditIcon className="h-4 w-4 text-brand-blue" /> Quick teacher note
        </span>
        <p className="mt-1.5 font-mono text-[13px] italic leading-snug text-ink-muted">
          Great improvement in participation this week.
        </p>
      </div>
    </div>
  );
}

function OrbitMock() {
  const inputs = [
    { label: 'Attendance', cls: 'bg-blue-100 text-brand-blueDark', top: '16%' },
    { label: 'Grades', cls: 'bg-blue-100 text-brand-blueDark', top: '44%' },
    { label: 'Notes', cls: 'bg-emerald-100 text-brand-greenDark', top: '72%' },
  ];
  return (
    <div className="relative h-full min-h-[260px] overflow-hidden rounded-2xl border border-slate-100 bg-white">
      {/* faint orbit rings */}
      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-100" aria-hidden />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-200" aria-hidden />

      {/* center AI node */}
      <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-cardHover ring-1 ring-slate-100">
        <SparklesIcon className="h-7 w-7 text-brand-blue" />
      </div>

      {/* input chips */}
      {inputs.map((chip) => (
        <span
          key={chip.label}
          className={`absolute left-3 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold ${chip.cls}`}
          style={{ top: chip.top }}
        >
          {chip.label}
        </span>
      ))}

      {/* dotted connectors */}
      <svg className="absolute inset-0 h-full w-full text-slate-300" aria-hidden>
        <line x1="70" y1="46" x2="120" y2="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
        <line x1="60" y1="120" x2="118" y2="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
        <line x1="58" y1="194" x2="118" y2="132" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
        <line x1="152" y1="120" x2="188" y2="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
      </svg>

      {/* output */}
      <div className="absolute right-3 top-1/2 w-[46%] -translate-y-1/2 rounded-xl border border-brand-blue/30 bg-blue-50/60 p-2.5 text-[11px] leading-snug text-ink">
        Ali is doing well, but needs more Algebra practice.
      </div>
    </div>
  );
}

function ParentMock() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
          <UsersIcon className="h-4 w-4" />
        </span>
        <p className="text-sm font-bold text-ink">AI Parent Update</p>
      </div>
      <div className="py-3">
        <p className="text-[11px] font-semibold text-ink-muted">Simple English</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink">{sampleAIUpdate.englishSummary}</p>
        <p className="mt-3 text-[11px] font-semibold text-ink-muted">Friendly Roman Urdu</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink">{sampleAIUpdate.romanUrduSummary}</p>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-brand-green/25 bg-emerald-50 p-3">
        <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
        <div>
          <p className="text-xs font-bold text-brand-greenDark">Recommended action</p>
          <p className="text-sm text-ink">{sampleAIUpdate.parentAction}</p>
        </div>
      </div>
    </div>
  );
}

function Connector({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute top-1/2 hidden h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-blue shadow-card lg:flex ${className}`}
      aria-hidden
    >
      <ChevronRightIcon className="h-4 w-4" />
    </span>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full bg-blue-100/80 px-4 py-1.5 text-sm font-semibold text-brand-blue">
            How it works
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem] sm:leading-[1.1]">
            From classroom data to meaningful parent conversations.
          </h2>
          <p className="mt-4 text-lg text-ink-muted">
            ClassBridge AI removes the complexity from student updates, helping teachers
            communicate more and parents understand better.
          </p>
        </Reveal>

        <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
          <Reveal>
            <StepCard number="01" title="Teacher adds classroom data">
              <TeacherMock />
            </StepCard>
          </Reveal>
          <Reveal delayMs={120}>
            <StepCard number="02" title="ClassBridge AI understands it">
              <OrbitMock />
            </StepCard>
          </Reveal>
          <Reveal delayMs={240}>
            <StepCard number="03" title="Parent understands and acts">
              <ParentMock />
            </StepCard>
          </Reveal>

          <Connector className="left-[33.333%]" />
          <Connector className="left-[66.666%]" />
        </div>
      </div>
    </section>
  );
}
