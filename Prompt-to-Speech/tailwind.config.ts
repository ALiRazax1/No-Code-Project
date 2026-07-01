/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design token: Deep space palette
        void: {
          950: '#04040a',
          900: '#06060f',
          800: '#0a0a14',
          700: '#0e0e1a',
          600: '#12121f',
        },
        surface: {
          DEFAULT: '#0a0a14',
          raised: '#0e0e1a',
          overlay: '#12121f',
        },
        border: {
          subtle: '#14142a',
          DEFAULT: '#1a1a2c',
          strong: '#242438',
        },
        ink: {
          muted:    '#2a2a42',
          dim:      '#3d3d58',
          mid:      '#55556e',
          soft:     '#7070889',
          DEFAULT:  '#a0a0ba',
          bright:   '#c8c8e0',
          crisp:    '#e8e8f8',
        },
        accent: {
          indigo: '#6366f1',
          violet: '#7c3aed',
          purple: '#8b5cf6',
          soft:   '#a5b4fc',
          glow:   'rgba(99,102,241,0.35)',
        },
      },
      fontFamily: {
        sans: ['"Inter var"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(99,102,241,0.25)',
        'glow':     '0 0 24px rgba(99,102,241,0.40)',
        'glow-lg':  '0 0 40px rgba(99,102,241,0.55)',
        'word':     '0 0 14px rgba(139,92,246,0.9), 0 0 28px rgba(99,102,241,0.4)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease forwards',
        'spin-slow': 'spin 0.75s linear infinite',
      },
    },
  },
  plugins: [],
}
