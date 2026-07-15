export const revalidate = 0;

import Link from 'next/link';
import CalendarRulesClient from './calendar-rules-client';

export default function CalendarRulesPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 dark:text-gray-100">
        <Link href="/drafts/calendar-deployments/settings" className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400">← Inapoi la Setari Calendar</Link>
        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reguli Locatii</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Setari configurabile per judet si localitate pentru programarea deplasarilor.</p>
        </div>
        <CalendarRulesClient />
      </div>
    </div>
  );
}
