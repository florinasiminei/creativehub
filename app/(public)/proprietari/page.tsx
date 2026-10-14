"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { ArrowUpRight, Building2, LogOut, Plus, RefreshCw } from "lucide-react";
import OwnerOtpGate from "@/components/forms/OwnerOtpGate";
import FormPageShell, { FormPageState } from "@/components/forms/FormPageShell";
import ListingSubmitFeedback from "@/components/forms/ListingSubmitFeedback";
import OwnerListingCard, { type OwnerListing } from "@/components/owner/OwnerListingCard";
import OwnerClaimSection, { type OwnerClaim } from "@/components/owner/OwnerClaimSection";
import { fetchOwnerApi } from "@/lib/api/ownerSession";
import { OwnerRequestError, readOwnerResponse } from "@/lib/ownerPortal";

type OwnerPlan = {
  name: string;
  amount: number;
  currency: string;
  durationMonths: number;
};

type OwnerOverview = {
  user: { email: string | null };
  listings: OwnerListing[];
  claims: OwnerClaim[];
  plan: OwnerPlan | null;
  instagramPromotionEnabled: boolean;
  instagramPromotionStatusAvailable: boolean;
};

const cardClassName =
  "rounded-[26px] border border-zinc-200 bg-white shadow-[0_20px_50px_-36px_rgba(15,23,42,0.5)] dark:border-zinc-800 dark:bg-zinc-900";

function formatPrice(plan: OwnerPlan | null) {
  if (!plan) return null;
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: plan.currency || "RON",
    maximumFractionDigits: 0,
  }).format(plan.amount);
}

