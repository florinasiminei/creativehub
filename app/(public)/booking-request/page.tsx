import BookingRequestForm from '@/components/calendar/BookingRequestForm';

export const metadata = {
  title: 'Cerere Programare Foto/Video - CABN.ro',
  description: 'Trimiteți o cerere simplă pentru programarea unei vizite foto/video la cabană.',
};

export default function BookingRequestPage() {
  return (
    <main className="min-h-screen bg-white py-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-emerald-950 dark:text-white sm:text-5xl">
            Programare Foto/Video
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Trimiteți o cerere simplă și vă vom contacta pentru confirmare.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="p-6 sm:p-8">
            <BookingRequestForm />
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-6 dark:border-blue-900/40 dark:bg-blue-950/40">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Cum funcționează procesul?
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>Trimiteți cererea cu data preferată.</li>
            <li>Echipa noastră verifică disponibilitatea și regulile locale.</li>
            <li>Vă contactăm telefonic pentru confirmare sau reprogramare.</li>
            <li>Programul foto/video se desfășoară la data confirmată.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
