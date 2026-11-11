const JOURNEY_KEY = "cabn_collection_listing_v1";
const JOURNEY_WINDOW_MS = 30 * 60 * 1000;
const COLLECTION_PATH = /^\/(?:cazari(?:\/[^/]+){0,3}|(?:judet|regiune|localitate)\/[^/]+)\/?$/;
const LISTING_PATH = /^\/cazare\/[^/]+\/?$/;

type ListingJourney = { listingPath: string; collectionPath: string; enteredAt: number };
type ContactMethod = "phone" | "whatsapp";

let currentJourney: ListingJourney | null = null;

function isCollectionPath(path: string) {
  return path === "/" || COLLECTION_PATH.test(path);
}

function sendListingEvent(
  eventName: "collection_listing_view" | "listing_contact_click",
  parameters: Record<string, string>
) {
  const analytics = window as Window & {
    gtag?: (command: "event", name: string, params: Record<string, string>) => void;
  };
  if (analytics.gtag) {
    analytics.gtag("event", eventName, parameters);
  } else {
    // The layout signals readiness after queuing the GA4 configuration.
    window.addEventListener("cabn:ga-ready", () => {
      analytics.gtag?.("event", eventName, parameters);
    }, { once: true });
  }
}

function isListingPreview() {
  const params = new URLSearchParams(window.location.search);
  return params.get("preview") === "1" || params.get("draft") === "1";
}

function rememberJourney(journey: ListingJourney | null) {
  currentJourney = journey;
  try {
    if (journey) sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
    else sessionStorage.removeItem(JOURNEY_KEY);
  } catch {
    // Client navigation can still use the in-memory journey.
  }
}

function getCollectionPath(listingPath: string) {
  let journey = currentJourney;
  if (!journey) {
    try {
      journey = JSON.parse(sessionStorage.getItem(JOURNEY_KEY) ?? "null");
    } catch {
      return null;
    }
  }
  return journey?.listingPath === listingPath &&
    typeof journey.collectionPath === "string" &&
    isCollectionPath(journey.collectionPath) &&
    typeof journey.enteredAt === "number" &&
    Date.now() - journey.enteredAt < JOURNEY_WINDOW_MS
    ? journey.collectionPath
    : null;
}

function getReferrerPath() {
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin ? referrer.pathname : "";
  } catch {
    return "";
  }
}

export function trackCollectionListingView(listingPath: string, previousPath: string | null) {
  if (listingPath === previousPath || !LISTING_PATH.test(listingPath) || isListingPreview()) return;

  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!previousPath && navigation?.type === "reload") return;

  const collectionPath = previousPath ?? (navigation?.type === "back_forward" ? "" : getReferrerPath());
  if (!isCollectionPath(collectionPath)) {
    rememberJourney(null);
    return;
  }

  rememberJourney({ listingPath, collectionPath, enteredAt: Date.now() });
  sendListingEvent("collection_listing_view", {
    collection_path: collectionPath,
    page_location: `${window.location.origin}${listingPath}`,
  });
}

export function trackListingContact(method: ContactMethod) {
  if (isListingPreview()) return;
  const listingPath = window.location.pathname;
  const collectionPath = getCollectionPath(listingPath);
  sendListingEvent("listing_contact_click", {
    contact_method: method,
    page_location: `${window.location.origin}${listingPath}`,
    ...(collectionPath ? { collection_path: collectionPath } : {}),
  });
}
