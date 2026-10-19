/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9ddfd',
          300: '#7cc2fb',
          400: '#36a2f6',
          500: '#0c85e9',
          600: '#0267c7',
          700: '#0352a1',
          800: '#074684',
          900: '#0c3b6e',
          950: '#082549',
        },
      },
    },
  },
  plugins: [],
}
