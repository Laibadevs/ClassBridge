import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Button from '@/components/ui/Button';
import { AlertIcon } from '@/components/icons';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface">
      <Navigation variant="marketing" />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
          <AlertIcon className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold text-ink">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-ink-muted">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Button href="/" variant="primary" className="mt-8">
          Back to home
        </Button>
        <Link href="/teacher" className="mt-4 text-sm font-medium text-brand-blue hover:underline">
          Go to Teacher dashboard
        </Link>
      </main>
    </div>
  );
}
