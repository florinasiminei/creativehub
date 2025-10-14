import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200/70 bg-black text-white dark:border-white/10">
      <div className="mx-auto max-w-[var(--page-max-w)] px-4 sm:px-6 lg:px-8 py-10 text-center">
        <p className="text-sm opacity-80 mb-4">
          © {new Date().getFullYear()} CABN.ro — Toate drepturile rezervate.
        </p>

        <div className="flex justify-center gap-6 text-xl">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
            aria-label="Facebook"
          >
            <FaFacebookF />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
            aria-label="Instagram"
          >
            <FaInstagram />
          </a>
          <a
            href="https://tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
            aria-label="TikTok"
          >
            <FaTiktok />
          </a>
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
            aria-label="YouTube"
          >
            <FaYoutube />
          </a>
        </div>
      </div>

      <SpeedInsights />
    </footer>
  );
}
