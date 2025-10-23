import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
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
    preflight: true,
  },
  plugins: [],
}

export default config
