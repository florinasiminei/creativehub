import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ExploreCard from "@/components/explore/ExploreCard";
import type { ExplorePhoto } from "@/lib/exploreCards";

export type SeoRelatedLink = ExplorePhoto & {
  href: string;
  label: string;
  description?: string;
};

type SeoRelatedLinksProps = {
  title: string;
  description: string;
  links: SeoRelatedLink[];
};

export default function SeoRelatedLinks({ title, description, links }: SeoRelatedLinksProps) {
  if (links.length === 0) return null;
  const photoLinks = links.filter((link) => link.image);
  const textLinks = links.filter((link) => !link.image);

  return (
    <section className="mt-14 border-t border-zinc-200 pt-8 dark:border-white/10">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>
      {photoLinks.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photoLinks.map((link) => (
            <ExploreCard
              key={link.href}
              href={link.href}
              title={link.label}
              subtitle={link.description}
              image={link.image}
              imageAlt={link.imageAlt}
              imagePosition={link.imagePosition}
            />
          ))}
        </div>
      )}
      {textLinks.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {textLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 text-left outline-none transition hover:border-emerald-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-emerald-500/50"
            >
              <span>
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{link.label}</span>
                {link.description ? (
                  <span className="mt-1 block text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                    {link.description}
                  </span>
                ) : null}
              </span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
