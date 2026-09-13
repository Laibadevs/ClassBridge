import Button from '@/components/ui/Button';
import ProductPreview from './ProductPreview';
import Reveal from './Reveal';

export default function Hero() {
  return (
    <section className="glow-field relative overflow-hidden bg-gradient-to-b from-blue-50/50 via-surface to-surface">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:px-8 lg:pb-28 lg:pt-20">
        <Reveal>
          <span className="inline-flex items-center rounded-full bg-blue-100/80 px-4 py-1.5 text-sm font-semibold text-brand-blue">
            AI-powered parent communication
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.12] tracking-tight text-ink sm:text-[3.6rem] sm:leading-[1.08]">
            Turn classroom data into parent understanding.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            Transform attendance, grades, and teacher notes into simple, empathetic updates
            parents can understand and act on.
          </p>
          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button href="/login" size="lg" variant="primary" className="rounded-full">
              Try ClassBridge
            </Button>
            <Button href="#how-it-works" size="lg" variant="outline" className="rounded-full">
              See how it works
            </Button>
          </div>
        </Reveal>

        <Reveal delayMs={150}>
          <ProductPreview />
        </Reveal>
      </div>
    </section>
  );
}
