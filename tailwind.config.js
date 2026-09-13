/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2563EB',
          blueDark: '#1E3A8A',
          green: '#10B981',
          greenDark: '#047857',
        },
        surface: '#F8FAFC',
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: [
          'var(--font-display)',
          'Georgia',
          'serif',
        ],
        card: ['var(--font-card)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter: '-0.03em',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        elevated: '0 2px 4px -2px rgb(15 23 42 / 0.06), 0 8px 20px -6px rgb(15 23 42 / 0.10)',
        cardHover:
          '0 10px 30px -8px rgb(15 23 42 / 0.14), 0 4px 10px -4px rgb(15 23 42 / 0.08)',
        premium:
          '0 24px 60px -20px rgb(30 58 138 / 0.28), 0 8px 24px -12px rgb(15 23 42 / 0.12)',
        glowBlue: '0 10px 30px -8px rgb(37 99 235 / 0.45)',
        glowGreen: '0 10px 30px -8px rgb(16 185 129 / 0.40)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.35s ease-out',
        pulseSoft: 'pulseSoft 1.4s ease-in-out infinite',
        floatY: 'floatY 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
