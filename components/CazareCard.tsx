import Image from "next/image";
import Link from "next/link";
import { slugify, Cazare } from "../lib/utils";

export default function CazareCard({ cazare }: { cazare: Cazare }) {
  return (
    <Link href={`/cazare/${slugify(cazare.title)}-${cazare.id}`}>
      <div className="space-y-2 text-left transition-transform hover:-translate-y-1 cursor-pointer">
        <Image
          src={cazare.image}
          width={800}
          height={600}
          alt={`Imagine ${cazare.title}`}
          className="rounded-xl border object-cover w-full h-[250px]"
        />
        <div className="font-semibold text-md">{cazare.title}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {cazare.locatie} — de la {cazare.price} lei/noapte
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          👥 {cazare.numarPersoane} persoane
        </div>
      </div>
    </Link>
  );
}
