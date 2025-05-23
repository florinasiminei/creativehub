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
        DEFAULT: '#2dd4bf', // teal-400
        hover: '#14b8a6',   // teal-500
      },
    },
  },
},

  corePlugins: {
    preflight: true, // ✅ Optional: keeps Tailwind's base styles
  },

  plugins: [],
};
