// Components
import CazareCard from "./CazareCard";

// Utils
import { Cazare } from "../lib/utils";

export default function ListingsGrid({ cazari }: { cazari: Cazare[] }) {
  return (
      <>
      {cazari.map((cazare) => (
        <CazareCard key={cazare.id} cazare={cazare} />
      ))}
    </>
  );
}