function OwnerDashboard({
  session,
  signOut,
  initialListingReference,
  paymentResult,
  submissionResult,
  updatedResult,
}: {
  session: Session;
  signOut: () => Promise<void>;
  initialListingReference: string;
  paymentResult: string;
  submissionResult: string;
  updatedResult: string;
}) {
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<{
    message: string;
    requiresLogin: boolean;
    schemaUnavailable: boolean;
  } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [checkoutListingId, setCheckoutListingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(
    paymentResult === "succes"
      ? "Plata a fost trimisă. Actualizăm starea publicării imediat ce este confirmată."
      : paymentResult === "anulata"
        ? "Plata a fost anulată. Poți relua reînnoirea oricând."
        : submissionResult === "1"
          ? "Proprietatea a fost trimisă spre verificare."
          : updatedResult === "1"
            ? "Modificările proprietății au fost salvate."
        : null
  );
  const [feedbackTone, setFeedbackTone] = useState<"error" | "success" | "info">(
    paymentResult === "succes" || submissionResult === "1" || updatedResult === "1"
      ? "success"
      : "info"
  );
  const activeRef = useRef(true);
  const overviewRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      overviewRequestRef.current?.abort();
    };
  }, []);

  const handleRequestError = useCallback((error: unknown, fallback: string, replaceOverview = false) => {
    const message = error instanceof Error ? error.message : fallback;
    const requiresLogin = error instanceof OwnerRequestError && error.status === 401;
    if (replaceOverview || requiresLogin) {
      setOverview(null);
      setOverviewError({
        message,
        requiresLogin,
        schemaUnavailable: error instanceof OwnerRequestError && error.code === "OWNER_PORTAL_SCHEMA_UNAVAILABLE",
      });
      return;
    }
    setFeedbackTone("error");
    setFeedback(message);
  }, []);

  const loadOverview = useCallback(async (options?: { quiet?: boolean }) => {
    overviewRequestRef.current?.abort();
    const controller = new AbortController();
    overviewRequestRef.current = controller;
    setOverviewError(null);
    setRefreshError(null);
    if (!options?.quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetchOwnerApi(session.user.id, "/api/owner", {
        signal: controller.signal,
      });
      const body = await readOwnerResponse(response);
      if (!activeRef.current || controller.signal.aborted) return;
      if (!Array.isArray(body?.listings) || !Array.isArray(body?.claims)) {
        throw new Error("Răspunsul contului este incomplet. Încearcă din nou.");
      }
      setOverview({
        user: body?.user || { email: session.user.email || null },
        listings: body.listings,
        claims: body.claims,
        plan: body?.plan || null,
        instagramPromotionEnabled: body?.instagramPromotionEnabled === true,
        instagramPromotionStatusAvailable: body?.instagramPromotionStatusAvailable === true,
      });
    } catch (error) {
      if (!activeRef.current || controller.signal.aborted) return;
      if (options?.quiet && !(error instanceof OwnerRequestError && error.status === 401)) {
        setRefreshError("Nu am putut actualiza contul. Informațiile afișate sunt de la ultima încărcare. Încearcă din nou.");
      } else {
        handleRequestError(error, "Nu am putut încărca spațiul de proprietar.", true);
      }
    } finally {
      if (activeRef.current && !controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [handleRequestError, session.user.id, session.user.email]);

  useEffect(() => {
    void loadOverview();
    return () => overviewRequestRef.current?.abort();
  }, [loadOverview]);

  const handleCheckout = async (listingId: string) => {
    if (checkoutListingId || signingOut || refreshing) return;
    setCheckoutListingId(listingId);
    setFeedback(null);
    try {
      const response = await fetchOwnerApi(session.user.id, "/api/owner/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId }),
      });
      const body = await readOwnerResponse(response);
      if (!activeRef.current) return;
      if (!body?.url) throw new Error("Linkul de plată nu este disponibil.");
      window.location.assign(String(body.url));
    } catch (error) {
      if (!activeRef.current) return;
      handleRequestError(error, "Nu am putut deschide plata.");
      setCheckoutListingId(null);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      if (!activeRef.current) return;
      setFeedbackTone("error");
      setFeedback(error instanceof Error ? error.message : "Nu am putut închide sesiunea.");
      setSigningOut(false);
    }
  };

  if (!overview) {
    const busy = loading || refreshing;
    return (
      <FormPageShell
        eyebrow="Cont proprietar"
        title={overviewError?.requiresLogin ? "Confirmă din nou accesul" : "Spațiul tău CABN"}
        description={`Cont: ${session.user.email || "proprietar"}. ${busy ? "Pregătim proprietățile și starea publicării." : "Proprietățile vor apărea după încărcarea cu succes a contului."}`}
      >
        {busy ? (
          <FormPageState title="Se încarcă..." description="Verificăm proprietățile asociate contului." />
        ) : (
          <div role="alert" className={`${cardClassName} p-5 sm:p-6`}>
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
              {overviewError?.requiresLogin
                ? "Sesiunea a expirat"
                : overviewError?.schemaUnavailable
                  ? "Administrarea proprietăților este indisponibilă"
                  : "Nu am putut încărca proprietățile"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {overviewError?.message || "Încearcă din nou în câteva momente."}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {!overviewError?.requiresLogin && (
            <button
              type="button"
              onClick={() => void loadOverview()}
              disabled={busy || signingOut}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
              {busy ? "Se încarcă..." : "Încearcă din nou"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? "Se închide..." : overviewError?.requiresLogin ? "Autentifică-te din nou" : "Ieși din cont"}
          </button>
          {!busy && !overviewError?.requiresLogin && (
            <Link href="/contact" className="text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
              Contactează echipa CABN
            </Link>
          )}
        </div>
        {feedbackTone === "error" && <ListingSubmitFeedback message={feedback} tone="error" />}
      </FormPageShell>
    );
  }

  const listings = overview.listings;
  const planPrice = formatPrice(overview.plan);
  const publishedCount = listings.filter((listing) => listing.isPublished).length;
  const submittedCount = listings.filter((listing) => listing.status === "submitted").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Cont proprietar</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl dark:text-white">Spațiul tău CABN</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{overview.instagramPromotionEnabled ? "Cazările tale, starea publicării și promovarea Instagram." : "Cazările tale și starea publicării, într-un singur loc."}</p>
          <p className="mt-1 break-all text-xs leading-5 text-zinc-500 dark:text-zinc-400">{overview.user.email || session.user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {listings.length > 0 && (
            <Link href="/add-property" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus-visible:ring-offset-zinc-950">
              <Plus className="h-4 w-4" aria-hidden="true" />Adaugă o cazare
            </Link>
          )}
          <button type="button" onClick={() => void loadOverview({ quiet: true })} disabled={refreshing || signingOut} aria-label={refreshing ? "Se actualizează contul" : "Actualizează contul"} title="Actualizează contul" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
            <LogOut className="h-4 w-4" aria-hidden="true" />{signingOut ? "Se închide..." : "Ieși din cont"}
          </button>
        </div>
      </header>

      <ListingSubmitFeedback message={feedback} tone={feedbackTone} />
      <ListingSubmitFeedback message={refreshError} tone="error" />

      <section aria-labelledby="owner-listings-title" aria-busy={refreshing}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 id="owner-listings-title" className="text-xl font-semibold text-zinc-950 dark:text-white">Cazările tale</h2>
          {listings.length > 0 && <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{listings.length} {listings.length === 1 ? "cazare" : "cazări"} · {publishedCount} {publishedCount === 1 ? "publicată" : "publicate"}{submittedCount > 0 ? ` · ${submittedCount} în verificare` : ""}</p>}
        </div>
        {listings.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-zinc-200 bg-white px-6 py-10 text-center sm:py-14 dark:border-zinc-700 dark:bg-zinc-900">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><Building2 className="h-6 w-6" aria-hidden="true" /></span>
            <h3 className="mt-4 text-xl font-semibold text-zinc-950 dark:text-white">Prima ta cazare începe aici</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-300">Adaugă fotografiile și detaliile, apoi trimite cazarea spre verificare. O vei putea administra din acest cont.</p>
            <Link href="/add-property" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus-visible:ring-offset-zinc-900">
              Adaugă prima cazare gratuit<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="grid items-stretch gap-5 xl:grid-cols-2">
            {listings.map((listing) => (
              <OwnerListingCard key={listing.id} listing={listing} promotionEnabled={overview.instagramPromotionEnabled} promotionStatusAvailable={overview.instagramPromotionStatusAvailable} planPrice={planPrice} checkoutListingId={checkoutListingId} actionsDisabled={signingOut || refreshing} onCheckout={(listingId) => void handleCheckout(listingId)} />
            ))}
          </div>
        )}
      </section>

      <OwnerClaimSection ownerId={session.user.id} email={session.user.email || ""} initialListingReference={initialListingReference} claims={overview.claims} signingOut={signingOut} refreshing={refreshing} onSubmitted={() => loadOverview({ quiet: true })} onAuthError={(error) => handleRequestError(error, "Cererea nu a putut fi trimisă.")} />

      <p className="text-xs leading-6 text-zinc-500 dark:text-zinc-400">Ai nevoie de ajutor? <Link href="/contact" className="inline-flex min-h-11 items-center rounded-md font-medium text-emerald-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300">Contactează echipa CABN</Link></p>
    </div>
  );
}

function OwnerPageContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "";
  const paymentResult = searchParams.get("plata") || "";
  const submissionResult = searchParams.get("trimis") || "";
  const updatedResult = searchParams.get("actualizat") || "";
  const initialListingReference = searchParams.get("listing") || searchParams.get("claim") || "";

  return (
    <OwnerOtpGate nextPath={nextPath}>
      {({ session, signOut }) => (
        <OwnerDashboard
          session={session}
          signOut={signOut}
          initialListingReference={initialListingReference}
          paymentResult={paymentResult}
          submissionResult={submissionResult}
          updatedResult={updatedResult}
        />
      )}
    </OwnerOtpGate>
  );
}

export default function OwnerPage() {
  return <Suspense fallback={<FormPageState title="Se încarcă..." description="Pregătim contul de proprietar." />}><OwnerPageContent /></Suspense>;
}
