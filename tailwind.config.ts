import type { Config } from "tailwindcss";

export default {
  darkMode: "class", // Enable class-based dark mode
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        light: "#F5F5F5",      // Light mode background (Off-White)
        dark: "#121212",       // Dark mode background (Near Black)
        gold: "#D4AF37",       // Warm gold accent
        accent: "#0ABAB5",     // Optional secondary accent (Muted Teal)
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
