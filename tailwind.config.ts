/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  
  darkMode: "class",
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#34d399', // emerald-400
        hover: '#10b981',   // emerald-500
      },
    },
    fontFamily: {
      sans: ['var(--font-geist-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
    },
  },
},

  corePlugins: {
    preflight: true, // ✅ Optional: keeps Tailwind's base styles
  },

  plugins: [],
};
