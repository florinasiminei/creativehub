"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronRight, CircleUserRound, HousePlus, Menu, X } from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";
import { NAV_LINKS } from "@/lib/constants";
import { useHash } from "@/hooks/useHash";
import { classNames, isActiveLink } from "@/lib/utils";

const PROPERTY_SUBMISSION_HREF = "/add-property";

export default function Navbar() {
  const pathname = usePathname();
  const hash = useHash();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ownerSignedIn, setOwnerSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let idleId: number | undefined;
    let timerId: number | undefined;

    const connectOwnerStatus = () => {
      if (cancelled) return;
      import("@/lib/supabaseClient").then(({ supabase }) => {
        if (cancelled) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setOwnerSignedIn(Boolean(
            session?.user.email && session.user.email_confirmed_at && !session.user.is_anonymous
          ));
        });
        unsubscribe = () => subscription.unsubscribe();
      }).catch((error) => {
        if (!cancelled) console.error("Owner account status could not be loaded:", error);
      });
    };

    const scheduleOwnerStatus = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(connectOwnerStatus, { timeout: 2000 });
      } else {
        timerId = window.setTimeout(connectOwnerStatus, 1500);
      }
    };

    const ownerPage = pathname === "/proprietari" || pathname.startsWith("/proprietari/") ||
      pathname === "/add-property" || pathname.startsWith("/edit-property/");

    if (ownerPage) {
      connectOwnerStatus();
    } else if (document.readyState === "complete") {
      scheduleOwnerStatus();
    } else {
      window.addEventListener("load", scheduleOwnerStatus, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleOwnerStatus);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timerId !== undefined) window.clearTimeout(timerId);
      unsubscribe?.();
    };
  }, [pathname]);

  const ownerAccountLabel = ownerSignedIn ? "Contul meu" : "Cont proprietar";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, hash]);

  return (
    <header
      className={classNames(
        "sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-200 dark:border-white/10 dark:bg-zinc-950/[0.85]",
        scrolled
          ? "shadow-[0_12px_32px_-22px_rgba(15,23,42,0.45)] dark:shadow-[0_12px_32px_-22px_rgba(0,0,0,0.9)]"
          : ""
      )}
      role="banner"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:inset-x-0 focus:top-2 focus:z-50 focus:mx-auto focus:w-max focus:rounded-lg focus:bg-emerald-700 focus:px-3 focus:py-2 focus:text-white"
      >
        Sari la continut
      </a>

      <div className="mx-auto max-w-[var(--page-max-w)] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="cabn.ro - Pagina principala"
            className="group flex shrink-0 select-none items-center gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-zinc-950"
          >
            <Image
              src="/images/logo.svg"
              alt="cabn.ro - exploram cazari autentice"
              width={101}
              height={38}
              className="block h-[35px] w-auto transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex" aria-label="Meniu principal">
            <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 transition-colors dark:text-gray-300">
              {NAV_LINKS.map((link) => {
                const active = isActiveLink(pathname, hash, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={classNames(
                        "rounded-full px-3 py-2 outline-none transition-colors duration-200 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:text-emerald-300",
                        active &&
                          "text-emerald-700 dark:text-emerald-300"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <Link
              href="/proprietari"
              aria-current={pathname === "/proprietari" ? "page" : undefined}
              className={classNames(
                "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500",
                pathname === "/proprietari"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              <CircleUserRound className="h-4 w-4" aria-hidden="true" />
              {ownerAccountLabel}
            </Link>
            <Link
              href={PROPERTY_SUBMISSION_HREF}
              aria-current={pathname === PROPERTY_SUBMISSION_HREF ? "page" : undefined}
              className="group inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 py-1.5 pl-2 pr-4 text-sm font-semibold text-white shadow-sm outline-none transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-700 dark:hover:bg-emerald-800 dark:focus-visible:ring-offset-zinc-950"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <HousePlus className="h-4 w-4" aria-hidden="true" />
              </span>
              Adaugă o proprietate
            </Link>
            <DarkModeToggle />
          </div>

          <div className="flex items-center gap-1.5 lg:hidden">
            <DarkModeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm outline-none transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="sr-only">{menuOpen ? "Închide meniul" : "Deschide meniul"}</span>
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div
          id="mobile-nav"
          aria-hidden={!menuOpen}
          className={classNames(
            "overflow-hidden transition-[max-height,opacity] duration-300 lg:hidden",
            menuOpen
              ? "visible max-h-[34rem] opacity-100"
              : "invisible max-h-0 opacity-0"
          )}
        >
          <nav aria-label="Meniu principal - mobil" className="pb-4 pt-2">
            <div className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-zinc-900">
              <Link
                href={PROPERTY_SUBMISSION_HREF}
                aria-current={pathname === PROPERTY_SUBMISSION_HREF ? "page" : undefined}
                className="flex items-center gap-3 rounded-2xl bg-emerald-700 px-3 py-3 text-sm font-semibold text-white shadow-sm outline-none transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-700 dark:hover:bg-emerald-800 dark:focus-visible:ring-offset-zinc-900"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <HousePlus className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">Adaugă o proprietate</span>
                <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </Link>

              <Link
                href="/proprietari"
                aria-current={pathname === "/proprietari" ? "page" : undefined}
                className={classNames(
                  "mt-2 flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500",
                  pathname === "/proprietari"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                )}
              >
                <CircleUserRound className="h-5 w-5" aria-hidden="true" />
                <span className="min-w-0 flex-1">{ownerAccountLabel}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              </Link>

              <ul className="mt-2 divide-y divide-zinc-100 text-sm font-semibold tracking-wide text-zinc-700 dark:divide-white/10 dark:text-zinc-200">
                {NAV_LINKS.map((link) => {
                  const active = isActiveLink(pathname, hash, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={classNames(
                          "flex items-center justify-between rounded-xl px-3 py-3.5 outline-none transition-colors hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:text-emerald-300",
                          active && "text-emerald-700 dark:text-emerald-300"
                        )}
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
