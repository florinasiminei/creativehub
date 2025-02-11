"use client"; // Required for Next.js App Router
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";
import { BsFillSunFill, BsFillMoonFill } from "react-icons/bs";
import Image from "next/image";

// Custom hook to manage dark mode
function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for a stored theme preference or system preference on mount
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
  
  // This mounted flag prevents rendering until the component is mounted on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Until the component is mounted, render nothing.
  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center bg-light dark:bg-dark text-dark dark:text-light transition-colors duration-300">
      {/* REFINED DARK MODE TOGGLE */}
      <div className="fixed top-5 right-5 z-50">
        <button
          onClick={toggleDarkMode}
          aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          className="relative flex items-center justify-center w-14 h-7 bg-gray-300 dark:bg-gray-700 rounded-full transition-colors duration-300 focus:outline-none"
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 bg-white dark:bg-gray-300 rounded-full shadow-md flex items-center justify-center transform transition-transform duration-300 ${
              darkMode ? "translate-x-8" : "translate-x-0"
            }`}
          >
            {darkMode ? (
              // When dark mode is active, show the Moon icon
              <BsFillMoonFill className="text-lg text-gray-600" />
            ) : (
              // When light mode is active, show the Sun icon
              <BsFillSunFill className="text-lg text-yellow-500" />
            )}
          </span>
        </button>
      </div>

      {/* HERO SECTION */}
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
            We Create & Promote
          </h1>
          <p className="mt-4 text-lg opacity-90">
            Elevate your brand with premium content & marketing.
          </p>
          <a
            href="#services"
            className="mt-6 inline-block bg-gold text-black px-8 py-3 rounded-full font-semibold text-lg hover:bg-yellow-500 transition transform hover:scale-105 shadow-lg"
          >
            Discover More
          </a>
        </motion.div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="py-20 text-center">
        <h2 className="text-4xl font-extrabold mb-12">Our Services</h2>
        <div className="grid md:grid-cols-3 gap-10 px-8">
          {[
            {
              title: "Cabin Promotion",
              desc: "Increase bookings with high-quality visuals.",
            },
            {
              title: "Social Media Marketing",
              desc: "Boost engagement with powerful content.",
            },
            {
              title: "Content Creation",
              desc: "Photography, video production & branding.",
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

      {/* PORTFOLIO SECTION */}
      <section id="portfolio" className="py-20 bg-gray-100 dark:bg-gray-900 text-center transition-colors">
        <h2 className="text-4xl font-extrabold mb-12">Our Work</h2>
        <div className="grid md:grid-cols-3 gap-8 px-8">
          {["portfolio1.jpg", "portfolio2.jpg", "portfolio3.jpg"].map((image, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="overflow-hidden rounded-2xl shadow-lg"
            >
              <Image
                src={`/images/${image}`}
                width={400}
                height={300}
                alt={`Portfolio project ${index + 1}`}
                className="rounded-lg object-cover"
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-20 text-center">
        <h2 className="text-4xl font-extrabold mb-6">Get in Touch</h2>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Let's create something amazing together.
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
              aria-label={`Link to ${social.href}`}
            >
              {social.icon}
            </a>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-6 bg-black text-white text-center w-full">
        <p className="text-sm opacity-80">© 2024 Your Company. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
