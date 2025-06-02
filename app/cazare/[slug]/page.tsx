import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";
import ListingCarousel from "@/components/ListingCarousel";

// SIMPLIFY props typing for Next.js App Router:
export default async function Cazare({ params }: { params: { slug: string } }) {
  const getListingIdFromSlug = (slug: string): string => {
    return slug.split("-").slice(-5).join("-");
  };

  const id = getListingIdFromSlug(params.slug);

  // Fetch listing details
  const { data: listingData, error } = await supabase
    .from("listings")
    .select(`
      id, title, location, capacity, price, phone_number,
      listing_facilities(facilities(id, name))
    `)
    .eq("id", id)
    .single();

  if (error || !listingData) return notFound();

  // Type safety
  type Listing = {
    id: string;
    title: string;
    location: string;
    capacity: string;
    price: string;
    phone_number: string;
    listing_facilities: {
      facilities: {
        id: string;
        name: string;
      };
    }[];
  };

  const listing = listingData as unknown as Listing;

  // Fetch images from listing_images table
  const { data: imagesData, error: imageError } = await supabase
    .from("listing_images")
    .select("image_url")
    .eq("listing_id", id)
    .order("display_order", { ascending: true });

  if (imageError || !imagesData) {
    console.error("Error fetching images:", imageError);
    return notFound();
  }

  const publicUrls = imagesData.map((img) => img.image_url);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white px-4 py-12">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-10">
        {/* Image Carousel */}
        <div className="w-full lg:w-1/2">
          <ListingCarousel images={publicUrls} />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <h1 className="text-4xl font-bold">{listing.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {listing.location} &bull; {listing.capacity}
          </p>

          <h2 className="text-lg font-medium mt-6 mb-2">Facilități</h2>
          <div className="flex flex-wrap gap-2">
            {listing.listing_facilities.map((f) => (
              <span
                key={f.facilities.id}
                className="text-sm px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-full"
              >
                {f.facilities.name}
              </span>
            ))}
          </div>

          {/* Price & Contact */}
          <div className="mt-10 rounded-xl bg-gray-100 dark:bg-zinc-900 p-6 shadow-md space-y-4">
            <div className="flex justify-between border-b border-gray-300 dark:border-zinc-700 pb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Începând de la:</p>
              <p className="text-lg font-semibold">
                {listing.price} lei{" "}
                <span className="text-sm font-normal text-gray-500">/ noapte</span>
              </p>
            </div>

            <div className="text-center space-y-1">
              <h5 className="text-lg font-semibold">REZERVĂ ACUM</h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Direct de la gazdă fără comision
              </p>

              {listing.phone_number && (
                <a
                  href={`https://wa.me/${listing.phone_number}?text=https://cabn.ro/cazare/${params.slug}%0a%0aBună+ziua%2C+mă+interesează+câteva+informații+pentru+${encodeURIComponent(
                    listing.title
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-6 py-2 rounded-full transition"
                >
                  WhatsApp
                </a>
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
}
