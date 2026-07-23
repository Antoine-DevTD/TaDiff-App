"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowUpDown,
  BellPlus,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Mail,
  List,
  Map as MapIcon,
  Menu,
  Pencil,
  Pin,
  PinOff,
  Search,
  Tags,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { deleteContacts } from "@/app/(dashboard)/actions";
import { ContactEmailAssistant } from "@/components/contacts/contact-email-assistant";
import { ContactImportPanel } from "@/components/contacts/contact-import-panel";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { DestructiveActionDialog } from "@/components/ui/destructive-action-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ContactForm } from "@/components/forms/contact-form";
import { cn } from "@/lib/utils";
import type { Contact, EmailTemplate, Show, ShowDocument } from "@/types";

const VenueMap = dynamic(
  () => import("@/components/contacts/venue-map").then((module) => module.VenueMap),
  { loading: () => <div className="min-h-[620px] animate-pulse bg-panel-strong/55" />, ssr: false },
);

type ContactFilter = {
  label: string;
  value: string;
  count: number;
  kind: "all" | "role" | "tag";
};

type ContactAction = "delete" | "edit" | "reminder" | "email";

type ContactContextMenu = {
  contact: Contact;
  x: number;
  y: number;
} | null;

export function ContactsTable({ contacts, documents, shows, templates }: { contacts: Contact[]; documents: ShowDocument[]; shows: Show[]; templates: EmailTemplate[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [railLocked, setRailLocked] = useState(false);
  const [railHovered, setRailHovered] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [emailContacts, setEmailContacts] = useState<Contact[]>([]);
  const [reminderContacts, setReminderContacts] = useState<Contact[]>([]);
  const [contactsToDelete, setContactsToDelete] = useState<Contact[]>([]);
  const [removedContactIds, setRemovedContactIds] = useState<string[]>([]);
  const [contactTab, setContactTab] = useState<"person" | "venue">("person");
  const [venueView, setVenueView] = useState<"list" | "map">("list");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContactContextMenu>(null);
  const [activeFilter, setActiveFilter] = useState<ContactFilter>({
    label: "Tous les contacts",
    value: "all",
    count: contacts.length,
    kind: "all",
  });

  const activeContacts = useMemo(() => contacts.filter((contact) => !removedContactIds.includes(contact.id)), [contacts, removedContactIds]);
  const tabContacts = useMemo(() => activeContacts.filter((contact) => contact.contactType === contactTab), [activeContacts, contactTab]);
  const filters = useMemo(() => buildFilters(tabContacts, contactTab), [contactTab, tabContacts]);
  const activeFilterExists = filters.some(
    (filter) => filter.kind === activeFilter.kind && filter.value === activeFilter.value,
  );
  const resolvedFilter = activeFilterExists ? activeFilter : filters[0];
  const railExpanded = railLocked || railHovered;
  const filteredContacts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tabContacts.filter((contact) => {
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
  }, [resolvedFilter, search, tabContacts]);
  const allVisibleSelected = filteredContacts.length > 0 && filteredContacts.every((contact) => selectedContactIds.includes(contact.id));
  const selectedContacts = activeContacts.filter((contact) => selectedContactIds.includes(contact.id));
  const selectedEmailContacts = selectedContacts.filter((contact) => contact.email);
  const columns = buildContactColumns({
    allContacts: activeContacts,
    allVisibleSelected,
    contactTab,
    onAction: handleContactAction,
    onToggleAll: () => setSelectedContactIds((current) => allVisibleSelected
      ? current.filter((id) => !filteredContacts.some((contact) => contact.id === id))
      : Array.from(new Set([...current, ...filteredContacts.map((contact) => contact.id)]))),
    onToggleSelection: (contact) => setSelectedContactIds((current) => current.includes(contact.id) ? current.filter((id) => id !== contact.id) : [...current, contact.id]),
    selectedContactIds,
  });

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

    if (action === "edit") {
      setEditingContact(contact);
      return;
    }

    if (action === "email") {
      setEmailContacts([contact]);
      return;
    }

    if (action === "delete") {
      setContactsToDelete([contact]);
      return;
    }

    setReminderContacts([contact]);
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
          <div className="flex items-center gap-1 border-b border-border bg-panel px-4 pt-3" role="tablist" aria-label="Type de contacts">
            <ContactTab
              active={contactTab === "person"}
              count={activeContacts.filter((contact) => contact.contactType === "person").length}
              icon={UserRound}
              label="Personnes"
              onClick={() => {
                const peopleCount = activeContacts.filter((contact) => contact.contactType === "person").length;
                setContactTab("person");
                setSelectedContactIds([]);
                setActiveFilter({ label: "Toutes les personnes", value: "all", count: peopleCount, kind: "all" });
              }}
            />
            <ContactTab
              active={contactTab === "venue"}
              count={activeContacts.filter((contact) => contact.contactType === "venue").length}
              icon={Building2}
              label="Lieux"
              onClick={() => {
                const venueCount = activeContacts.filter((contact) => contact.contactType === "venue").length;
                setContactTab("venue");
                setSelectedContactIds([]);
                setActiveFilter({ label: "Tous les lieux", value: "all", count: venueCount, kind: "all" });
              }}
            />
          </div>
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
                <p className="text-xs text-muted">
                  {filteredContacts.length} {contactTab === "venue" ? "lieu(x)" : "contact(s)"}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:max-w-4xl sm:flex-row sm:justify-end">
              {contactTab === "venue" ? (
                <div className="inline-flex shrink-0 rounded-md border border-border bg-panel-strong/45 p-1" aria-label="Affichage des lieux">
                  <ViewButton active={venueView === "list"} icon={List} label="Liste" onClick={() => setVenueView("list")} />
                  <ViewButton active={venueView === "map"} icon={MapIcon} label="Carte" onClick={() => setVenueView("map")} />
                </div>
              ) : null}
              <ContactImportPanel contactType={contactTab} />
              {selectedContacts.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1 rounded-md border border-accent/20 bg-accent/5 p-1">
                  <span className="px-2 text-xs font-semibold text-accent">{selectedContacts.length} sélectionné{selectedContacts.length > 1 ? "s" : ""}</span>
                  <SelectionAction icon={BellPlus} label="Créer une action" onClick={() => setReminderContacts(selectedContacts)} />
                  <SelectionAction
                    disabled={selectedEmailContacts.length === 0}
                    icon={Mail}
                    label={`Écrire${selectedEmailContacts.length ? ` (${selectedEmailContacts.length})` : ""}`}
                    onClick={() => setEmailContacts(selectedEmailContacts)}
                  />
                  <SelectionAction danger icon={Trash2} label="Supprimer" onClick={() => setContactsToDelete(selectedContacts)} />
                  <button
                    aria-label="Annuler la sélection"
                    className="grid h-9 w-9 place-items-center rounded-md text-muted transition hover:bg-panel hover:text-foreground"
                    title="Annuler la sélection"
                    type="button"
                    onClick={() => setSelectedContactIds([])}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ) : null}
              <label className="relative block min-w-0 flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
            </div>
          </div>

          {contactTab === "venue" && venueView === "map" ? (
            <VenueMap
              contacts={activeContacts}
              venues={filteredContacts}
              onCreateAction={(venue) => setReminderContacts([venue])}
              onWrite={(venue) => setEmailContacts([venue])}
            />
          ) : (
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
                      Aucun {contactTab === "venue" ? "lieu" : "contact"} ne correspond à ce filtre.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          )}
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
          disabled={false}
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
        description="Mettez à jour les coordonnees, le rôle et les catégories."
        className="max-w-2xl"
      >
        {editingContact ? (
          <ContactForm contact={editingContact} onSuccess={() => setEditingContact(null)} />
        ) : null}
      </Dialog>

      <ContactEmailAssistant
        selectedContacts={emailContacts}
        contacts={activeContacts}
        documents={documents}
        shows={shows}
        templates={templates}
        open={emailContacts.length > 0}
        onClose={() => setEmailContacts([])}
      />

      <ReminderForm
        key={reminderContacts.map((contact) => contact.id).join("-") || "closed"}
        contacts={activeContacts}
        initialContactIds={reminderContacts.map((contact) => contact.id)}
        open={reminderContacts.length > 0}
        shows={shows}
        onClose={() => setReminderContacts([])}
      />

      <DestructiveActionDialog
        action={() => deleteContacts(contactsToDelete.map((contact) => contact.id))}
        description={contactsToDelete.length > 1
          ? `${contactsToDelete.length} contacts vont etre retires du carnet.`
          : `${contactsToDelete[0]?.name ?? "Ce contact"} va etre retire du carnet.`}
        holdLabel={contactsToDelete.length > 1
          ? `Maintenir 3 secondes pour supprimer ${contactsToDelete.length} contacts`
          : "Maintenir 3 secondes pour supprimer ce contact"}
        open={contactsToDelete.length > 0}
        title={contactsToDelete.length > 1 ? "Supprimer les contacts selectionnes ?" : "Supprimer ce contact ?"}
        warning={contactsToDelete.some((contact) => contact.contactType === "venue")
          ? "Les actions et dates resteront conservées mais seront detachees. Les personnes rattachees aux lieux resteront dans le carnet."
          : "Les actions et dates resteront conservées mais ne seront plus rattachees a ces contacts."}
        onClose={() => setContactsToDelete([])}
        onSuccess={() => {
          const deletedIds = contactsToDelete.map((contact) => contact.id);
          setRemovedContactIds((current) => Array.from(new Set([...current, ...deletedIds])));
          setSelectedContactIds((current) => current.filter((id) => !deletedIds.includes(id)));
        }}
      />
    </div>
  );
}

function ViewButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof List; label: string; onClick: () => void }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded px-3 text-sm font-medium transition",
        active ? "bg-panel text-foreground shadow-sm" : "text-muted hover:text-foreground",
      )}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function SelectionAction({
  danger = false,
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: typeof Mail;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "text-danger" : "text-foreground",
      )}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function ContactTab({ active, count, icon: Icon, label, onClick }: { active: boolean; count: number; icon: typeof UserRound; label: string; onClick: () => void }) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "relative inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium transition",
        active ? "text-accent after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-accent" : "text-muted hover:text-foreground",
      )}
      role="tab"
      type="button"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
      <span className="rounded-full bg-panel-strong px-2 py-0.5 text-xs">{count}</span>
    </button>
  );
}

function buildContactColumns({
  allContacts,
  allVisibleSelected,
  contactTab,
  onAction,
  onToggleAll,
  onToggleSelection,
  selectedContactIds,
}: {
  allContacts: Contact[];
  allVisibleSelected: boolean;
  contactTab: "person" | "venue";
  onAction: (action: ContactAction, contact: Contact) => void;
  onToggleAll: () => void;
  onToggleSelection: (contact: Contact) => void;
  selectedContactIds: string[];
}): ColumnDef<Contact>[] {
  return [
    {
      id: "selection",
      header: () => (
        <input
          aria-label="Sélectionner tous les contacts visibles"
          checked={allVisibleSelected}
          className="h-4 w-4 accent-[var(--color-accent)]"
          type="checkbox"
          onChange={onToggleAll}
        />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <input
          aria-label={`Sélectionner ${row.original.name}`}
          checked={selectedContactIds.includes(row.original.id)}
          className="h-4 w-4 accent-[var(--color-accent)]"
          title="Ajouter aux actions groupees"
          type="checkbox"
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggleSelection(row.original)}
        />
      ),
    },
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
      header: ({ column }) => <SortableHeader label={contactTab === "venue" ? "Direction" : "Structure"} onClick={() => column.toggleSorting()} />,
      cell: ({ row }) => {
        if (contactTab !== "venue") return row.original.organization;
        const directors = allContacts.filter((contact) => contact.venueId === row.original.id);
        return directors.length ? directors.map((contact) => contact.name).join(", ") : <span className="text-xs text-muted">À renseigner</span>;
      },
    },
    {
      accessorKey: "role",
      header: ({ column }) => <SortableHeader label="Rôle" onClick={() => column.toggleSorting()} />,
    },
    {
      accessorKey: "phone",
      header: "Téléphone",
      cell: ({ row }) => row.original.phone || <span className="text-xs text-muted">À renseigner</span>,
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
        <div className="flex justify-end gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
          <ContactRowAction
            action="email"
            contact={row.original}
            icon={Mail}
            label="Préparer un email"
            onAction={onAction}
          />
          <ContactRowAction
            action="reminder"
            contact={row.original}
            icon={BellPlus}
            label="Créer une action"
            onAction={onAction}
          />
          <ContactRowAction
            action="edit"
            contact={row.original}
            icon={Pencil}
            label="Modifier"
            onAction={onAction}
          />
          <ContactRowAction
            action="delete"
            contact={row.original}
            danger
            icon={Trash2}
            label="Supprimer"
            onAction={onAction}
          />
        </div>
      ),
    },
  ];
}

