import type { DragEvent, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import DraftActions from "@/components/DraftActions";
import type { Cazare } from "@/lib/utils";

type DraftItem = Cazare & {
  status: "publicat" | "inactiv" | "draft";
  isPublished: boolean;
  termsAccepted?: boolean;
  editToken?: string | null;
};

type AttractionItem = {
  id: string;
  title: string;
  slug?: string;
  locationName: string;
  price: number | null;
  image: string;
  isPublished: boolean;
  status: "publicat" | "draft";
  createdAt?: string | null;
  updatedAt?: string | null;
};

const cardClassName =
  "overflow-hidden rounded-[28px] border bg-white shadow-[0_16px_45px_-34px_rgba(15,23,42,0.55)] transition dark:border-zinc-800 dark:bg-zinc-900";

const sectionDividerClassName = "mt-4 border-t border-gray-100 pt-3 dark:border-zinc-800";

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "emerald" | "blue" | "amber" | "orange";
}) {
  const toneClassName =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
      : tone === "blue"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
        : tone === "amber"
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
          : tone === "orange"
            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
            : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-200";

  return <span className={`rounded-full px-2 py-1 ${toneClassName}`}>{children}</span>;
}

function CardCover({
  image,
  title,
  priority = false,
  overlay,
}: {
  image: string;
  title: string;
  priority?: boolean;
  overlay?: ReactNode;
}) {
  return (
    <div className="relative aspect-[2.7/2] overflow-hidden">
      <Image
        src={image}
        alt={title}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
        priority={priority}
      />
      {overlay}
    </div>
  );
}

export function SummaryChip({
  label,
  value,
  tone = "emerald",
}: {
  label: string;
  value: string | number;
  tone?: "emerald" | "blue" | "amber";
}) {
  const toneClassName =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-900"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-900"
        : "border-emerald-100 bg-emerald-50 text-emerald-900";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

export function AdminNotice({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
      <span>{children}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-lg leading-none text-emerald-700 transition hover:text-emerald-900 dark:text-emerald-300"
        aria-label="Inchide"
      >
        &times;
      </button>
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 px-5 py-6 text-sm text-emerald-900">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-emerald-900/80">{description}</p>
      {actions ? <div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function PropertyDraftCard({
  item,
  index,
  canReorder,
  isDragging,
  isOver,
  baseUrl,
  canDelete,
  canStaffActions,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onStatusChange,
}: {
  item: DraftItem;
  index: number;
  canReorder: boolean;
  isDragging: boolean;
  isOver: boolean;
  baseUrl: string;
  canDelete: boolean;
  canStaffActions: boolean;
  onOpen: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onStatusChange: (newStatus: "publicat" | "draft") => void;
}) {
  return (
    <div
      draggable={canReorder}
      onDragStart={onDragStart}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button") || target.closest("a")) return;
        onOpen();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`${cardClassName} ${
        canReorder ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${isDragging ? "opacity-60" : ""} ${isOver ? "ring-2 ring-emerald-400" : ""}`}
    >
      <CardCover
        image={item.image}
        title={item.title}
        priority={index < 2}
        overlay={
          <div className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow">
            #{index + 1}
          </div>
        }
      />

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusPill tone="neutral">{item.tip}</StatusPill>
          {item.termsAccepted && <StatusPill tone="blue">Client completat</StatusPill>}
          <StatusPill tone={item.status === "publicat" ? "emerald" : item.status === "inactiv" ? "amber" : "orange"}>
            {item.status === "publicat" ? "Publicat" : item.status === "inactiv" ? "Inactiv" : "Draft"}
          </StatusPill>
        </div>

        <div className="space-y-1.5 pt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-base font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
            <div className="whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">{item.price} lei</div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span className="max-w-[60%] truncate">{item.locatie}</span>
            <span className="shrink-0">{item.numarPersoane} pers</span>
          </div>
        </div>

        <div className={sectionDividerClassName}>
          <DraftActions
            id={item.id}
            isPublished={item.isPublished}
            slug={item.slug}
            canDelete={canDelete}
            clientLink={
              canStaffActions && item.editToken
                ? `${baseUrl}/edit-property/${item.id}?client=1&token=${item.editToken}`
                : null
            }
            onStatusChange={onStatusChange}
          />
        </div>
      </div>
    </div>
  );
}

export function AttractionDraftCard({
  item,
  index,
  loading,
  onOpen,
  onTogglePublish,
  onDelete,
}: {
  item: AttractionItem;
  index: number;
  loading: boolean;
  onOpen: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button") || target.closest("a")) return;
        onOpen();
      }}
      className={`${cardClassName} cursor-pointer`}
    >
      <CardCover image={item.image} title={item.title} priority={index < 2} />

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusPill tone="neutral">Atractie</StatusPill>
          <StatusPill tone={item.isPublished ? "emerald" : "orange"}>
            {item.isPublished ? "Publicata" : "Draft"}
          </StatusPill>
        </div>

        <div className="space-y-1.5 pt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-base font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
            {item.price !== null && item.price > 0 ? (
              <div className="whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">{item.price} lei</div>
            ) : null}
          </div>
          <div className="line-clamp-1 text-sm text-gray-500 dark:text-gray-400">{item.locationName}</div>
        </div>

        <div className={`${sectionDividerClassName} grid grid-cols-3 gap-2`}>
          <Link
            href={`/add-attraction?editId=${item.id}`}
            className="rounded-xl bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-700 transition hover:bg-gray-200"
          >
            Editeaza
          </Link>
          <button
            type="button"
            onClick={onTogglePublish}
            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            disabled={loading}
          >
            {item.isPublished ? "Draft" : "Publica"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-red-100 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-200 disabled:opacity-60"
            disabled={loading}
          >
            Sterge
          </button>
        </div>
      </div>
    </div>
  );
}
