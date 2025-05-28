"use client";

import Image from "next/image";
import Link from "next/link";
import DarkModeToggle from "./DarkModeToggle"; // ✅ use the reusable component

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-black py-2 shadow-sm border-b transition duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between px-6 gap-4">
        
        <Link href="/" className="flex items-center">
          <Image src="/logo.svg" alt="cabn.ro logo" width={140} height={60} className="cursor-pointer" />
        </Link>

        <div className="flex gap-6 text-sm uppercase font-medium items-center justify-center">
          <Link href="/" className="hover:text-green-500 transition">
            🏕️ Cazări turistice
          </Link>
          <Link href="#atractii" className="hover:text-green-500 transition">
            🧭 Atracții
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="#adauga"
            className="bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-green-600 transition"
          >
            Adaugă proprietate
          </Link>

          <DarkModeToggle /> {/* ✅ clean and reusable */}
        </div>
      </div>
    </header>
  );
}
