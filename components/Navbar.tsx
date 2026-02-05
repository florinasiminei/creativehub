"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DarkModeToggle from "./DarkModeToggle";
import { NAV_LINKS } from "@/lib/constants";
import { classNames, isActiveLink } from "@/lib/utils";
import { useHash } from "@/hooks/useHash";

export default function Navbar() {
  const pathname = usePathname();
  const hash = useHash();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, hash]);

  const trackAddPropertyClick = (placement: "navbar_desktop" | "navbar_mobile") => {
    if (typeof window === "undefined") return;
    const gtag = (window as any).gtag;
    if (typeof gtag === "function") {
      gtag("event", "add_property_click", {
        placement,
        destination: "/descoperaCABN",
      });
    }
  };

  return (
    <header
      className={classNames(
        "sticky top-0 z-40 border-b border-zinc-200/70 bg-white/70 backdrop-blur-md transition-all duration-200 dark:border-white/5 dark:bg-zinc-900/60",
        scrolled ? "shadow-sm" : ""
      )}
      role="banner"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:inset-x-0 focus:top-2 focus:z-50 focus:mx-auto focus:w-max focus:rounded-lg focus:bg-emerald-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Sari la conținut
      </a>

      <div className="px-3 sm:px-4 lg:px-6">
        <div className="flex min-h-[90px] items-center justify-between gap-3 py-3">
          {/* Logo mare */}
          <Link
            href="/"
            aria-label="cabn.ro – Pagina principală"
            className="group flex shrink-0 select-none items-center gap-3 pl-2 sm:pl-3 lg:pl-5"
          >
            <Image
              src="/images/logo.svg"
              alt="cabn.ro – explorăm cazări autentice"
              width={101}
              height={150}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden md:flex min-w-0 flex-1 items-center justify-center"
            aria-label="Meniu principal"
          >
            <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600 transition-colors dark:text-gray-300 sm:text-xs">
              {NAV_LINKS.map((link) => {
                const active = isActiveLink(pathname, hash, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={classNames(
                        "rounded-full px-3 py-1 outline-none transition-colors duration-200 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:hover:text-emerald-300",
                        active && "text-emerald-600 dark:text-emerald-300"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Acțiuni (CTA + Dark mode) */}
          <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
            <Link
              href="/descoperaCABN"
              onClick={() => trackAddPropertyClick("navbar_desktop")}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              <span aria-hidden="true" className="text-lg font-semibold leading-none">
                +
              </span>
              <span>Adaugă proprietate</span>
            </Link>
            <DarkModeToggle />
          </div>

          {/* Buton meniu mobil */}
          <div className="flex items-center gap-2 md:hidden">
            <DarkModeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/70 bg-white/60 shadow-sm outline-none transition hover:bg-white dark:border-white/10 dark:bg-zinc-900/70"
            >
              <span className="sr-only">Deschide meniul</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeWidth="2" strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Meniu mobil */}
        <div
          id="mobile-nav"
          className={classNames(
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-300",
            menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <nav aria-label="Meniu principal – mobil" className="pb-4">
            <ul className="grid gap-2 text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-200">
              {NAV_LINKS.map((link) => {
                const active = isActiveLink(pathname, hash, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={classNames(
                        "flex items-center justify-between rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 outline-none transition hover:border-emerald-200 hover:bg-emerald-50/70 dark:border-white/10 dark:bg-zinc-900/60 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10",
                        active && "text-emerald-600 dark:text-emerald-300"
                      )}
                    >
                      <span>{link.label}</span>
                      <span
                        aria-hidden="true"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200/70 dark:border-white/10"
                      >
                        ›
                      </span>
                    </Link>
                  </li>
                );
              })}

              <li className="pt-1">
                <Link
                  href="/descoperaCABN"
                  onClick={() => trackAddPropertyClick("navbar_mobile")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-base font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                  <span aria-hidden="true" className="text-lg font-semibold leading-none">
                    +
                  </span>
                  <span>Adaugă proprietate</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

