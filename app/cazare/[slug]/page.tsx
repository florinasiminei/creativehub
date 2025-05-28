import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Metadata } from "next";
import Footer from "@/components/Footer";

// 🔧 Util: Extract listing ID from slug
const getListingIdFromSlug = (slug: string): string => {
  return slug.split("-").slice(-5).join("-");
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ Metadata function
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const id = getListingIdFromSlug(params.slug);

  try {
    const { data, error } = await supabase
      .from("listings")
      .select("title, location, price")
      .eq("id", id)
      .single();

    if (error || !data) throw error;

    return {
      title: `${data.title} | cabn.ro`,
      description: `Cazare în ${data.location}, de la ${data.price} lei/noapte.`,
    };
  } catch {
    return {
      title: "Cazare | cabn.ro",
      description: "Detalii indisponibile.",
    };
  }
}

// ✅ Page component
export default async function Cazare({
  params,
}: {
  params: { slug: string };
}) {
  const id = getListingIdFromSlug(params.slug);

  try {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id, title, type, location, capacity, price, image_url, phone_number,
        listing_facilities(facilities(name))
      `)
      .eq("id", id)
      .single();

    if (error || !data) throw error;

    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white px-4 py-12">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-10">
          {/* Image */}
          <div className="w-full lg:w-1/2">
            <Image
              src={data.image_url}
              width={800}
              height={600}
              alt={data.title}
              className="rounded-2xl object-cover w-full h-auto shadow"
            />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <h1 className="text-4xl font-bold leading-tight">{data.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {data.location} &bull; {data.capacity}
            </p>

            <h2 className="text-lg font-medium mt-6 mb-2">Facilități</h2>
            <div className="flex flex-wrap gap-2">
              {data.listing_facilities.map((f: any) => (
                <span
                  key={f.facilities.name}
                  className="text-sm px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-full"
                >
                  {f.facilities.name}
                </span>
              ))}
            </div>

            {/* Price & CTA */}
            <div className="mt-10 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6 shadow-md space-y-4">
              <div className="flex justify-between items-center border-b border-gray-300 dark:border-zinc-700 pb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Începând de la:</p>
                <p className="text-lg font-semibold text-black dark:text-white">
                  {data.price} lei <span className="text-sm font-normal text-gray-500">/ noapte</span>
                </p>
              </div>

              <div className="space-y-1 text-center">
                <h5 className="text-lg font-semibold text-black dark:text-white">
                  REZERVĂ ACUM
                </h5>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Direct de la gazdă fără niciun fel de comision
                </p>

                {data.phone_number && (
                  <div className="mt-4">
                    <a
                      href={`https://wa.me/${data.phone_number}?text=https://cabn.ro/cazare/${params.slug}%0a%0aBună+ziua%2C+mă+interesează+câteva+informații+pentru+${encodeURIComponent(
                        data.title
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-6 py-2 rounded-full transition"
                    >
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <Footer />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Supabase fetch error:", error);
    return notFound();
  }
}
