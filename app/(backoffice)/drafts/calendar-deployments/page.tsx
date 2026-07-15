export const revalidate = 0;

import Link from 'next/link';
import CalendarDeploymentsClient from './calendar-deployments-client';

export default function CalendarDeploymentsAdminPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 dark:text-gray-100">
        <Link href="/drafts" className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400">← Inapoi la backoffice</Link>
        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar Deplasari</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Programare si gestionare a vizitelor foto/video la cabane si case de inchiriat.</p>
        </div>
        <CalendarDeploymentsClient />
      </div>
    </div>
  );
}
