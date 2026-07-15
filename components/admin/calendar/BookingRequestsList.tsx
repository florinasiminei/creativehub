'use client';

import { useEffect, useState } from 'react';
import { fetchBookingRequests } from '@/lib/calendar/client';
import type { BookingRequest, BookingRequestStatus } from '@/lib/calendar/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/calendar/types';

type Props = {
  onSelectRequest?: (request: BookingRequest) => void;
  refreshKey?: number;
};

export default function BookingRequestsList({ onSelectRequest, refreshKey = 0 }: Props) {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingRequestStatus | 'all'>('cerere_primita');

  useEffect(() => {
    loadRequests();
  }, [refreshKey]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await fetchBookingRequests();
      setRequests(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut încărca cererile.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  if (loading) {
    return <div className="p-6 text-center">Se încarcă...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-emerald-600 text-white'
              : 'border border-gray-200 bg-white hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900'
          }`}
        >
          Toate ({requests.length})
        </button>
        {(['cerere_primita', 'in_verificare', 'confirmata', 'reprogramare_propusa', 'anulata', 'finalizata'] as const).map(status => {
          const count = requests.filter(r => r.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === status
                  ? 'bg-emerald-600 text-white'
                  : 'border border-gray-200 bg-white hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900'
              }`}
            >
              {STATUS_LABELS[status]} ({count})
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Cazare</th>
              <th className="px-4 py-3 text-left font-semibold">Contact</th>
              <th className="px-4 py-3 text-left font-semibold">Localitate</th>
              <th className="px-4 py-3 text-left font-semibold">Data preferată</th>
              <th className="px-4 py-3 text-left font-semibold">Regulă</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Nicio cerere găsită
                </td>
              </tr>
            ) : (
              filtered.map(request => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onSelectRequest?.(request)}
                      className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      {request.property_name}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <div>{request.contact_name}</div>
                      <div className="text-gray-500">{request.phone}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {request.city ? `${request.city}${request.sat ? `, ${request.sat}` : ''}` : request.judet}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {new Date(request.preferred_date).toLocaleDateString('ro-RO')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {request.applied_rule
                      ? `${request.applied_rule.judet}${request.applied_rule.city ? ` / ${request.applied_rule.city}` : ''}`
                      : 'Fără regulă'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[request.status]}`}>
                      {STATUS_LABELS[request.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onSelectRequest?.(request)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Detalii
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
