export function isConstrainedClientDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const isMobileUa = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const touchDevice = navigator.maxTouchPoints > 0;
  const narrowViewport = window.innerWidth > 0 && window.innerWidth < 900;
  const deviceMemory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0);

  return isMobileUa || (touchDevice && narrowViewport) || (deviceMemory > 0 && deviceMemory <= 4);
}

export const CONSTRAINED_GRID_PREVIEW_LIMIT = 6;
