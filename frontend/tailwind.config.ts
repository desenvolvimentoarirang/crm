import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        wa: {
          'bg-deep': '#0b141a',
          'bg-default': '#111b21',
          'bg-panel': '#202c33',
          'bg-hover': '#2a3942',
          'bg-bubble-out': '#005c4b',
          'bg-bubble-in': '#202c33',
          'accent': '#00a884',
          'accent-dark': '#005c4b',
          'accent-hover': '#06cf9c',
          'text-primary': '#e9edef',
          'text-secondary': '#8696a0',
          'border': '#2a3942',
          'input-bg': '#2a3942',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
