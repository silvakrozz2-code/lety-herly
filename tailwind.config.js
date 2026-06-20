/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#ffb6c1',
        'primary-light': '#ffe4e1',
        'primary-dark': '#ff8da1',
      }
    }
  },
  plugins: []
}
