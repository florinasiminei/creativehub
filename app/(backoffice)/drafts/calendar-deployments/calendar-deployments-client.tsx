'use client';

import { useState } from 'react';
import BookingRequestsList from '@/components/admin/calendar/BookingRequestsList';
import CalendarMonthView from '@/components/admin/calendar/CalendarMonthView';
import type { BookingRequest } from '@/lib/calendar/types';
import BookingRequestDetailsModal from '@/components/admin/calendar/BookingRequestDetailsModal';
import LeadCreateModal from '@/components/admin/leads/LeadCreateModal';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import { useRouter } from 'next/navigation';

export default function CalendarDeploymentsClient() {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CalendarMonthView
            selectedDate={selectedDate}
            onDateClick={setSelectedDate}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/40">
            <div className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
              Dată selectată
            </div>
            {selectedDate ? (
              <div className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {new Date(selectedDate).toLocaleDateString('ro-RO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            ) : (
              <div className="mt-2 text-gray-500">-</div>
            )}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setCreateLeadOpen(true)}
              className="flex w-full items-center justify-between rounded-lg border border-emerald-200 bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700 dark:border-emerald-700"
            >
              <span className="text-sm font-medium">Lead nou din calendar</span>
              <span>→</span>
            </button>
            <a
              href="/booking-request"
              className="flex w-full items-center justify-between rounded-lg border border-emerald-200 bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700 dark:border-emerald-700"
            >
              <span className="text-sm font-medium">Formular public client</span>
              <span>→</span>
            </a>
            <a
              href="/drafts/calendar-deployments/settings"
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <span className="text-sm font-medium">Setari, Reguli si Blocari</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold">Cererile de Programare</h2>
        <BookingRequestsList onSelectRequest={setSelectedRequest} refreshKey={refreshKey} />
      </div>

      {selectedRequest && (
        <BookingRequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRequestUpdated={() => {
            setRefreshKey((value) => value + 1);
            setSelectedRequest(null);
          }}
        />
      )}

      <LeadCreateModal
        open={createLeadOpen}
        onClose={() => setCreateLeadOpen(false)}
        presetPreferredDate={selectedDate}
        defaultCreateBookingRequest
        onCreated={() => {
          setRefreshKey((value) => value + 1);
          markPageModified();
          router.refresh();
        }}
      />
    </div>
  );
}
