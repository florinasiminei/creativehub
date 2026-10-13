import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cont proprietar",
  description: "Spațiul securizat pentru proprietarii CABN.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
