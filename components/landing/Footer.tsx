import Link from 'next/link';
import { BridgeIcon } from '@/components/icons';

const productLinks = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#features', label: 'Features' },
  { href: '#for-teachers', label: 'For Teachers' },
  { href: '#for-parents', label: 'For Parents' },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5 focus-ring rounded-lg">
              <BridgeIcon className="h-7 w-7 text-brand-blue" aria-hidden />
              <span className="text-lg font-bold tracking-tight text-ink">ClassBridge</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Turning classroom data into parent understanding.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:flex sm:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Product</p>
              <ul className="mt-3 space-y-2.5">
                {productLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-sm text-ink-muted hover:text-ink focus-ring rounded">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Legal</p>
              <ul className="mt-3 space-y-2.5">
                <li className="text-sm text-ink-muted/70">Privacy</li>
                <li className="text-sm text-ink-muted/70">Terms</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-6">
          <p className="text-center text-sm text-ink-muted">
            ClassBridge — built for a hackathon, designed for real classrooms.
          </p>
        </div>
      </div>
    </footer>
  );
}