function ContactRowAction({
  action,
  contact,
  danger = false,
  icon: Icon,
  label,
  onAction,
}: {
  action: ContactAction;
  contact: Contact;
  danger?: boolean;
  icon: typeof Pencil;
  label: string;
  onAction: (action: ContactAction, contact: Contact) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
        danger ? "hover:bg-danger/10 hover:text-danger" : "hover:bg-accent/10 hover:text-accent",
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onAction(action, contact);
      }}
      aria-label={`${label} pour ${contact.name}`}
      title={label}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
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
        label="Créer une action"
        onClick={() => onAction("reminder", contact)}
      />
      <ContextAction icon={Mail} label="Préparer un email" onClick={() => onAction("email", contact)} />
      <div className="my-1 border-t border-border" />
      <ContextAction danger icon={Trash2} label="Supprimer" onClick={() => onAction("delete", contact)} />
    </div>
  );
}

function ContextAction({
  danger = false,
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "text-danger hover:bg-danger/10" : "text-foreground hover:bg-accent/10 hover:text-accent",
      )}
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
            label="Catégories"
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

function buildFilters(contacts: Contact[], contactTab: "person" | "venue"): ContactFilter[] {
  const filters: ContactFilter[] = [
    {
      label: contactTab === "venue" ? "Tous les lieux" : "Tous les contacts",
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
