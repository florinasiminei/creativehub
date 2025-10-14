import Link from "next/link";

export default function Maintenance() {
  return (
    <main className="min-h-screen bg-white px-6 py-20 text-gray-900">
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Site in mentenanta</h1>
        <p className="text-base text-gray-600">
          Lucram la imbunatatiri si revenim in curand. Multumim pentru rabdare!
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
        >
          Inapoi la prima pagina
        </Link>
      </div>
    </main>
  );
}
