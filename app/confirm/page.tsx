"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const messages: Record<string, { title: string; body: string }> = {
  created: { title: "Cazare creată", body: "Draftul a fost salvat. Poți continua editarea sau publica atunci când ești gata." },
  updated: { title: "Modificări salvate", body: "Actualizările au fost salvate cu succes." },
  published: { title: "Cazare publicată", body: "Listarea este acum live pentru vizitatori." },
};

export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action") || "updated";
  const id = searchParams.get("id") || "";
  const status = searchParams.get("status") || "draft";
  const msg = messages[action] || messages.updated;
  const badge =
    status === "published"
      ? { text: "Publicat", className: "bg-emerald-100 text-emerald-700" }
      : status === "draft"
      ? { text: "Draft", className: "bg-orange-100 text-orange-700" }
      : { text: status, className: "bg-gray-100 text-gray-700" };

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full bg-white shadow-xl rounded-2xl p-8 border border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">✓</div>
          <div>
            <p className="text-sm text-gray-500">Status: <span className={`px-2 py-0.5 rounded-full text-xs ${badge.className}`}>{badge.text}</span></p>
            <h1 className="text-2xl font-semibold mt-1">{msg.title}</h1>
            <p className="text-gray-600 mt-1">{msg.body}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Link href={`/edit-property/${id}`} className="block w-full text-center py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition">Continuă editarea</Link>
          <Link href={`/cazare/${id}?preview=1&id=${id}`} className="block w-full text-center py-3 rounded-lg border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition">Vezi pagina</Link>
          <Link href="/descoperaCABN" className="block w-full text-center py-3 rounded-lg border text-gray-700 font-semibold hover:bg-gray-50 transition">Înapoi la listări</Link>
        </div>
      </div>
    </div>
  );
}
