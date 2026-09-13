import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-card ${
        hover ? 'transition-shadow duration-200 hover:shadow-cardHover' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
