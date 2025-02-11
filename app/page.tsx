"use client"; // Necesitar pentru Next.js App Router
/* eslint-disable react/no-unescaped-entities */

import Head from "next/head";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";
import { BsFillSunFill, BsFillMoonFill } from "react-icons/bs";
import Image from "next/image";

// Hook personalizat pentru gestionarea modului întunecat
function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Verifică dacă există o preferință de temă stocată sau o preferință a sistemului la montare
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setDarkMode(storedTheme === "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(prefersDark);
      localStorage.setItem("theme", prefersDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  return { darkMode, toggleDarkMode };
}

export default function Home() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  
  // Această variabilă "mounted" previne redarea până când componenta este montată pe client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Până când componenta nu este montată, nu se afișează nimic.
  if (!mounted) return null;

  return (
    <>
      {/* SEO Meta Tags */}
      <Head>
        <title>Promovare Cabane - Experiențe Unice în Cazări Rustice</title>
        <meta
          name="description"
          content="Descoperă cele mai bune oferte pentru promovarea cabanelor: cabane de vacanță, cazare la mute și rezervări online. Experiențe autentice la cabane rustice."
        />
        <meta
          name="keywords"
          content="promovare cabane, cabane de vacanță, cazare cabane, cabane în munți, rezervări cabane, oferte cabane, cabane rustice"
        />
        <meta property="og:title" content="Promovare Cabane - Experiențe Unice în Cazări Rustice" />
        <meta
          property="og:description"
          content="Descoperă cele mai bune oferte pentru cabane de vacanță, rezervări online și experiențe autentice la cabane rustice în munți."
        />
        <meta property="og:image" content="/images/hero-image.jpg" />
        <meta property="og:url" content="https://exemplu.ro" />
        <link rel="canonical" href="https://exemplu.ro" />
      </Head>

      <div className="min-h-screen flex flex-col items-center bg-light dark:bg-dark text-dark dark:text-light transition-colors duration-300">
        {/* Comutatorul rafinat pentru modul întunecat */}
        <div className="fixed top-5 right-5 z-50">
          <button
            onClick={toggleDarkMode}
            aria-label={`Comută la modul ${darkMode ? "luminos" : "întunecat"}`}
            className="relative flex items-center justify-center w-14 h-7 bg-gray-300 dark:bg-gray-700 rounded-full transition-colors duration-300 focus:outline-none"
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white dark:bg-gray-300 rounded-full shadow-md flex items-center justify-center transform transition-transform duration-300 ${
                darkMode ? "translate-x-8" : "translate-x-0"
              }`}
            >
              {darkMode ? (
                // Când modul întunecat este activ, afișează icoana Lunii
                <BsFillMoonFill className="text-lg text-gray-600" />
              ) : (
                // Când modul luminos este activ, afișează icoana Soarelui
                <BsFillSunFill className="text-lg text-yellow-500" />
              )}
            </span>
          </button>
        </div>

        {/* Secțiunea principală (Hero) */}
        <section
          className="w-full h-screen flex flex-col items-center justify-center text-center bg-cover bg-center relative"
          style={{ backgroundImage: "url('/images/hero-image.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <motion.div
            className="z-10 px-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="text-5xl font-extrabold tracking-tight drop-shadow-lg text-light dark:text-gold">
              Noi creăm și promovăm
            </h1>
            <p className="mt-4 text-lg opacity-90">
              Îți îmbunătățim brandul cu conținut premium și marketing.
            </p>
            <a
              href="#services"
              className="mt-6 inline-block bg-gold text-black px-8 py-3 rounded-full font-semibold text-lg hover:bg-yellow-500 transition transform hover:scale-105 shadow-lg"
            >
              Descoperă mai mult
            </a>
          </motion.div>
        </section>

        {/* Secțiunea Servicii */}
        <section id="services" className="py-20 text-center">
          <h2 className="text-4xl font-extrabold mb-12">Serviciile Noastre</h2>
          <div className="grid md:grid-cols-3 gap-10 px-8">
            {[
              {
                title: "Promovare Cabină",
                desc: "Crește rezervările cu imagini de înaltă calitate.",
              },
              {
                title: "Marketing pe Rețelele Sociale",
                desc: "Stimulează implicarea cu conținut de impact.",
              },
              {
                title: "Creare de Conținut",
                desc: "Fotografie, producție video și branding.",
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-colors"
              >
                <h3 className="text-2xl font-semibold">{service.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Secțiunea Portofoliu */}
        <section id="portfolio" className="py-20 bg-gray-100 dark:bg-gray-900 text-center transition-colors">
          <h2 className="text-4xl font-extrabold mb-12">Lucrările Noastre</h2>
          <div className="grid md:grid-cols-3 gap-8 px-8">
            {["portfolio1.jpg", "portfolio4.jpg", "portfolio3.jpg"].map((image, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="overflow-hidden rounded-2xl shadow-lg"
              >
                <Image
                  src={`/images/${image}`}
                  width={400}
                  height={300}
                  alt={`Proiect portofoliu ${index + 1}`}
                  className="rounded-lg object-cover"
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Secțiunea Contact */}
        <section id="contact" className="py-20 text-center">
          <h2 className="text-4xl font-extrabold mb-6">Contactează-ne</h2>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Hai să creăm ceva uimitor împreună.
          </p>
          <div className="flex justify-center mt-6 gap-6">
            {[
              { icon: <FaFacebook />, href: "#", color: "text-blue-600" },
              { icon: <FaInstagram />, href: "#", color: "text-pink-500" },
              { icon: <FaTiktok />, href: "#", color: "text-black dark:text-white" },
            ].map((social, index) => (
              <a
                key={index}
                href={social.href}
                className={`text-4xl ${social.color} hover:scale-110 transition`}
                aria-label={`Legătură către ${social.href}`}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 bg-black text-white text-center w-full">
          <p className="text-sm opacity-80">© 2024 Compania Ta. Toate drepturile rezervate.</p>
        </footer>
      </div>
    </>
  );
}
