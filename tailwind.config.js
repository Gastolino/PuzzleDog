/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        chess: {
          light: '#f0d9b5',
          dark: '#b58863',
          highlight: '#aaa23a',
          selected: '#f6f669',
          correct: '#22c55e',
          wrong: '#ef4444',
        },
      },
      backgroundImage: {
        'gradient-chess': 'linear-gradient(135deg, #1e1e2e 0%, #181825 100%)',
      },
    },
  },
  plugins: [],
}
