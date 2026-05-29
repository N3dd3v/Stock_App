/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#0056b3',
        'brand-yellow': '#ffcc00',
        'brand-white': '#ffffff',
      },
    },
  },
  plugins: [],
}
