import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Cardo, Poppins } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import './globals.css';

// Only the weights actually referenced anywhere in the app are loaded — see
// the className/CSS audit: Playfair's 500/900, Cardo's 400, and Poppins's 300
// have no callers, so shipping those font files was pure dead weight.
const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const card = Cardo({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-card',
  display: 'swap',
});

const sans = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ClassBridge AI',
  description:
    'ClassBridge AI helps teachers turn attendance, grades, and quick notes into simple, empathetic parent updates in English and Roman Urdu.',
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${card.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-surface font-sans text-ink antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
