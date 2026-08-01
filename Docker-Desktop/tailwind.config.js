/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Windows 11 dark mica palette
        mica: {
          950: '#0a0a0f',
          900: '#0f0f16',
          850: '#14141c',
          800: '#1a1a24',
          750: '#20202c',
          700: '#262633',
          600: '#33333f',
          500: '#3f3f4d',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          soft: '#1d4ed80f',
        },
        success: {
          DEFAULT: '#34d399',
          hover: '#10b981',
          soft: '#34d39914',
        },
        warn: {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
          soft: '#f59e0b14',
        },
        danger: {
          DEFAULT: '#ef4444',
          hover: '#dc2626',
          soft: '#ef444414',
        },
      },
      fontFamily: {
        mono: ['Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
