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
  },
},

  corePlugins: {
    preflight: true, // ✅ Optional: keeps Tailwind's base styles
  },

  plugins: [],
};
