import {
  CalendarCheckIcon,
  GraduationCapIcon,
  NoteIcon,
  SparklesIcon,
  GlobeIcon,
  MessageIcon,
  SendIcon,
  DashboardGridIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@/components/icons';

type Tone = 'blue' | 'green';

const TONE_CHIP: Record<Tone, string> = {
  blue: 'bg-blue-50 text-brand-blue',
  green: 'bg-emerald-50 text-brand-greenDark',
};

interface Step {
  key: string;
  title: string;
  tone: Tone;
  rows: { icon: React.ComponentType<{ className?: string }>; label: string }[];
}

const steps: Step[] = [
  {
    key: 'data',
    title: 'Teacher records',
    tone: 'blue',
    rows: [
      { icon: CalendarCheckIcon, label: 'Attendance' },
      { icon: GraduationCapIcon, label: 'Grades' },
      { icon: NoteIcon, label: 'Teacher notes' },
    ],
  },
  {
    key: 'ai',
    title: 'ClassBridge AI',
    tone: 'blue',
    rows: [{ icon: SparklesIcon, label: 'Reads the record, writes the update' }],
  },
  {
    key: 'message',
    title: 'Parent-friendly message',
    tone: 'green',
    rows: [
      { icon: GlobeIcon, label: 'Simple English' },
      { icon: MessageIcon, label: 'Friendly Roman Urdu' },
    ],
  },
  {
    key: 'delivery',
    title: 'Delivered to parent',
    tone: 'green',
    rows: [
      { icon: SendIcon, label: 'WhatsApp' },
      { icon: DashboardGridIcon, label: 'Parent dashboard' },
    ],
  },
  {
    key: 'action',
    title: 'Parent takes action',
    tone: 'blue',
    rows: [{ icon: CheckCircleIcon, label: 'Knows what to do next' }],
  },
];

/** Compact pipeline strip showing how classroom data becomes a delivered parent update. */
export default function PipelineExplainer() {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        How a classroom record becomes a parent update
      </p>
      <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-stretch lg:gap-2">
        {steps.map((step, i) => (
          <div key={step.key} className="contents">
            <div className="flex flex-1 flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <p className="text-xs font-bold text-ink">{step.title}</p>
              <div className="flex flex-col gap-1.5">
                {step.rows.map((row) => (
                  <span key={row.label} className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${TONE_CHIP[step.tone]}`}>
                      <row.icon className="h-3 w-3" />
                    </span>
                    {row.label}
                  </span>
                ))}
              </div>
            </div>
            {i < steps.length - 1 && (
              <span className="flex shrink-0 items-center justify-center text-slate-300" aria-hidden>
                <ArrowRightIcon className="h-4 w-4 rotate-90 lg:rotate-0" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
