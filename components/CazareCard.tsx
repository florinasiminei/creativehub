import Image from "next/image";
import Link from "next/link";
import { Cazare } from "../lib/utils";

export default function CazareCard({ cazare }: { cazare: Cazare }) {
  return (
    <Link href={`/cazare/${cazare.slug}`}>
      <article className="group rounded-xl border bg-white dark:bg-zinc-900 transition shadow-sm hover:shadow-xl">
        <div className="relative h-[250px] overflow-hidden">
          <Image
            src={cazare.image}
            fill
            alt={`Imagine ${cazare.title}`}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/fallback.jpg";
            }}
          />
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-base line-clamp-2 text-gray-900 dark:text-white">{cazare.title}</h3>
            <div className="text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">{cazare.price} lei</div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>{cazare.locatie}</span>
            <span aria-hidden="true" className="opacity-50">&bull;</span>
            <span>{cazare.numarPersoane} persoane</span>
          </div>
        </div>
      </article>
    </Link>
  );
}



