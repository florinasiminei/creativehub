"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Send } from "lucide-react";
import ListingSubmitFeedback from "@/components/forms/ListingSubmitFeedback";
import { fetchOwnerApi } from "@/lib/api/ownerSession";
import { formatOwnerDate, OwnerRequestError, readOwnerResponse } from "@/lib/ownerPortal";
import {
  OWNER_CLAIM_LIMITS,
  OWNER_CLAIM_ROLES,
  validateOwnerClaimDetails,
  type OwnerClaimErrors,
} from "@/lib/validation/ownerClaim";

export type OwnerClaim = {
  id: string;
  listingTitle: string;
  status: string;
  createdAt: string | null;
};

function claimStatusPresentation(status: string) {
  if (status === "approved") return {
    label: "Aprobată",
    description: "Solicitarea a fost aprobată. Proprietățile asociate contului sunt afișate mai sus.",
    className: "text-emerald-700 dark:text-emerald-300",
  };
  if (status === "rejected") return {
    label: "Respinsă",
    description: "Cererea nu a fost aprobată. Contactează echipa CABN pentru clarificări.",
    className: "text-orange-700 dark:text-orange-300",
  };
  if (status === "cancelled") return {
    label: "Anulată",
    description: "Această cerere a fost anulată.",
    className: "text-zinc-600 dark:text-zinc-300",
  };
  return {
    label: "În verificare",
    description: "Verificăm solicitarea. După aprobare, cazarea va apărea în lista ta de proprietăți.",
    className: "text-amber-700 dark:text-amber-300",
  };
}

