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
    <div className="space-y-3 rounded-[24px] border border-gray-200 bg-white/90 p-5 shadow-[0_16px_45px_-36px_rgba(15,23,42,0.5)] dark:border-zinc-800 dark:bg-zinc-950/85 dark:shadow-[0_20px_55px_-38px_rgba(0,0,0,0.75)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Confirmari</p>
      <label
        className={`flex items-start gap-2 text-sm ${
          showTermsError ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => onAcceptedTermsChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:ring-emerald-400"
        />
        <span>
          Accept termenii si conditiile<span className="text-red-600 dark:text-red-400"> *</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={newsletterOptIn}
          onChange={(event) => onNewsletterOptInChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:ring-emerald-400"
        />
        <span>Ma alatur newsletterului si comunitatii cabn.</span>
      </label>
    </div>
  );
}
