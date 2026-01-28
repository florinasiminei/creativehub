import type { Metadata } from "next";

type LayoutProps = { params: { slug: string }; children: React.ReactNode };

export function generateMetadata({ params }: LayoutProps): Metadata {
  const slug = params.slug?.replace(/-/g, " ").trim();
  const title = slug ? `${slug}` : "Cazare in natura";
  return {
    title,
    description: "Descopera cazari autentice in natura, selectate pentru confort si experiente memorabile.",
    alternates: {
      canonical: `/cazare/${params.slug}`,
    },
    openGraph: {
      title,
      description: "Descopera cazari autentice in natura, selectate pentru confort si experiente memorabile.",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Descopera cazari autentice in natura, selectate pentru confort si experiente memorabile.",
    },
  };
}

export default function CazareLayout({ children }: LayoutProps) {
  return children;
}