export default function OwnerClaimSection({ ownerId, email, initialListingReference, claims, signingOut, refreshing, onSubmitted, onAuthError }: {
  ownerId: string;
  email: string;
  initialListingReference: string;
  claims: OwnerClaim[];
  signingOut: boolean;
  refreshing: boolean;
  onSubmitted: () => Promise<void>;
  onAuthError: (error: unknown) => void;
}) {
  const [isOpen, setIsOpen] = useState(Boolean(initialListingReference));
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [listingReference, setListingReference] = useState(initialListingReference);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimContact, setClaimContact] = useState({ fullName: "", phone: "", role: "" });
  const [claimErrors, setClaimErrors] = useState<OwnerClaimErrors>({});
  const [claimStep, setClaimStep] = useState<"details" | "review" | "success">("details");
  const [claimFeedback, setClaimFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const claimReferenceRef = useRef<HTMLInputElement | null>(null);
  const claimStepTitleRef = useRef<HTMLHeadingElement | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  useEffect(() => {
    if (!initialListingReference) return;
    setListingReference(initialListingReference);
    setClaimStep("details");
    setClaimFeedback(null);
    setIsOpen(true);
  }, [initialListingReference]);

  useEffect(() => {
    if (!isOpen) return;
    if (claimStep === "details") claimReferenceRef.current?.focus();
    else claimStepTitleRef.current?.focus();
  }, [isOpen, claimStep]);

  const updateClaimContact = (field: keyof typeof claimContact, value: string) => {
    setClaimContact((current) => ({ ...current, [field]: value }));
    setClaimErrors((current) => ({ ...current, [field]: undefined }));
    setClaimFeedback(null);
  };

  const handleClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (claimSubmitting || signingOut || refreshing) return;
    const reference = listingReference.trim();
    if (!reference) {
      setClaimFeedback({ tone: "error", message: "Copiază aici linkul paginii cazării de pe CABN." });
      claimReferenceRef.current?.focus();
      return;
    }

    const { details, errors } = validateOwnerClaimDetails({ ...claimContact, message: claimMessage });
    setClaimErrors(errors);
    if (Object.keys(errors).length > 0) {
      setClaimStep("details");
      const firstInvalidField = Object.keys(errors)[0];
      const field = event.currentTarget.elements.namedItem(firstInvalidField);
      if (field instanceof HTMLElement) field.focus();
      return;
    }

    if (claimStep === "details") {
      setClaimFeedback(null);
      setClaimStep("review");
      return;
    }
    if (claimStep !== "review") return;

    setClaimSubmitting(true);
    setClaimFeedback(null);
    try {
      const response = await fetchOwnerApi(ownerId, "/api/owner/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingReference: reference,
          ...details,
        }),
      });
      const body = await readOwnerResponse(response);
      if (!activeRef.current) return;
      const title = typeof body?.claim?.listingTitle === "string" ? body.claim.listingTitle : "cazarea ta";
      setClaimFeedback({ tone: "success", message: `Am primit cererea pentru „${title}”.` });
      setClaimStep("success");
      setListingReference("");
      setClaimMessage("");
      setClaimContact({ fullName: "", phone: "", role: "" });
      setClaimErrors({});
      await onSubmitted();
    } catch (error) {
      if (!activeRef.current) return;
      if (error instanceof OwnerRequestError && error.status === 401) {
        onAuthError(error);
      } else {
        setClaimFeedback({
          tone: "error",
          message: error instanceof OwnerRequestError && error.status === 404
            ? "Nu am găsit cazarea. Deschide pagina ei din catalogul CABN și copiază linkul complet din bara de adrese."
            : error instanceof Error ? error.message : "Cererea nu a putut fi trimisă. Încearcă din nou.",
        });
        setClaimStep("details");
      }
    } finally {
      if (activeRef.current) setClaimSubmitting(false);
    }
  };

  return (
    <section id="owner-access" aria-label="Acces la o cazare existentă" className="scroll-mt-24 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="owner-claim-content"
        onClick={() => setIsOpen((current) => !current)}
        disabled={claimSubmitting}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl py-2 pr-3 text-left text-sm font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-200"
      >
        Administrezi o cazare deja listată?
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
        <div id="owner-claim-content" hidden={!isOpen} className="mt-3 max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">Solicită acces la cazare</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">Trimite o cerere pentru a administra o cazare existentă în catalog. Echipa CABN verifică solicitarea înainte de a acorda accesul.</p>
          {claimStep === "success" ? (
            <div className="mt-5 space-y-4">
              <h3 ref={claimStepTitleRef} tabIndex={-1} className="text-lg font-semibold text-zinc-950 outline-none dark:text-white">
                Cererea a fost trimisă
              </h3>
              <ListingSubmitFeedback message={claimFeedback?.message || null} tone="success" />
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Echipa CABN va verifica solicitarea. După aprobare, cazarea va apărea în lista de proprietăți de mai sus și o vei putea administra. Poți urmări starea în „Solicitările tale de acces”.
              </p>
              <button
                type="button"
                onClick={() => {
                  setClaimFeedback(null);
                  setClaimStep("details");
                }}
                disabled={refreshing || signingOut}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Solicită acces la altă cazare
              </button>
            </div>
          ) : (
            <form onSubmit={handleClaim} aria-label="Solicită administrarea unei cazări" aria-busy={claimSubmitting} className="mt-5">
              <fieldset disabled={claimSubmitting || signingOut || refreshing} className="space-y-4">
                {claimFeedback && (
                  <div id="claim-feedback">
                    <ListingSubmitFeedback message={claimFeedback.message} tone={claimFeedback.tone} />
                  </div>
                )}
                {claimStep === "details" ? (
                  <>
                    <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/60">
                      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        Găsește cazarea în catalog, deschide pagina ei și copiază linkul din bara de adrese.
                      </p>
                      <Link href="/" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
                        Caută cazarea pe CABN
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">(se deschide într-o filă nouă)</span>
                      </Link>
                    </div>
                    <div>
                      <label htmlFor="listing-reference" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Linkul paginii cazării
                      </label>
                      <input
                        ref={claimReferenceRef}
                        id="listing-reference"
                        type="text"
                        inputMode="url"
                        autoCapitalize="none"
                        autoComplete="off"
                        spellCheck={false}
                        value={listingReference}
                        onChange={(event) => {
                          setListingReference(event.target.value);
                          setClaimFeedback(null);
                        }}
                        placeholder="https://www.cabn.ro/cazare/numele-cazarii"
                        required
                        maxLength={300}
                        aria-invalid={claimFeedback?.tone === "error"}
                        aria-describedby={`listing-reference-help${claimFeedback ? " claim-feedback" : ""}`}
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      <p id="listing-reference-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Folosește linkul paginii de prezentare a cazării, nu doar numele acesteia.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="claim-full-name" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Nume și prenume <span className="font-normal text-zinc-500">(obligatoriu)</span>
                      </label>
                      <input
                        id="claim-full-name"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        value={claimContact.fullName}
                        onChange={(event) => updateClaimContact("fullName", event.target.value)}
                        required
                        minLength={3}
                        maxLength={OWNER_CLAIM_LIMITS.fullName}
                        aria-invalid={Boolean(claimErrors.fullName)}
                        aria-describedby={claimErrors.fullName ? "claim-full-name-error" : undefined}
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      {claimErrors.fullName && (
                        <p id="claim-full-name-error" role="alert" className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300">{claimErrors.fullName}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="claim-phone" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Număr de telefon <span className="font-normal text-zinc-500">(obligatoriu)</span>
                      </label>
                      <input
                        id="claim-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        value={claimContact.phone}
                        onChange={(event) => updateClaimContact("phone", event.target.value)}
                        placeholder="0722 123 456 sau +40 722 123 456"
                        required
                        maxLength={OWNER_CLAIM_LIMITS.phone}
                        aria-invalid={Boolean(claimErrors.phone)}
                        aria-describedby={`claim-phone-help${claimErrors.phone ? " claim-phone-error" : ""}`}
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      <p id="claim-phone-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Echipa CABN te poate contacta la acest număr pentru verificarea cererii. Numărul nu va fi afișat pe pagina publică a cazării.
                      </p>
                      {claimErrors.phone && (
                        <p id="claim-phone-error" role="alert" className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300">{claimErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="claim-role" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Calitatea în care soliciți acces <span className="font-normal text-zinc-500">(obligatoriu)</span>
                      </label>
                      <select
                        id="claim-role"
                        name="role"
                        value={claimContact.role}
                        onChange={(event) => updateClaimContact("role", event.target.value)}
                        required
                        aria-invalid={Boolean(claimErrors.role)}
                        aria-describedby={claimErrors.role ? "claim-role-error" : undefined}
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      >
                        <option value="" disabled>Selectează calitatea</option>
                        {OWNER_CLAIM_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                      {claimErrors.role && (
                        <p id="claim-role-error" role="alert" className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300">{claimErrors.role}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="claim-email" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Emailul contului
                      </label>
                      <input
                        id="claim-email"
                        type="email"
                        value={email || ""}
                        readOnly
                        aria-describedby="claim-email-help"
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-600 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300"
                      />
                      <p id="claim-email-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Preluat automat din contul autentificat. Accesul va fi asociat acestui cont după aprobare.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="claim-message" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Detalii suplimentare <span className="font-normal text-zinc-500">(opțional)</span>
                      </label>
                      <textarea
                        id="claim-message"
                        name="message"
                        value={claimMessage}
                        onChange={(event) => {
                          setClaimMessage(event.target.value);
                          setClaimErrors((current) => ({ ...current, message: undefined }));
                          setClaimFeedback(null);
                        }}
                        rows={3}
                        maxLength={OWNER_CLAIM_LIMITS.message}
                        aria-invalid={Boolean(claimErrors.message)}
                        aria-describedby={`claim-message-help${claimErrors.message ? " claim-message-error" : ""}`}
                        placeholder="De exemplu: unde putem verifica legătura ta cu această cazare."
                        className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      <p id="claim-message-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Câteva detalii ne ajută să verificăm solicitarea.
                      </p>
                      {claimErrors.message && (
                        <p id="claim-message-error" role="alert" className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300">{claimErrors.message}</p>
                      )}
                    </div>
                    <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-offset-zinc-900">
                      Continuă
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <h3 ref={claimStepTitleRef} tabIndex={-1} className="text-lg font-semibold text-zinc-950 outline-none dark:text-white">
                      Verifică cererea înainte de trimitere
                    </h3>
                    <dl className="space-y-3 rounded-2xl bg-zinc-50 p-4 text-sm dark:bg-zinc-950/60">
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Pagina cazării</dt>
                        <dd className="mt-1 break-words text-zinc-600 dark:text-zinc-300">{listingReference.trim()}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Nume și prenume</dt>
                        <dd className="mt-1 break-words text-zinc-600 dark:text-zinc-300">{claimContact.fullName.trim().replace(/\s+/g, " ")}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Telefon de contact</dt>
                        <dd className="mt-1 break-words text-zinc-600 dark:text-zinc-300">{claimContact.phone.trim()}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Calitate</dt>
                        <dd className="mt-1 text-zinc-600 dark:text-zinc-300">{OWNER_CLAIM_ROLES.find((role) => role.value === claimContact.role)?.label}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Contul care solicită acces</dt>
                        <dd className="mt-1 break-words text-zinc-600 dark:text-zinc-300">{email}</dd>
                      </div>
                      {claimMessage.trim() && (
                        <div>
                          <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Detalii pentru verificare</dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words text-zinc-600 dark:text-zinc-300">{claimMessage.trim()}</dd>
                        </div>
                      )}
                    </dl>
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      Trimiterea cererii nu acordă acces imediat. Echipa CABN verifică solicitarea înainte de asocierea proprietății cu acest cont.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => setClaimStep("details")} className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                        Înapoi
                      </button>
                      <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-offset-zinc-900">
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {claimSubmitting ? "Se trimite cererea..." : "Trimite cererea de acces"}
                      </button>
                    </div>
                  </>
                )}
              </fieldset>
            </form>
          )}
        </div>
      {claims.length > 0 && (
        <details className="mt-1 max-w-2xl">
          <summary className="min-h-11 cursor-pointer rounded-xl py-3 text-sm text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-zinc-400">Solicitările tale de acces ({claims.length})</summary>
          <div className="rounded-2xl border border-zinc-200 px-5 py-1 dark:border-zinc-800">
            <ul className="mt-5 divide-y divide-zinc-100 dark:divide-white/10">
              {claims.map((claim) => {
                const status = claimStatusPresentation(claim.status);
                return (
                  <li key={claim.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-zinc-900 dark:text-white">
                          {claim.listingTitle}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Trimisă la {formatOwnerDate(claim.createdAt)}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                          {status.description}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-bold ${status.className}`}>{status.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      )}
    </section>
  );
}

