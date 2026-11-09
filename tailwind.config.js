/** @type {import('tailwindcss').Config} */
// Tailwind v4 reads design tokens from src/index.css (@theme).
// This file is kept for editor tooling and legacy plugin compatibility.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
