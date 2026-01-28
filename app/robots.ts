import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

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
