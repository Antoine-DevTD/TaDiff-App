"use client";

import Link from "next/link";
import {
  ArrowUpDown,
  BellPlus,
  ChevronsLeft,
  ChevronsRight,
  Mail,
  Menu,
  Pencil,
  Pin,
  PinOff,
  Search,
  Tags,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { createReminder } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { ContactEmailAssistant } from "@/components/contacts/contact-email-assistant";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ContactForm } from "@/components/forms/contact-form";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types";

type ContactFilter = {
  label: string;
  value: string;
  count: number;
  kind: "all" | "role" | "tag";
};

type ContactAction = "edit" | "reminder" | "email";

type ContactContextMenu = {
  contact: Contact;
  x: number;
  y: number;
} | null;

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [railLocked, setRailLocked] = useState(false);
  const [railHovered, setRailHovered] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [emailContact, setEmailContact] = useState<Contact | null>(null);
  const [contextMenu, setContextMenu] = useState<ContactContextMenu>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<ContactFilter>({
    label: "Tous les contacts",
    value: "all",
    count: contacts.length,
    kind: "all",
  });

  const filters = useMemo(() => buildFilters(contacts), [contacts]);
  const columns = buildContactColumns({ onAction: handleContactAction });
  const activeFilterExists = filters.some(
    (filter) => filter.kind === activeFilter.kind && filter.value === activeFilter.value,
  );
  const resolvedFilter = activeFilterExists ? activeFilter : filters[0];
  const railExpanded = railLocked || railHovered;
  const filteredContacts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesFilter =
        resolvedFilter.kind === "all" ||
        (resolvedFilter.kind === "role" && contact.role === resolvedFilter.value) ||
        (resolvedFilter.kind === "tag" && contact.tags.includes(resolvedFilter.value));

      if (!matchesFilter) return false;

      if (!normalizedSearch) return true;

      return [
        contact.name,
        contact.organization,
        contact.role,
        contact.city,
        contact.email,
        contact.phone,
        ...contact.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [contacts, resolvedFilter, search]);

  // TanStack Table intentionally returns function-rich instances.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredContacts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function selectFilter(filter: ContactFilter) {
    setActiveFilter(filter);
    setMobileFiltersOpen(false);
  }

  function handleContactAction(action: ContactAction, contact: Contact) {
    setContextMenu(null);
    setActionMessage(null);

    if (action === "edit") {
      setEditingContact(contact);
      return;
    }

    if (action === "email") {
      setEmailContact(contact);
      return;
    }

    startTransition(async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const result = await createReminder({
        title: `Contacter ${contact.name}`,
        dueDate,
        relatedTo: contact.organization || contact.name,
        priority: "normal",
        contactId: contact.id,
      });
      setActionMessage(result.message);
    });
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border bg-panel"
      onClick={() => setContextMenu(null)}
    >
      <div className="flex min-h-[560px]">
        <FilterRail
          activeFilter={resolvedFilter}
          expanded={railExpanded}
          filters={filters}
          locked={railLocked}
          onHoverChange={setRailHovered}
          onLockToggle={() => setRailLocked((current) => !current)}
          onSelect={selectFilter}
        />

        <section className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-panel-strong text-muted transition hover:border-accent/40 hover:text-accent lg:hidden"
                onClick={() => setMobileFiltersOpen(true)}
                aria-label="Ouvrir les filtres"
              >
                <Menu className="h-4 w-4" aria-hidden />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{resolvedFilter.label}</p>
                <p className="text-xs text-muted">{filteredContacts.length} contact(s)</p>
              </div>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-9"
                placeholder="Rechercher..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b border-border bg-panel text-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 text-xs font-semibold uppercase">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group relative border-b border-border bg-panel transition hover:bg-accent/[0.035]"
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({
                        contact: row.original,
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }}
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "relative px-4 py-4",
                          index === 0 &&
                            "after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:ease-out group-hover:after:scale-x-[6]",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-muted" colSpan={columns.length}>
                      Aucun contact ne correspond a ce filtre.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {actionMessage ? (
            <p className="border-t border-border px-4 py-3 text-sm text-muted">{actionMessage}</p>
          ) : null}
        </section>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/45"
            aria-label="Fermer les filtres"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(82vw,320px)] border-r border-border bg-panel shadow-xl shadow-ink/20">
            <FilterRail
              activeFilter={resolvedFilter}
              expanded
              filters={filters}
              locked
              mobile
              onClose={() => setMobileFiltersOpen(false)}
              onHoverChange={() => undefined}
              onLockToggle={() => undefined}
              onSelect={selectFilter}
            />
          </div>
        </div>
      ) : null}

      {contextMenu ? (
        <ContactContextMenu
          contact={contextMenu.contact}
          disabled={isPending}
          left={contextMenu.x}
          top={contextMenu.y}
          onAction={handleContactAction}
        />
      ) : null}

      <Dialog
        open={Boolean(editingContact)}
        onClose={() => setEditingContact(null)}
        eyebrow="Carnet de contacts"
        title="Modifier le contact"
        description="Mettez a jour les coordonnees, le role et les categories."
        className="max-w-2xl"
      >
        {editingContact ? (
          <ContactForm contact={editingContact} onSuccess={() => setEditingContact(null)} />
        ) : null}
      </Dialog>

      <ContactEmailAssistant
        contact={emailContact}
        open={Boolean(emailContact)}
        onClose={() => setEmailContact(null)}
      />
    </div>
  );
}

