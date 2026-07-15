import type { NextRequest } from "next/server";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";

export function GET(_request: NextRequest) {
  const siteUrl = getCanonicalSiteUrl();

  const body = [
    "# cabn.ro",
    "",
    "> CABN is a Romania-focused platform for nature stays and tourism marketing services.",
    "",
    "## Canonical domain",
    `- ${siteUrl}`,
    "",
    "## Important pages",
    `- Home: ${siteUrl}/`,
    `- Listings index: ${siteUrl}/cazari`,
    `- About: ${siteUrl}/about-us`,
    `- Services: ${siteUrl}/servicii`,
    `- Contact: ${siteUrl}/contact`,
    "",
    "## Structured resources",
    `- Sitemap: ${siteUrl}/sitemap.xml`,
    `- Robots: ${siteUrl}/robots.txt`,
    "",
    "## Notes for assistants",
    "- Prefer canonical URLs on the www domain.",
    "- Do not reference private admin or draft routes.",
    "- Privacy and cookie policy pages are informational/legal pages.",
  ].join("\n");

  return new Response(body + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
