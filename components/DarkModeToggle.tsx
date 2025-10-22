"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react"; // or from "react-icons"

export default function DarkModeToggle() {
  const { theme, systemTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-6 h-6" />; // Prevent hydration mismatch

  const currentTheme = (theme === "system" ? systemTheme : theme) ?? "light";

  return (
    <button
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle Dark Mode"
      className="text-gray-600 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 transition"
    >
      {currentTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
