import Link from "next/link";
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200/70 bg-white text-zinc-800 transition-all duration-200 dark:border-zinc-800 dark:bg-[#080808] dark:text-zinc-100">
      <div className="mx-auto max-w-[var(--page-max-w)] px-4 sm:px-6 lg:px-8 py-10 text-center">
        <p className="text-sm opacity-80 mb-4">
          {"\u00A9"} {new Date().getFullYear()} CABN S.R.L. — All rights reserved
        </p>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <Link
            href="/contact"
            className="hover:text-emerald-500 transition dark:hover:text-emerald-300"
          >
            Contact
          </Link>
          <Link
            href="/politica-confidentialitate"
            className="hover:text-emerald-500 transition dark:hover:text-emerald-300"
          >
            Politica de confidentialitate
          </Link>
          <Link
            href="/politica-cookie"
            className="hover:text-emerald-500 transition dark:hover:text-emerald-300"
          >
            Politica de utilizare cookie-uri
          </Link>
        </div>

        <div className="flex justify-center gap-6 text-xl">
          <a
            href="https://www.facebook.com/cabn.ro"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
            aria-label="Facebook"
          >
            <FaFacebookF />
          </a>
          <a
            href="https://www.instagram.com/cabn.ro/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
            aria-label="Instagram"
          >
            <FaInstagram />
          </a>
          <a
            href="https://www.tiktok.com/@cabn.ro"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
            aria-label="TikTok"
          >
            <FaTiktok />
          </a>
          <a
            href="https://wa.me/40745298008"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
            aria-label="WhatsApp"
          >
            <FaWhatsapp />
          </a>
        </div>
      </div>

      <SpeedInsights />
    </footer>
  );
}
