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
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <ShowPlayingCard
            key={item.show.id}
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
  item,
  onContextMenu,
}: {
  item: ShowCatalogueItem;
  onContextMenu: (item: ShowCatalogueItem, x: number, y: number) => void;
}) {
  const { missingCount, posterUrl, show } = item;

  return (
    <article
      className="group relative isolate transition-transform duration-200 hover:z-20 hover:-translate-y-1 focus-within:z-20 focus-within:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none"
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(item, event.clientX, event.clientY);
      }}
    >
      <Link
        aria-label={`Ouvrir ${show.title}`}
        className="block overflow-hidden rounded-md border border-border bg-panel shadow-sm outline-none transition-[box-shadow,border-color] duration-200 hover:border-accent/45 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        href={`/shows/${show.id}`}
      >
        {posterUrl ? (
          <div className="relative aspect-[4/3] overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
              style={{ backgroundImage: `url(${posterUrl})` }}
            />
          </div>
        ) : null}

        <div className="p-4">
          <h2 className="line-clamp-2 min-h-6 text-lg font-semibold leading-6 text-foreground">
            {show.title}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-muted">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
              <span className="truncate text-foreground">
                {show.nextDate ? new Date(show.nextDate).toLocaleDateString("fr-FR") : "A planifier"}
              </span>
            </span>
            <span className="flex min-w-0 items-center justify-end gap-2 text-right text-muted">
              <FileWarning
                aria-hidden="true"
                className={cn("h-4 w-4 shrink-0", missingCount > 0 ? "text-warning" : "text-success")}
              />
              <span className="truncate text-foreground">
                {missingCount > 0 ? `${missingCount} piece${missingCount > 1 ? "s" : ""} manquante${missingCount > 1 ? "s" : ""}` : "Dossier pret"}
              </span>
            </span>
          </div>
        </div>
      </Link>

      <button
        aria-label={`Actions pour ${show.title}`}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-ink/70 text-white opacity-100 shadow-md backdrop-blur transition hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
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