function buildContactColumns({
  onAction,
}: {
  onAction: (action: ContactAction, contact: Contact) => void;
}): ColumnDef<Contact>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader label="Nom" onClick={() => column.toggleSorting()} />,
      cell: ({ row }) => (
        <Link className="font-semibold text-foreground hover:text-accent" href={`/contacts/${row.original.id}`}>
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "organization",
      header: ({ column }) => (
        <SortableHeader label="Structure" onClick={() => column.toggleSorting()} />
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => <SortableHeader label="Role" onClick={() => column.toggleSorting()} />,
    },
    {
      accessorKey: "phone",
      header: "Telephone",
      cell: ({ row }) => row.original.phone || <span className="text-xs text-muted">A renseigner</span>,
    },
    {
      accessorKey: "city",
      header: ({ column }) => <SortableHeader label="Ville" onClick={() => column.toggleSorting()} />,
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <div className="flex max-w-[280px] flex-wrap gap-1.5">
          {row.original.tags.length > 0 ? (
            row.original.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted">Aucun tag</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader label="Statut" onClick={() => column.toggleSorting()} />
      ),
      cell: ({ row }) => {
        const tone = row.original.status === "Partenaire" ? "success" : "neutral";
        return <Badge tone={tone}>{row.original.status}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted opacity-0 transition hover:bg-accent/10 hover:text-accent group-hover:opacity-100 focus:opacity-100"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAction("edit", row.original);
            }}
            aria-label={`Modifier ${row.original.name}`}
            title="Modifier"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ];
}

function ContactContextMenu({
  contact,
  disabled,
  left,
  onAction,
  top,
}: {
  contact: Contact;
  disabled: boolean;
  left: number;
  onAction: (action: ContactAction, contact: Contact) => void;
  top: number;
}) {
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const clampedLeft = Math.max(12, Math.min(left, viewportWidth - 240));
  const clampedTop = Math.max(12, Math.min(top, viewportHeight - 176));

  return (
    <div
      className="fixed z-[90] w-56 rounded-md border border-border bg-panel p-1.5 shadow-xl shadow-ink/15"
      style={{ left: clampedLeft, top: clampedTop }}
      onClick={(event) => event.stopPropagation()}
    >
      <ContextAction icon={Pencil} label="Modifier" onClick={() => onAction("edit", contact)} />
      <ContextAction
        disabled={disabled}
        icon={BellPlus}
        label="Creer une action"
        onClick={() => onAction("reminder", contact)}
      />
      <ContextAction icon={Mail} label="Preparer un email" onClick={() => onAction("email", contact)} />
    </div>
  );
}

