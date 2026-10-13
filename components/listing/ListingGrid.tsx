import CazareCard from "./CazareCard";
import { Cazare } from "@/lib/utils";

type ListingsGridProps = {
  cazari: Cazare[];
  eagerCount?: number;
  priorityCount?: number;
  highFetchPriorityCount?: number;
  imageSizes?: string;
};

export default function ListingsGrid({
  cazari,
  eagerCount = 0,
  priorityCount = 0,
  highFetchPriorityCount = 0,
  imageSizes,
}: ListingsGridProps) {
  return (
    <>
      {cazari.map((cazare, index) => (
        <CazareCard
          key={cazare.id}
          cazare={cazare}
          eager={index < eagerCount}
          priority={index < priorityCount}
          highFetchPriority={index < highFetchPriorityCount}
          sizes={imageSizes}
        />
      ))}
    </>
  );
}
