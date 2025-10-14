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

export const metadata: Metadata = {
  title: "cabn.ro – Cazare în natură",
  description: "Cazări inedite și autentice pentru escapade naturale.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pageMaxW = "92rem"; // ~1472px (poți ajusta la 90rem/96rem)

  return (
    <html lang="ro" suppressHydrationWarning style={{ ["--page-max-w" as any]: pageMaxW }}>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-white text-black dark:bg-black dark:text-white transition-colors duration-300`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Navbar conține singur containerul lui (vezi mai jos) */}
          <Navbar />

          {/* Conținutul paginii — același max-w */}
          <main className="mx-auto max-w-[var(--page-max-w)] px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          {/* Footer full-bleed (nu îl îngustăm aici) */}
          <Footer />
        </ThemeProvider>

        <Analytics />
      </body>
    </html>
  );
}
