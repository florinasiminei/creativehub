import Link from "next/link";

export type SeoRelatedLink = {
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

  return (
    <section className="mt-12 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-emerald-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900/75">{description}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-emerald-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <span className="block text-sm font-semibold text-emerald-950">{link.label}</span>
            {link.description ? (
              <span className="mt-1 block text-xs leading-5 text-emerald-800/75">
                {link.description}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
