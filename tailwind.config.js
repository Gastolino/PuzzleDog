/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Off-black surfaces
        canvas:  '#111111',
        surface: '#1a1a1a',
        raised:  '#222222',
        // Borders
        border:  '#2a2a2a',
        'border-hi': '#363636',
        // Off-white text
        ink:     '#e2dfd8',
        'ink-dim':   '#888882',
        'ink-muted': '#4a4a46',
      },
    },
  },
  plugins: [],
}
