import CazareCard from "./CazareCard";
import { Cazare } from "@/lib/utils";

type ListingsGridProps = {
  cazari: Cazare[];
  eagerCount?: number;
};

export default function ListingsGrid({ cazari, eagerCount = 0 }: ListingsGridProps) {
  return (
    <>
      {cazari.map((cazare, index) => (
        <CazareCard key={cazare.id} cazare={cazare} eager={index < eagerCount} />
      ))}
    </>
  );
}
