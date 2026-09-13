import Reveal from './Reveal';

const stats = [
  { value: '1,200+', label: 'Parent updates generated' },
  { value: '3.2 hrs', label: 'Saved per teacher / week' },
  { value: '2 languages', label: 'Simple English + Roman Urdu' },
];

export default function ImpactStats() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delayMs={i * 100} className="text-center">
              <p className="text-4xl font-extrabold tracking-tight text-ink sm:text-[2.75rem]">
                {s.value}
              </p>
              <p className="mt-2 text-base text-ink-muted">{s.label}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-ink-muted/80">
          Illustrative product metrics for this demo — not verified production data.
        </p>
      </div>
    </section>
  );
}
