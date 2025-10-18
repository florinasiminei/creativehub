import Image from "next/image";
import Link from "next/link";
import { Cazare } from "../lib/utils";

export default function CazareCard({ cazare }: { cazare: Cazare }) {
  return (
    <Link href={`/cazare/${cazare.slug}`}>
      <article className="group bg-white dark:bg-zinc-900 transition">
        <div className="relative aspect-[2.7/2] overflow-hidden rounded-xl">
          <Image
            src={cazare.image}
            fill
            alt={`Imagine ${cazare.title}`}
            loading="lazy"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/fallback.jpg";
            }}
          />
        </div>
        <div className="pt-3 space-y-0.5">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-base line-clamp-1 text-gray-900 dark:text-white flex-1 pr-2">{cazare.title}</h3>
            <div className="text-gray-900 dark:text-white text-sm font-medium whitespace-nowrap">{cazare.price} lei</div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[60%]">{cazare.locatie}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{cazare.numarPersoane} persoane</span>
          </div>
        </div>
      </article>
    </Link>
  );
}



