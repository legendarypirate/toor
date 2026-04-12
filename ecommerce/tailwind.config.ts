import type { Config } from 'tailwindcss'

/** Maps old accent names to true black — mid tones use black ink at alpha (not warm grey). */
const accentBlack = {
  50: '#ffffff',
  100: '#ffffff',
  200: 'rgb(0 0 0 / 0.08)',
  300: 'rgb(0 0 0 / 0.14)',
  400: 'rgb(0 0 0 / 0.28)',
  500: 'rgb(0 0 0 / 0.45)',
  600: '#000000',
  700: '#000000',
  800: '#000000',
  900: '#000000',
  950: '#000000',
} as const

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        blue: accentBlack,
        green: accentBlack,
        emerald: accentBlack,
        teal: accentBlack,
        cyan: accentBlack,
        purple: accentBlack,
        indigo: accentBlack,
        violet: accentBlack,
        pink: accentBlack,
        rose: accentBlack,
        fuchsia: accentBlack,
      },
      maxWidth: {
        // Page shell width — aligned with common MN shops (e.g. smartbuy ~1450–1536px, urmini 96rem tier)
        layout: '96rem',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
  // Ensure CSS is not purged in production
  important: false,
}
export default config
