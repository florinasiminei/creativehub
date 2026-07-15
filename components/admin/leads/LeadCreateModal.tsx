"use client";

import { useEffect, useId, useState } from "react";

type LeadPayload = {
  property_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  judet?: string;
  city?: string;
  sat?: string;
  notes?: string;
  source?: string;
  create_booking_request?: boolean;
  preferred_date?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (message: string) => void;
  presetPreferredDate?: string | null;
  defaultCreateBookingRequest?: boolean;
};

const INITIAL_FORM: LeadPayload = {
  property_name: "",
  contact_name: "",
  phone: "",
  email: "",
  judet: "",
  city: "",
  sat: "",
  notes: "",
  source: "backoffice",
  create_booking_request: false,
  preferred_date: "",
};

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-100 dark:focus:border-emerald-500";

export default function LeadCreateModal({
  open,
  onClose,
  onCreated,
  presetPreferredDate = null,
  defaultCreateBookingRequest = false,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const [form, setForm] = useState<LeadPayload>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setForm({
      ...INITIAL_FORM,
      preferred_date: presetPreferredDate || "",
      create_booking_request: defaultCreateBookingRequest,
    });
    setError(null);
  }, [defaultCreateBookingRequest, open, presetPreferredDate]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, saving]);

  if (!open) return null;

  const handleClose = () => {
    if (!saving) onClose();
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: LeadPayload = {
        ...form,
        property_name: String(form.property_name || "").trim(),
        contact_name: String(form.contact_name || "").trim() || undefined,
        phone: String(form.phone || "").trim() || undefined,
        email: String(form.email || "").trim() || undefined,
        judet: String(form.judet || "").trim() || undefined,
        city: String(form.city || "").trim() || undefined,
        sat: String(form.sat || "").trim() || undefined,
        notes: String(form.notes || "").trim() || undefined,
        preferred_date: form.preferred_date || undefined,
      };

      if (!payload.property_name) throw new Error("Numele cazării este obligatoriu.");
      if (payload.create_booking_request && !payload.preferred_date) {
        throw new Error("Data preferată este obligatorie pentru cererea din calendar.");
      }

      const response = await fetch("/api/backoffice/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Nu am putut crea lead-ul.");

      onCreated(payload.create_booking_request ? "Lead-ul și cererea din calendar au fost create." : "Lead-ul a fost creat.");
      setForm(INITIAL_FORM);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "A apărut o eroare.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] border border-gray-200 bg-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.55)] sm:max-w-2xl sm:rounded-[28px] dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/95">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              Pipeline vânzări
            </div>
            <h2 id={titleId} className="text-xl font-semibold text-gray-950 dark:text-gray-100">
              Lead nou
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Adaugă datele esențiale. Restul pot fi completate ulterior.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gray-200 text-xl text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-gray-100"
            aria-label="Închide dialogul"
          >
            &times;
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 p-5 sm:p-6">
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </div>
          )}

          <FormSection title="Proprietate și contact" description="Datele de identificare ale potențialului client.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nume cazare"
                value={form.property_name || ""}
                onChange={(value) => setForm((previous) => ({ ...previous, property_name: value }))}
                placeholder="Ex: Cabana dintre brazi"
                autoFocus
                required
              />
              <Input
                label="Persoană de contact"
                value={form.contact_name || ""}
                onChange={(value) => setForm((previous) => ({ ...previous, contact_name: value }))}
                placeholder="Nume și prenume"
                autoComplete="name"
              />
              <Input
                label="Telefon"
                type="tel"
                value={form.phone || ""}
                onChange={(value) => setForm((previous) => ({ ...previous, phone: value }))}
                placeholder="07xx xxx xxx"
                autoComplete="tel"
              />
              <Input
                label="Email"
                type="email"
                value={form.email || ""}
                onChange={(value) => setForm((previous) => ({ ...previous, email: value }))}
                placeholder="contact@exemplu.ro"
                autoComplete="email"
              />
            </div>
          </FormSection>

          <FormSection title="Localizare" description="Ajută la pregătirea draftului de proprietate.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Județ"
                value={form.judet || ""}
                onChange={(value) => setForm((previous) => ({ ...previous, judet: value }))}
                placeholder="Brașov"
              />
              <Input
                label="Localitate"
                value={form.city || ""}
                onChange={(value) => setForm((previous) => ({ ...previous, city: value }))}
                placeholder="Brașov"
              />
              <Input
                label="Zonă / sat"
                value={form.sat || ""}
                onChange={(value) => setForm((previous) => ({ ...previous, sat: value }))}
                placeholder="Poiana Brașov"
              />
            </div>
          </FormSection>

          <FormSection title="Context intern" description="Informații utile pentru următoarea discuție.">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Observații</span>
              <textarea
                value={form.notes || ""}
                onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                className={`${inputClassName} min-h-24 resize-y`}
                placeholder="Ce s-a discutat, nevoi, buget sau următorul pas..."
              />
            </label>
          </FormSection>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={Boolean(form.create_booking_request)}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, create_booking_request: event.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span>
                <span className="block text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                  Creează și o cerere în calendar
                </span>
                <span className="mt-0.5 block text-xs text-emerald-800/75 dark:text-emerald-300/75">
                  Lead-ul va intra direct în fluxul pentru deplasări.
                </span>
              </span>
            </label>

            {form.create_booking_request && (
              <div className="mt-4 border-t border-emerald-100 pt-4 dark:border-emerald-900/40">
                <Input
                  label="Data preferată"
                  type="date"
                  value={form.preferred_date || ""}
                  onChange={(value) => setForm((previous) => ({ ...previous, preferred_date: value }))}
                  required
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end dark:border-zinc-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-800"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "Se salvează..." : "Creează lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  autoFocus = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
        {label}
        {required ? <span className="ml-1 text-emerald-700">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
      />
    </label>
  );
}
