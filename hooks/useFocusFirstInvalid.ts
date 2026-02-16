import { useEffect } from 'react';

type UseFocusFirstInvalidOptions = {
  enabled: boolean;
  attempt: number;
  scopeSelector?: string;
};

export default function useFocusFirstInvalid({
  enabled,
  attempt,
  scopeSelector,
}: UseFocusFirstInvalidOptions) {
  useEffect(() => {
    if (!enabled || attempt < 1) return;
    if (typeof document === 'undefined') return;

    const root = scopeSelector ? document.querySelector(scopeSelector) : document;
    if (!root) return;

    const invalidTarget = root.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!invalidTarget) return;

    invalidTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const focusableSelector = 'input, textarea, select, button, [tabindex]';
    const focusTarget = invalidTarget.matches(focusableSelector)
      ? invalidTarget
      : invalidTarget.querySelector<HTMLElement>(focusableSelector);

    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus({ preventScroll: true });
    }
  }, [attempt, enabled, scopeSelector]);
}
