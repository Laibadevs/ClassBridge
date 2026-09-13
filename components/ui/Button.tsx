import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-blue text-white hover:bg-brand-blueDark shadow-glowBlue hover:shadow-premium',
  secondary:
    'bg-brand-green text-white hover:bg-brand-greenDark shadow-glowGreen hover:shadow-premium',
  outline:
    'bg-white text-brand-blue border border-slate-200 shadow-card hover:border-brand-blue hover:bg-blue-50',
  ghost: 'bg-transparent text-ink hover:bg-slate-100',
};

const sizeClasses: Record<Size, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

interface ButtonAsButton
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  href?: undefined;
}

interface ButtonAsLink extends CommonProps {
  href: string;
}

export default function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = 'primary', size = 'md', className = '', children } = props;
  const classes = `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { href, ...buttonProps } = props as ButtonAsButton;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
