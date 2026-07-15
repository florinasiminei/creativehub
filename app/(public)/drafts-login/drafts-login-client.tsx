"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DraftsLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "1") {
      setError("User sau parola gresita.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/drafts-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!resp.ok) {
        setError("User sau parola gresita.");
        setLoading(false);
        return;
      }
      router.push("/drafts");
    } catch {
      setError("Eroare la autentificare.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-6 shadow-xl space-y-4"
      >
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Drafts Login</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Autentificare pentru administrare.</p>
        </div>

        <label className="block text-sm text-gray-700 dark:text-gray-200">
          User
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
            autoComplete="username"
            required
          />
        </label>

        <label className="block text-sm text-gray-700 dark:text-gray-200">
          Parola
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Se autentifica..." : "Autentifica-te"}
        </button>
      </form>
    </div>
  );
}

