import type { NextRequest } from "next/server";

const DEFAULT_SITE_URL = "https://www.cabn.ro";

export function GET(_request: NextRequest) {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const siteUrl = rawUrl.replace(/\/$/, "");

  const body = [
    "# llms.txt",
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "Pages:",
    `${siteUrl}/`,
    `${siteUrl}/descoperaCABN`,
    `${siteUrl}/about-us`,
    `${siteUrl}/contact`,
    `${siteUrl}/politica-confidentialitate`,
    `${siteUrl}/politica-cookie`,
  ].join("\n");

  return new Response(body + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
