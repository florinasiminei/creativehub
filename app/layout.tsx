import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cazare in natura Romania - Cabane si cazari autentice | CABN",
    template: "%s | CABN",
  },
  description: "Descopera cazare in natura in Romania: cabane de inchiriat, pensiuni traditionale si case de vacanta pentru weekend sau vacante in zone naturale.",
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
    title: "Cazare in natura Romania - Cabane si cazari autentice | CABN",
    description: "Descopera cazare in natura in Romania: cabane de inchiriat, pensiuni traditionale si case de vacanta pentru weekend sau vacante in zone naturale.",
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
    title: "Cazare in natura Romania - Cabane si cazari autentice | CABN",
    description: "Descopera cazare in natura in Romania: cabane de inchiriat, pensiuni traditionale si case de vacanta pentru weekend sau vacante in zone naturale.",
    images: ["/images/logo.svg"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "mask-icon",
        url: "/images/favicon.svg",
        color: "#10B981",
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

        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-LSJTRY32B5" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-LSJTRY32B5');`}
        </Script>

        <Analytics />
      </body>
    </html>
  );
}
