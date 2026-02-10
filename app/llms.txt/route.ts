import type { NextRequest } from "next/server";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";

export function GET(_request: NextRequest) {
  const siteUrl = getCanonicalSiteUrl();

  const body = [
    "# llms.txt",
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "Pages:",
    `${siteUrl}/`,
    `${siteUrl}/servicii`,
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
