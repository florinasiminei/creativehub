import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageviewTracker from "@/components/PageviewTracker";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/jsonLd";
import {
  SEO_COLLECTION_DESCRIPTION,
  SEO_COLLECTION_HEADLINE,
  SEO_COLLECTION_META_TITLE,
} from "@/lib/seoCopy";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const siteUrl = getCanonicalSiteUrl();
const defaultSocialImage = "/images/og-default.png";
const twitterSiteHandle = process.env.NEXT_PUBLIC_TWITTER_SITE;
const twitterCreatorHandle = process.env.NEXT_PUBLIC_TWITTER_CREATOR;
const organizationJsonLd = buildOrganizationJsonLd({ siteUrl });
const webSiteJsonLd = buildWebSiteJsonLd({
  siteUrl,
  description: SEO_COLLECTION_DESCRIPTION,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "cabn.ro",
  title: {
    default: SEO_COLLECTION_META_TITLE,
    template: "%s | cabn.ro",
  },
  description: SEO_COLLECTION_DESCRIPTION,
  referrer: "origin-when-cross-origin",
  category: "travel",
  keywords: [
    "cabane Romania",
    "tiny house Romania",
    "retreat Romania",
    "cazari premium",
    "cabn.ro",
  ],
  authors: [{ name: "CABN" }],
  creator: "CABN",
  publisher: "CABN S.R.L.",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
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
    siteName: "cabn",
    title: SEO_COLLECTION_HEADLINE,
    description: SEO_COLLECTION_DESCRIPTION,
    images: [
      {
        url: defaultSocialImage,
        width: 1200,
        height: 630,
        alt: "CABN",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_COLLECTION_HEADLINE,
    description: SEO_COLLECTION_DESCRIPTION,
    images: [defaultSocialImage],
    ...(twitterSiteHandle ? { site: twitterSiteHandle } : {}),
    ...(twitterCreatorHandle ? { creator: twitterCreatorHandle } : {}),
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
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pageMaxW = "92rem"; // tighten container back up for non-navbar content

  return (
    <html lang="ro" suppressHydrationWarning style={{ ["--page-max-w" as any]: pageMaxW }}>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-white text-black dark:bg-[#080808] dark:text-white transition-colors duration-300 overflow-x-hidden`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PageviewTracker />
          {/* Navbar has its own container (see below) */}
          <Navbar />

          {/* Page content matches the shared max-w */}
          <main id="main" className="mx-auto max-w-[var(--page-max-w)] px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          {/* Footer full-bleed on purpose */}
          <Footer />
        </ThemeProvider>
        <script
          id="schema-org-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          id="schema-org-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
window.gtag = function gtag(){window.dataLayer.push(arguments);};
window.gtag('js', new Date());
window.gtag('config', 'G-LSJTRY32B5');

const gaScript = document.createElement('script');
gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-LSJTRY32B5';
gaScript.async = true;
document.head.appendChild(gaScript);`}
        </Script>

        <Analytics />
      </body>
    </html>
  );
}
