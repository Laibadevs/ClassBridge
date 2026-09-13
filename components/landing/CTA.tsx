import Link from 'next/link';
import Reveal from './Reveal';

export default function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-blueDark via-brand-blue to-brand-green px-6 py-16 text-center shadow-premium sm:px-12 sm:py-20">
          {/* decorative light bloom */}
          <div
            className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-[2.6rem]">
              Better communication starts with understanding.
            </h2>
            <p className="max-w-xl text-lg text-blue-50/90">
              Help every parent stay connected to their child&apos;s learning — in the language
              that feels like home.
            </p>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-brand-blueDark shadow-elevated transition-all duration-200 hover:-translate-y-0.5 hover:shadow-premium focus-ring"
            >
              Try ClassBridge
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
