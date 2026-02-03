import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";
  const siteUrl = rawUrl.replace(/^https?:\/\/www\./, "https://");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/add-property", "/edit-property", "/drafts", "/confirm"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
