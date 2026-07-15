import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/drafts.webmanifest",
  appleWebApp: {
    title: "cabn Admin",
  },
};

export default function BackofficeRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 overflow-hidden">
      {children}
    </div>
  );
}
