type ClientListingConsentPanelProps = {
  acceptedTerms: boolean;
  newsletterOptIn: boolean;
  showTermsError?: boolean;
  onAcceptedTermsChange: (checked: boolean) => void;
  onNewsletterOptInChange: (checked: boolean) => void;
};

export default function ClientListingConsentPanel({
  acceptedTerms,
  newsletterOptIn,
  showTermsError = false,
  onAcceptedTermsChange,
  onNewsletterOptInChange,
}: ClientListingConsentPanelProps) {
  return (
    <div className="space-y-3 rounded-[24px] border border-gray-200 bg-white/90 p-5 shadow-[0_16px_45px_-36px_rgba(15,23,42,0.5)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Confirmari</p>
      <label className={`flex items-start gap-2 text-sm ${showTermsError ? "text-red-700" : "text-gray-700"}`}>
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => onAcceptedTermsChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>
          Accept termenii si conditiile<span className="text-red-600"> *</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={newsletterOptIn}
          onChange={(event) => onNewsletterOptInChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>Ma alatur newsletterului si comunitatii cabn.</span>
      </label>
    </div>
  );
}
