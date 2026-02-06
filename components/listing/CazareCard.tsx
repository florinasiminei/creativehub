import Image from "next/image";
import Link from "next/link";
import { Cazare } from "@/lib/utils";

export default function CazareCard({ cazare }: { cazare: Cazare }) {
  const locationParts = (cazare.locatie || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const firstPart = locationParts[0]
    ? locationParts[0].replace(/\s*\([^)]*\)\s*$/, "")
    : "";
  const cleanedLocation = [firstPart, ...locationParts.slice(1)].filter(Boolean).join(", ");

  return (
    <Link href={`/cazare/${cazare.slug}`}>
      <article className="group transition bg-transparent dark:bg-transparent">
        <div className="relative aspect-[2.7/2] overflow-hidden rounded-xl">
          <Image
            src={cazare.image}
            fill
            alt={`Imagine ${cazare.title}`}
            loading="lazy"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 90vw, (max-width: 768px) 45vw, (max-width: 1024px) 33vw, (max-width: 1536px) 20vw, 240px"
          />
        </div>
        <div className="pt-3 space-y-0.5">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-base line-clamp-1 text-gray-900 dark:text-white flex-1 pr-2">{cazare.title}</h3>
            <div className="text-gray-900 dark:text-white text-sm font-medium whitespace-nowrap">{cazare.price} lei</div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[60%]">
              {cleanedLocation}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{cazare.numarPersoane} persoane</span>
          </div>
        </div>
      </article>
    </Link>
  );
}




