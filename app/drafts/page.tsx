export const revalidate = 0;

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import type { ListingRaw } from "@/lib/types";
import DraftActions from "@/components/DraftActions";

export default async function DraftsPage() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("id, title, slug, type, location, capacity, price, phone, is_published, listing_images(image_url, display_order)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
  }

  const listings = (data || []) as ListingRaw[];
  const mapped = listings.map((row) => {
    const summary = mapListingSummary(row);
    const statusField = (row as any).status?.toString().toLowerCase();
    const isPublished = !!(row as any).is_published;
    const status =
      statusField === "inactiv" || statusField === "inactive"
        ? "inactiv"
        : statusField === "publicat" || statusField === "published" || isPublished
        ? "publicat"
        : "draft";
    return { ...summary, status, isPublished };
  });

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Administrare cazări</p>
          <h1 className="text-3xl font-semibold mt-2">Toate listările (draft + publicate)</h1>
          <p className="text-sm text-gray-600 mt-1">Editează, publică sau șterge orice intrare direct din acest panou.</p>
        </div>
        <div className="text-sm text-gray-700 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">Total: {mapped.length}</div>
      </div>

      {mapped.length === 0 && <div className="text-sm text-gray-700">Nu există listări.</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {mapped.map((d) => (
          <div key={d.id} className="p-4 border rounded-2xl shadow-sm bg-white">
            <div className="flex items-start gap-3">
              <img src={d.image} className="w-24 h-20 object-cover rounded-lg" alt={d.title} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{d.tip}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      d.status === "publicat"
                        ? "bg-emerald-100 text-emerald-700"
                        : d.status === "inactiv"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {d.status === "publicat" ? "Publicat" : d.status === "inactiv" ? "Inactiv" : "Draft"}
                  </span>
                </div>
                <div className="font-semibold mt-1 truncate">{d.title}</div>
                <div className="text-sm text-gray-600 truncate">
                  {d.locatie} • {d.numarPersoane} pers
                </div>
                <div className="text-sm text-gray-800 font-medium mt-2">{d.price} lei</div>
              </div>
            </div>

            <DraftActions id={d.id} isPublished={d.isPublished} slug={d.slug} />
          </div>
        ))}
      </div>
    </div>
  );
}
