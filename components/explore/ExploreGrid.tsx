import type { ComponentProps, CSSProperties } from "react";
import ExploreCard from "@/components/explore/ExploreCard";

type ExploreGridProps = {
  items: Array<ComponentProps<typeof ExploreCard>>;
  columns?: number;
};

export default function ExploreGrid({ items, columns = items.length }: ExploreGridProps) {
  if (items.length === 0) return null;

  const columnCount = Math.max(1, Math.min(6, columns));
  const gaps = 20 * (columnCount - 1);
  const imageSizes = `(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(50vw - 34px), (max-width: 1279px) calc(33.333vw - 34.667px), (max-width: 1471px) calc((100vw - ${64 + gaps}px) / ${columnCount}), ${(1472 - 64 - gaps) / columnCount}px`;

  return (
    <div
      className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(var(--explore-columns),minmax(0,1fr))]"
      style={{ "--explore-columns": columnCount } as CSSProperties}
    >
      {items.map((item) => (
        <ExploreCard key={item.href} {...item} imageSizes={imageSizes} />
      ))}
    </div>
  );
}
