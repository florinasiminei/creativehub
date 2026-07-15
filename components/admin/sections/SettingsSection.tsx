"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  role: string;
};

function SettingsLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </Link>
  );
}

export default function SettingsSection({ role }: Props) {
  const router = useRouter();

  function handleLogout() {
    document.cookie = "drafts_auth=; Path=/; Max-Age=0";
    router.push("/drafts-login");
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SettingsLink
        href="/drafts/calendar-deployments/settings"
        title="Setari calendar"
        description="Setari generale, reguli pe locatie si zile blocate — totul intr-un singur loc."
      />
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Sesiune</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Esti conectat ca {role}.
        </p>
        <button
          onClick={handleLogout}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Deconectare
        </button>
      </div>
    </div>
  );
}
