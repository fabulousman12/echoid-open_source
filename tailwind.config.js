/** @type {import('tailwindcss').Config} */
export default {
  content: [     './src/**/*.{js,jsx,ts,tsx,html}',
  './public/index.html',   "./node_modules/@ionic/react/**/*.js",
],
  theme: {
    extend: {},
  },
  plugins: [],
  mode : 'jit',
}