function ContextAction({
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function FilterRail({
  activeFilter,
  expanded,
  filters,
  locked,
  mobile = false,
  onClose,
  onHoverChange,
  onLockToggle,
  onSelect,
}: {
  activeFilter: ContactFilter;
  expanded: boolean;
  filters: ContactFilter[];
  locked: boolean;
  mobile?: boolean;
  onClose?: () => void;
  onHoverChange: (hovered: boolean) => void;
  onLockToggle: () => void;
  onSelect: (filter: ContactFilter) => void;
}) {
  const roleFilters = filters.filter((filter) => filter.kind === "role");
  const tagFilters = filters.filter((filter) => filter.kind === "tag");
  const allFilter = filters[0];

  return (
    <aside
      className={cn(
        "shrink-0 overflow-hidden border-r border-border bg-panel-strong/45 transition-[width] duration-300 motion-reduce:transition-none",
        mobile ? "h-full w-full" : "hidden lg:block",
        !mobile && (expanded ? "w-72" : "w-[4.75rem]"),
      )}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <div className="flex h-full flex-col p-3">
        <div className="flex min-h-10 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Users className="h-4 w-4" aria-hidden />
            </span>
            {expanded ? <p className="truncate text-sm font-semibold">Filtres</p> : null}
          </div>
          {expanded ? (
            <div className="flex items-center gap-1">
              {!mobile ? (
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-panel hover:text-accent"
                  onClick={onLockToggle}
                  aria-label={locked ? "Deverrouiller les filtres" : "Verrouiller les filtres"}
                  title={locked ? "Deverrouiller" : "Verrouiller"}
                >
                  {locked ? <PinOff className="h-4 w-4" aria-hidden /> : <Pin className="h-4 w-4" aria-hidden />}
                </button>
              ) : null}
              {mobile && onClose ? (
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-panel hover:text-accent"
                  onClick={onClose}
                  aria-label="Fermer les filtres"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : (
            <ChevronsRight className="mx-auto h-4 w-4 text-muted" aria-hidden />
          )}
        </div>

        <div className="mt-4 space-y-5 overflow-y-auto pr-0.5">
          <FilterButton
            active={activeFilter.kind === allFilter.kind && activeFilter.value === allFilter.value}
            expanded={expanded}
            filter={allFilter}
            icon="all"
            onClick={() => onSelect(allFilter)}
          />

          <FilterGroup
            activeFilter={activeFilter}
            expanded={expanded}
            filters={roleFilters}
            icon="role"
            label="Roles"
            onSelect={onSelect}
          />

          <FilterGroup
            activeFilter={activeFilter}
            expanded={expanded}
            filters={tagFilters}
            icon="tag"
            label="Categories"
            onSelect={onSelect}
          />
        </div>

        {!mobile ? (
          <div className="mt-auto pt-3">
            <button
              type="button"
              className="flex h-9 w-full items-center justify-center rounded-md text-muted transition hover:bg-panel hover:text-accent"
              onClick={onLockToggle}
              aria-label={expanded ? "Replier les filtres" : "Etendre les filtres"}
            >
              {expanded ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function FilterGroup({
  activeFilter,
  expanded,
  filters,
  icon,
  label,
  onSelect,
}: {
  activeFilter: ContactFilter;
  expanded: boolean;
  filters: ContactFilter[];
  icon: "role" | "tag";
  label: string;
  onSelect: (filter: ContactFilter) => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {expanded ? (
        <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {label}
        </p>
      ) : null}
      {filters.map((filter) => (
        <FilterButton
          key={`${filter.kind}-${filter.value}`}
          active={activeFilter.kind === filter.kind && activeFilter.value === filter.value}
          expanded={expanded}
          filter={filter}
          icon={icon}
          onClick={() => onSelect(filter)}
        />
      ))}
    </div>
  );
}

function FilterButton({
  active,
  expanded,
  filter,
  icon,
  onClick,
}: {
  active: boolean;
  expanded: boolean;
  filter: ContactFilter;
  icon: "all" | "role" | "tag";
  onClick: () => void;
}) {
  const Icon = icon === "role" ? UserRound : icon === "tag" ? Tags : Users;

  return (
    <button
      type="button"
      className={cn(
        "group/filter flex min-h-10 w-full items-center gap-2 rounded-full text-left text-sm transition",
        expanded ? "justify-between px-3" : "justify-center px-0",
        active ? "bg-accent/12 text-accent" : "text-muted hover:bg-panel hover:text-foreground",
      )}
      onClick={onClick}
      title={filter.label}
    >
      <span className={cn("flex min-w-0 items-center gap-2", !expanded && "justify-center")}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {expanded ? <span className="truncate">{filter.label}</span> : null}
      </span>
      {expanded ? <span className="ml-3 text-xs font-semibold">{filter.count}</span> : null}
    </button>
  );
}

function SortableHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase transition hover:text-foreground"
      onClick={onClick}
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function buildFilters(contacts: Contact[]): ContactFilter[] {
  const filters: ContactFilter[] = [
    {
      label: "Tous les contacts",
      value: "all",
      count: contacts.length,
      kind: "all",
    },
  ];

  const roles = countValues(contacts.map((contact) => contact.role).filter(Boolean));
  const tags = countValues(contacts.flatMap((contact) => contact.tags));

  for (const [role, count] of roles.slice(0, 8)) {
    filters.push({ label: role, value: role, count, kind: "role" });
  }

  for (const [tag, count] of tags.slice(0, 12)) {
    filters.push({ label: tag, value: tag, count, kind: "tag" });
  }

  return filters;
}

function countValues(values: string[]) {
  return Array.from(
    values.reduce((map, value) => {
      map.set(value, (map.get(value) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((first, second) => second[1] - first[1]);
}
