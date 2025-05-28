import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function Footer() {
  return (
    <footer className="py-8 bg-black text-white text-center mt-12">
      <p className="text-sm opacity-80 lowercase mb-4">
        © 2024 cabn.ro – Toate drepturile rezervate.
      </p>
      <div className="flex justify-center gap-6 text-xl">
        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition">
          <FaFacebookF />
        </a>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition">
          <FaInstagram />
        </a>
        <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition">
          <FaTiktok />
        </a>
        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition">
          <FaYoutube />
        </a>
      </div>
      <SpeedInsights />
    </footer>
  );
}
