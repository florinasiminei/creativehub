import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "cabn.ro - Cazare in natura",
    template: "%s | cabn.ro",
  },
  description: "Cazari inedite si autentice pentru escapade naturale.",
  alternates: {
    canonical: "/",
  },
  verification: {
    other: {
      "facebook-domain-verification": "hcd2j15izye7czt4zwxbqwfiuqiydw",
    },
  },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: siteUrl,
    siteName: "cabn.ro",
    title: "cabn.ro - Cazare in natura",
    description: "Cazari inedite si autentice pentru escapade naturale.",
    images: [
      {
        url: "/images/logo.svg",
        width: 1200,
        height: 630,
        alt: "cabn.ro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "cabn.ro - Cazare in natura",
    description: "Cazari inedite si autentice pentru escapade naturale.",
    images: ["/images/logo.svg"],
  },
  icons: {
    icon: "/images/favicon.svg",
    shortcut: "/images/favicon.svg",
    apple: "/images/favicon.svg",
    other: [
      {
        rel: "mask-icon",
        url: "/images/favicon.svg",
        color: "#000000",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pageMaxW = "92rem"; // tighten container back up for non-navbar content

  return (
    <html lang="ro" suppressHydrationWarning style={{ ["--page-max-w" as any]: pageMaxW }}>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-white text-black dark:bg-[#080808] dark:text-white transition-colors duration-300 overflow-x-hidden`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Navbar has its own container (see below) */}
          <Navbar />

          {/* Page content matches the shared max-w */}
          <main id="main" className="mx-auto max-w-[var(--page-max-w)] px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          {/* Footer full-bleed on purpose */}
          <Footer />
        </ThemeProvider>

        <Analytics />
      </body>
    </html>
  );
}
