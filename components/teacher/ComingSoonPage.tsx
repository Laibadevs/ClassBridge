import type { ComponentType, SVGProps } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ComingSoonPageProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

/** Lightweight placeholder for teacher sections that don't have a real page yet. */
export default function ComingSoonPage({ icon: Icon, title, description }: ComingSoonPageProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <Card className="flex flex-col items-center px-8 py-12">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
          <Icon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-ink-muted">{description}</p>
        <p className="mt-1 text-sm font-medium text-brand-blue">Coming soon</p>
        <Button href="/teacher" variant="outline" className="mt-6">
          Back to Dashboard
        </Button>
      </Card>
    </div>
  );
}
