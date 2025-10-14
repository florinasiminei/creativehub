import CazareCard from "./CazareCard";
import { Cazare } from "../lib/utils";

export default function ListingsGrid({ cazari }: { cazari: Cazare[] }) {
  if (cazari.length === 0) {
    return (
      <div className="col-span-full text-center text-gray-500 dark:text-gray-400">
        Nicio cazare găsită pentru criteriile selectate.
      </div>
    );
  }
  return (
    <>
      {cazari.map((cazare) => (
        <CazareCard key={cazare.id} cazare={cazare} />
      ))}
    </>
  );
}
