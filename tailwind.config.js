/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'brand': {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981', 
          600: '#059669',
          900: '#064e3b',
        },
        'dark': {
          bg: '#000000',      // Pure black background like Vercel
          surface: '#0A0A0A', // Slightly lighter for sidebar/bento
          surface2: '#111111',
          border: '#222222',  // Very thin subtle border
          borderHover: '#333333'
        }
      }
    },
  },
  plugins: [],
}
