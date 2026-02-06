"use client";

import { useState, type FormEvent } from "react";
import FormMessage from "./FormMessage";

type FormState = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(body?.error || "Nu am putut trimite mesajul.");
      }
      form.reset();
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Nu am putut trimite mesajul.");
    }
  };

  return (
    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Nume
          <input
            name="name"
            required
            className="rounded-lg border border-zinc-300/80 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm hover:border-zinc-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            placeholder="Numele tau"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Email / Telefon
          <input
            name="contact"
            required
            className="rounded-lg border border-zinc-300/80 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm hover:border-zinc-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            placeholder="ex: nume@email.com"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
        Mesaj
        <textarea
          name="message"
          rows={5}
          required
          className="rounded-lg border border-zinc-300/80 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm hover:border-zinc-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          placeholder="Descrie pe scurt proiectul sau obiectivul tau."
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-800 sm:w-auto disabled:opacity-70"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Se trimite..." : "Trimite mesajul"}
        </button>
        {status === "success" && (
          <FormMessage variant="success" size="sm" inline>
            Mesaj trimis. Revenim in scurt timp.
          </FormMessage>
        )}
        {status === "error" && (
          <FormMessage variant="error" size="sm" inline>
            {error || "A aparut o eroare la trimitere."}
          </FormMessage>
        )}
      </div>
    </form>
  );
}
