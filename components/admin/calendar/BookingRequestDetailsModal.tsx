'use client';

import { useMemo, useState } from 'react';
import { updateBookingRequestStatus } from '@/lib/calendar/client';
import type { BookingRequest, BookingRequestStatus, ExternalLink } from '@/lib/calendar/types';
import { STATUS_LABELS } from '@/lib/calendar/types';

type Props = {
  request: BookingRequest;
  onClose: () => void;
  onRequestUpdated?: () => void;
};

export default function BookingRequestDetailsModal({ request, onClose, onRequestUpdated }: Props) {
  const [status, setStatus] = useState<BookingRequestStatus>(request.status);
  const [confirmedDate, setConfirmedDate] = useState(request.confirmed_date || '');
  const [proposedDate, setProposedDate] = useState(request.proposed_date || '');
  const [rejectionReason, setRejectionReason] = useState(request.rejection_reason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const externalLinks = useMemo(() => normalizeExternalLinks(request.external_links), [request.external_links]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      await updateBookingRequestStatus(request.id, {
        status,
        confirmed_date: status === 'confirmata' ? confirmedDate : undefined,
        proposed_date: status === 'reprogramare_propusa' ? proposedDate : undefined,
        rejection_reason: status === 'anulata' ? rejectionReason : undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onRequestUpdated?.();
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut actualiza cererea.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-lg dark:bg-zinc-900">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{request.property_name}</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  De la: {request.contact_name} · {request.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Închide"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
          </div>

          <div className="space-y-6 p-6">
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
                Cererea a fost actualizată.
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="Localitate" value={request.city ? `${request.city}${request.sat ? `, ${request.sat}` : ''}` : request.judet} />
                <Info label="Județ" value={request.judet} />
                <Info label="Data preferată" value={formatDate(request.preferred_date)} mono />
                <Info label="Data confirmată" value={request.confirmed_date ? formatDate(request.confirmed_date) : '-'} mono />
                <Info label="Data propusă" value={request.proposed_date ? formatDate(request.proposed_date) : '-'} mono />
                <Info label="Lead / proprietate" value={request.listing_id ? 'Asociată' : 'Neasociată'} />
              </div>

              <div className="rounded-lg border border-gray-200 p-3 text-sm dark:border-zinc-800">
                <div className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Regula aplicată
                </div>
                {request.applied_rule ? (
                  <div className="mt-2 space-y-1 text-gray-800 dark:text-gray-200">
                    <div>{request.applied_rule.judet}{request.applied_rule.city ? ` / ${request.applied_rule.city}` : ''}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Max {request.applied_rule.max_visits_per_day || 'global'} deplasari/zi · weekend {request.applied_rule.allow_weekends ? 'permis' : 'nepermis'} · aprobare {request.applied_rule.requires_manual_approval ? 'manuala' : 'optionala'}
                      {request.applied_rule.available_after_time && ` · dupa ora ${request.applied_rule.available_after_time}`}
                    </div>
                    {request.applied_rule.travel_cost_supplement != null && request.applied_rule.travel_cost_supplement > 0 && (
                      <div className="text-xs text-orange-700 dark:text-orange-300">
                        Cost suplimentar: {request.applied_rule.travel_cost_supplement} RON
                      </div>
                    )}
                    {request.applied_rule.internal_notes && (
                      <div className="text-xs italic text-gray-600 dark:text-gray-400">
                        {request.applied_rule.internal_notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Nu s-a aplicat nicio regulă specifică.</p>
                )}
              </div>

              {request.notes && (
                <div>
                  <div className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                    Observații client
                  </div>
                  <p className="mt-1 rounded bg-gray-50 p-2 text-sm dark:bg-zinc-800">
                    {request.notes}
                  </p>
                </div>
              )}

              {externalLinks.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                    Linkuri cazare
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {externalLinks.map((link, idx) => (
                      <a
                        key={`${link.platform}-${idx}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200"
                      >
                        {link.platform}
                        <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-6 dark:border-zinc-800">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BookingRequestStatus)}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {(['cerere_primita', 'in_verificare', 'confirmata', 'reprogramare_propusa', 'anulata', 'finalizata'] as const).map(s => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              {status === 'confirmata' && (
                <DateField label="Data confirmată" value={confirmedDate} onChange={setConfirmedDate} />
              )}

              {status === 'reprogramare_propusa' && (
                <DateField label="Data propusă" value={proposedDate} onChange={setProposedDate} />
              )}

              {status === 'anulata' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Motiv anulare
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Introduceți motivul anulării..."
                    rows={3}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-800"
              >
                {loading ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
        {label}
      </div>
      <p className={`mt-1 text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
      />
    </div>
  );
}

function normalizeExternalLinks(value: BookingRequest['external_links'] | string): ExternalLink[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ro-RO');
}
