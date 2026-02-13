import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/drafts.webmanifest",
  appleWebApp: {
    title: "cabn Admin",
  },
};

export default function DraftsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
