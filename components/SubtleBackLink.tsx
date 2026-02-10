import Link from "next/link";

type Props = {
  href: string;
  label: string;
  className?: string;
};

export default function SubtleBackLink({ href, label, className = "" }: Props) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 ${className}`}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition group-hover:border-zinc-300 group-hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:group-hover:border-zinc-500 dark:group-hover:text-zinc-200">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="h-3.5 w-3.5">
          <path d="M12.5 4.5L7 10l5.5 5.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{label}</span>
    </Link>
  );
}
