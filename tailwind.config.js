/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#2C3E50',
        'primary-blue': '#3498DB',
        'accent-red': '#E74C3C',
        'success-green': '#2ECC71',
        'warning-orange': '#F39C12',
        'light-gray': '#ECF0F1',
        'dark-slate': '#34495E',
      },
    },
  },
  plugins: [],
}
