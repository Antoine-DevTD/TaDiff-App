"use client";

import Link from "next/link";
import { CalendarDays, ExternalLink, FileWarning, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteShow } from "@/app/(dashboard)/actions";
import { ShowEditDialog } from "@/components/shows/show-edit-dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Show } from "@/types";

type ShowCatalogueItem = {
  show: Show;
  posterUrl: string;
  missingCount: number;
};

type ShowContextMenu = {
  item: ShowCatalogueItem;
  x: number;
  y: number;
} | null;

const cardAngles = ["lg:-rotate-[0.8deg]", "lg:rotate-[0.55deg]", "lg:-rotate-[0.35deg]", "lg:rotate-[0.9deg]"];

export function ShowsCatalogue({ items }: { items: ShowCatalogueItem[] }) {
  const [contextMenu, setContextMenu] = useState<ShowContextMenu>(null);
  const [editingItem, setEditingItem] = useState<ShowCatalogueItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ShowCatalogueItem | null>(null);

  useEffect(() => {
    if (!contextMenu) return;

    function closeMenu(event: KeyboardEvent) {
      if (event.key === "Escape") setContextMenu(null);
    }

    function closeOnViewportChange() {
      setContextMenu(null);
    }

    window.addEventListener("keydown", closeMenu);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);

    return () => {
      window.removeEventListener("keydown", closeMenu);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [contextMenu]);

  function openContextMenu(item: ShowCatalogueItem, x: number, y: number) {
    setContextMenu({ item, x, y });
  }

  function startEdit(item: ShowCatalogueItem) {
    setContextMenu(null);
    setEditingItem(item);
  }

  function startDelete(item: ShowCatalogueItem) {
    setContextMenu(null);
    setDeletingItem(item);
  }

  return (
    <div className="relative" data-tour="shows-catalogue" onClick={() => setContextMenu(null)}>
      <div
        className={cn(
          "grid items-start gap-6 pb-8 pt-3 [perspective:1200px] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
          items.length === 1 && "max-w-sm sm:grid-cols-1",
        )}
      >
        {items.map((item, index) => (
          <ShowPlayingCard
            key={item.show.id}
            angleClassName={cardAngles[index % cardAngles.length]}
            item={item}
            onContextMenu={openContextMenu}
          />
        ))}
      </div>

      {contextMenu ? (
        <ShowCardContextMenu
          item={contextMenu.item}
          left={contextMenu.x}
          top={contextMenu.y}
          onDelete={() => startDelete(contextMenu.item)}
          onEdit={() => startEdit(contextMenu.item)}
        />
      ) : null}

      {editingItem ? (
        <ShowEditDialog
          show={editingItem.show}
          open
          showTrigger={false}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null);
          }}
        />
      ) : null}

      <Dialog
        className="max-w-lg"
        description="Cette action supprime aussi les documents et fichiers rattaches au spectacle."
        eyebrow="Catalogue"
        open={Boolean(deletingItem)}
        title={deletingItem ? `Supprimer ${deletingItem.show.title} ?` : "Supprimer le spectacle ?"}
        onClose={() => setDeletingItem(null)}
      >
        {deletingItem ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted">
              Les dates possibles et les devis seront conserves, mais ils ne seront plus rattaches a ce spectacle.
            </p>
            <ConfirmDeleteButton
              action={deleteShow.bind(null, deletingItem.show.id)}
              label="Supprimer definitivement"
              redirectTo="/shows"
            />
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function ShowPlayingCard({
  angleClassName,
  item,
  onContextMenu,
}: {
  angleClassName: string;
  item: ShowCatalogueItem;
  onContextMenu: (item: ShowCatalogueItem, x: number, y: number) => void;
}) {
  const { missingCount, posterUrl, show } = item;

  return (
    <article
      className={cn(
        "group relative isolate transform-gpu transition-[transform,filter] duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none",
        angleClassName,
        "hover:z-20 hover:-translate-y-3 hover:rotate-0 hover:scale-[1.025] focus-within:z-20 focus-within:-translate-y-2 focus-within:rotate-0",
      )}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(item, event.clientX, event.clientY);
      }}
    >
      <Link
        aria-label={`Ouvrir ${show.title}`}
        className="relative block aspect-[2/3] overflow-hidden rounded-md border border-white/15 bg-ink text-white shadow-[0_18px_40px_rgba(11,18,32,0.18)] outline-none transition-[box-shadow,border-color] duration-300 hover:border-accent/65 hover:shadow-[0_28px_55px_rgba(11,18,32,0.28)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4"
        href={`/shows/${show.id}`}
      >
        {posterUrl ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
            style={{ backgroundImage: `url(${posterUrl})` }}
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(145deg,#15213a_0%,#0b1220_65%,#2455d9_150%)]">
            <div className="absolute inset-5 border border-white/15" />
            <div className="absolute inset-x-9 top-10 h-px bg-white/20" />
            <div className="absolute inset-x-9 bottom-10 h-px bg-white/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/15 to-ink/5" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <h2 className="text-2xl font-semibold leading-tight text-balance !text-white drop-shadow-sm">
            {show.title}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/92 px-3 text-ink shadow-sm backdrop-blur">
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
              {show.nextDate ? new Date(show.nextDate).toLocaleDateString("fr-FR") : "A planifier"}
            </span>
            <span
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/92 px-3 !text-ink shadow-sm ring-1 ring-white/30 backdrop-blur"
            >
              <FileWarning
                aria-hidden="true"
                className={cn("h-3.5 w-3.5", missingCount > 0 ? "text-warning" : "text-success")}
              />
              {missingCount > 0 ? `${missingCount} piece${missingCount > 1 ? "s" : ""} manquante${missingCount > 1 ? "s" : ""}` : "Dossier pret"}
            </span>
          </div>
        </div>
      </Link>

      <button
        aria-label={`Actions pour ${show.title}`}
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-ink/70 text-white opacity-100 shadow-md backdrop-blur transition hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
        title="Actions"
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const bounds = event.currentTarget.getBoundingClientRect();
          onContextMenu(item, bounds.right, bounds.bottom + 6);
        }}
      >
        <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
      </button>
    </article>
  );
}

function ShowCardContextMenu({
  item,
  left,
  onDelete,
  onEdit,
  top,
}: {
  item: ShowCatalogueItem;
  left: number;
  onDelete: () => void;
  onEdit: () => void;
  top: number;
}) {
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const clampedLeft = Math.max(12, Math.min(left, viewportWidth - 236));
  const clampedTop = Math.max(12, Math.min(top, viewportHeight - 168));

  return (
    <div
      aria-label={`Actions pour ${item.show.title}`}
      className="fixed z-[90] w-56 rounded-md border border-border bg-panel p-1.5 shadow-xl shadow-ink/20"
      role="menu"
      style={{ left: clampedLeft, top: clampedTop }}
      onClick={(event) => event.stopPropagation()}
    >
      <Link
        className="flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-accent/10 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        href={`/shows/${item.show.id}`}
        role="menuitem"
      >
        <ExternalLink aria-hidden="true" className="h-4 w-4" />
        Ouvrir la fiche
      </Link>
      <ContextButton icon={Pencil} label="Modifier" onClick={onEdit} />
      <div className="my-1 border-t border-border" />
      <ContextButton danger icon={Trash2} label="Supprimer" onClick={onDelete} />
    </div>
  );
}

function ContextButton({
  danger = false,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
        danger ? "text-danger hover:bg-danger/10" : "hover:bg-accent/10 hover:text-accent",
      )}
      role="menuitem"
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}
