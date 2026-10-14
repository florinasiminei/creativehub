"use client";

import { Fragment, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { KeyRound, Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import FormPageShell, { FormPageState } from "./FormPageShell";
import ListingSubmitFeedback from "./ListingSubmitFeedback";

type OwnerOtpGateContext = {
  session: Session;
  signOut: () => Promise<void>;
};

type OwnerOtpGateProps = {
  children: ReactNode | ((context: OwnerOtpGateContext) => ReactNode);
  nextPath?: string | null;
  purpose?: "portal" | "listing-create" | "promotion";
};

const RESEND_COOLDOWN_SECONDS = 60;

function isOwnerSession(session: Session | null): session is Session {
  return Boolean(session?.user.email && session.user.email_confirmed_at && !session.user.is_anonymous);
}

function getSafeNextPath(value?: string | null) {
  const nextPath = String(value || "").trim();
  if (!nextPath.startsWith("/") || nextPath.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(nextPath)) return null;
  try {
    const base = "https://cabn.ro";
    const destination = new URL(nextPath, base);
    if (destination.origin !== base || destination.pathname.startsWith("//")) return null;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

function ListingSubmissionShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-950">
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center py-6 sm:py-10">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

export default function OwnerOtpGate({ children, nextPath, purpose = "portal" }: OwnerOtpGateProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "success" | "info">("info");
  const redirectedRef = useRef(false);
  const authRequestIdRef = useRef(0);
  const safeNextPath = useMemo(() => getSafeNextPath(nextPath), [nextPath]);
  const isListingCreation = purpose === "listing-create";
  const isPromotion = purpose === "promotion";

  const resetLoginState = useCallback(() => {
    authRequestIdRef.current += 1;
    redirectedRef.current = false;
    setSession(null);
    setEmail("");
    setOtp("");
    setCodeSent(false);
    setShowCodeEntry(false);
    setCooldown(0);
    setSubmitting(false);
    setMessage(null);
    setSessionCheckFailed(false);
  }, []);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    const callbackParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    if (callbackParams.has("error") || queryParams.has("error")) {
      setTone("error");
      setMessage("Linkul de autentificare nu este valid sau a expirat. Solicită un link nou pentru a continua.");
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEventReceived) return;
      if (error) {
        const accessExpired = Boolean(error.status && error.status < 500 && error.status !== 429);
        setSessionCheckFailed(!accessExpired);
        if (accessExpired) {
          setSession(null);
          setTone("error");
          setMessage("Accesul a expirat sau linkul nu mai este valid. Solicită un link nou pentru a continua.");
        }
        setSessionLoading(false);
        return;
      }
      setSessionCheckFailed(false);
      setSession(isOwnerSession(data.session) ? data.session : null);
      setSessionLoading(false);
    }).catch(() => {
      if (!active || authEventReceived) return;
      setSessionCheckFailed(true);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event !== "INITIAL_SESSION") authEventReceived = true;
      if (event === "SIGNED_OUT") {
        resetLoginState();
        setSessionLoading(false);
        return;
      }
      if (isOwnerSession(nextSession)) setSessionCheckFailed(false);
      if (!nextSession) redirectedRef.current = false;
      setSession(isOwnerSession(nextSession) ? nextSession : null);
      setSessionLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [resetLoginState, sessionCheckAttempt]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const intervalId = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [cooldown]);

  useEffect(() => {
    if (!session || !safeNextPath || redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace(safeNextPath);
  }, [router, safeNextPath, session]);

  const sendOtp = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setTone("error");
      setMessage(
        isListingCreation
          ? "Introdu adresa de email pe care vei administra proprietatea."
          : "Introdu adresa de email folosită pentru contul de proprietar.",
      );
      return;
    }

    setSubmitting(true);
    setMessage(null);
    const requestId = ++authRequestIdRef.current;
    try {
      const emailRedirectUrl = new URL(
        `${window.location.pathname}${window.location.search}`,
        window.location.origin
      );
      if (safeNextPath) emailRedirectUrl.searchParams.set("next", safeNextPath);
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: emailRedirectUrl.toString(),
        },
      });
      if (error) throw error;
      if (requestId !== authRequestIdRef.current) return;

      setEmail(normalizedEmail);
      setCodeSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setTone("success");
      setMessage(
        "Ți-am trimis linkul de autentificare pe email. Verifică și folderul Spam.",
      );
    } catch (error) {
      if (requestId !== authRequestIdRef.current) return;
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Nu am putut trimite linkul de autentificare.");
    } finally {
      if (requestId === authRequestIdRef.current) setSubmitting(false);
    }
  }, [email, isListingCreation, safeNextPath]);

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    await sendOtp();
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    const token = otp.trim();
    if (!token) {
      setTone("error");
      setMessage("Introdu codul primit pe email.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    const requestId = ++authRequestIdRef.current;
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "email",
      });
      if (error) throw error;
      if (requestId !== authRequestIdRef.current) return;
      if (!isOwnerSession(data.session)) throw new Error("Confirmă emailul contului pentru a continua.");
      setSession(data.session);
      setTone("success");
      setMessage(
        isListingCreation
          ? "Email confirmat. Poți completa formularul proprietății."
          : "Contul a fost autentificat.",
      );
    } catch (error) {
      if (requestId !== authRequestIdRef.current) return;
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Codul nu este valid sau a expirat.");
    } finally {
      if (requestId === authRequestIdRef.current) setSubmitting(false);
    }
  };

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    resetLoginState();
  }, [resetLoginState]);

  if (sessionCheckFailed) {
    const content = (
      <div className="space-y-4">
        <div role="alert">
          <FormPageState title="Nu am putut verifica sesiunea" description="Verifică conexiunea și încearcă din nou pentru a continua în siguranță." />
        </div>
        <button
          type="button"
          onClick={() => {
            setSessionLoading(true);
            setSessionCheckFailed(false);
            setSessionCheckAttempt((attempt) => attempt + 1);
          }}
          className="inline-flex h-11 items-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          Reverifică sesiunea
        </button>
      </div>
    );
    return isListingCreation ? <ListingSubmissionShell>{content}</ListingSubmissionShell> : (
      <FormPageShell eyebrow="Cont proprietar" title="Spațiul tău CABN" description="Verificarea accesului este temporar indisponibilă.">
        {content}
      </FormPageShell>
    );
  }

  if (sessionLoading) {
    if (isListingCreation) {
      return (
        <ListingSubmissionShell>
          <FormPageState title="Se încarcă..." description="Verificăm contul de proprietar." />
        </ListingSubmissionShell>
      );
    }

    return (
      <FormPageShell
        eyebrow="Cont proprietar"
        title={isPromotion ? "Promovarea ta pe Instagram" : "Spațiul tău CABN"}
        description={isPromotion ? "Verificăm accesul și pregătim postarea cazării tale." : "Verificăm sesiunea și pregătim proprietățile asociate contului."}
      >
        <FormPageState title="Se încarcă..." description="Conectăm în siguranță contul de proprietar." />
      </FormPageShell>
    );
  }

  if (session) {
    if (safeNextPath) {
      return (
        <FormPageShell eyebrow="Cont proprietar" title="Cont autentificat" description="Continuăm către pagina solicitată.">
          <FormPageState title="Se deschide pagina..." description="Pregătim accesul la destinația ta." />
        </FormPageShell>
      );
    }
    return (
      <Fragment key={session.user.id}>
        {typeof children === "function" ? children({ session, signOut }) : children}
      </Fragment>
    );
  }

  const gateContent = (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {codeSent ? <KeyRound className="h-5 w-5" aria-hidden="true" /> : <Mail className="h-5 w-5" aria-hidden="true" />}
            </span>
            <div>
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
                {codeSent
                  ? "Verifică emailul"
                  : isListingCreation
                    ? "Emailul contului de proprietar"
                    : isPromotion ? "Emailul proprietarului" : "Primește accesul securizat"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {codeSent
                  ? isListingCreation
                    ? `Am trimis un link la ${email}. Deschide-l pentru a reveni la formular și a adăuga proprietatea. Nu trebuie să introduci un cod.`
                    : isPromotion ? `Am trimis un link la ${email}. Deschide-l pentru a reveni la postarea ta Instagram.` : `Am trimis un link la ${email}. Deschide-l pentru a intra în cont. Nu trebuie să introduci un cod.`
                  : isListingCreation
                    ? "Conectează-te înainte de a completa formularul. Proprietatea va fi salvată în acest cont când o trimiți spre verificare."
                    : isPromotion ? "Folosește emailul contului care administrează cazarea. Primești un link securizat pentru a edita și aproba postarea." : "Folosește adresa de email pe care vrei să administrezi proprietățile. Primești un link de autentificare, fără parolă."}
              </p>
            </div>
          </div>

          {!codeSent ? (
            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <div>
                <label htmlFor="owner-email" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Adresa de email
                </label>
                <input
                  id="owner-email"
                  type="email"
                  disabled={submitting}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="nume@exemplu.ro"
                  required
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus-visible:ring-offset-zinc-900"
              >
                {submitting ? "Se trimite..." : "Trimite linkul de autentificare"}
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={() => setShowCodeEntry((current) => !current)}
                aria-expanded={showCodeEntry}
                aria-controls="owner-code-form"
                className="text-sm font-medium text-zinc-600 underline underline-offset-4 dark:text-zinc-300"
              >
                {showCodeEntry ? "Ascunde introducerea codului" : "Emailul conține un cod? Introdu-l aici"}
              </button>
              {showCodeEntry && (
                <form id="owner-code-form" onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label htmlFor="owner-otp" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Cod de acces
                    </label>
                    <input
                      id="owner-otp"
                      type="text"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={8}
                      placeholder="000000"
                      required
                      className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-center text-lg font-semibold tracking-[0.35em] text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus-visible:ring-offset-zinc-900"
                  >
                    {submitting ? "Se verifică..." : isListingCreation ? "Continuă la formular" : "Intră în cont"}
                  </button>
                </form>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setCodeSent(false);
                    setShowCodeEntry(false);
                    setOtp("");
                    setMessage(null);
                  }}
                  className="font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                >
                  Schimbă emailul
                </button>
                <button
                  type="button"
                  onClick={() => void sendOtp()}
                  disabled={submitting || cooldown > 0}
                  className="font-semibold text-emerald-700 transition hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  {cooldown > 0 ? `Retrimite în ${cooldown}s` : "Retrimite linkul"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-4">
            <ListingSubmitFeedback message={message} tone={tone} />
          </div>
      </div>
    </>
  );

  if (isListingCreation) {
    return (
      <ListingSubmissionShell>
        <h1 className="mb-2 text-2xl font-semibold text-zinc-950 dark:text-white">Adaugă o proprietate</h1>
        <p className="mb-6 text-sm leading-6 text-zinc-600 dark:text-zinc-300">Primul pas este autentificarea în contul de proprietar.</p>
        {gateContent}
      </ListingSubmissionShell>
    );
  }

  return (
    <FormPageShell
      eyebrow="Cont proprietar"
      title={isPromotion ? "Pregătește postarea Instagram" : "Intră în contul de proprietar"}
      description={isPromotion ? "Personalizează textul și fotografiile cazării, verifică preview-ul și alege dacă aprobi promovarea pe cabn.ro." : "Administrează cazările tale, urmărește starea publicării și pregătește promovările dintr-un singur loc."}
    >
      <div className="mx-auto max-w-xl">{gateContent}</div>
    </FormPageShell>
  );
}
