"use client";

import Link from "next/link";
import { ArrowUpDown, Search, Tags, Users } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types";

type ContactFilter = {
  label: string;
  value: string;
  count: number;
  kind: "all" | "status" | "role" | "tag";
};

const columns: ColumnDef<Contact>[] = [
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
];

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ContactFilter>({
    label: "Tous les contacts",
    value: "all",
    count: contacts.length,
    kind: "all",
  });

  const filters = useMemo(() => buildFilters(contacts), [contacts]);
  const filteredContacts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesFilter =
        activeFilter.kind === "all" ||
        (activeFilter.kind === "status" && contact.status === activeFilter.value) ||
        (activeFilter.kind === "role" && contact.role === activeFilter.value) ||
        (activeFilter.kind === "tag" && contact.tags.includes(activeFilter.value));

      if (!matchesFilter) return false;

      if (!normalizedSearch) return true;

      return [contact.name, contact.organization, contact.role, contact.city, contact.email, ...contact.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [activeFilter, contacts, search]);

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

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-panel">
      <div className="grid min-h-[560px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-panel-strong/45 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-accent" aria-hidden />
            Filtres
          </div>
          <div className="mt-4 space-y-1.5">
            {filters.map((filter) => (
              <button
                key={`${filter.kind}-${filter.value}`}
                type="button"
                className={cn(
                  "flex min-h-10 w-full items-center justify-between rounded-full px-3 text-left text-sm transition",
                  activeFilter.kind === filter.kind && activeFilter.value === filter.value
                    ? "bg-accent/12 text-accent"
                    : "text-muted hover:bg-panel hover:text-foreground",
                )}
                onClick={() => setActiveFilter(filter)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Tags className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{filter.label}</span>
                </span>
                <span className="ml-3 text-xs font-semibold">{filter.count}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{activeFilter.label}</p>
              <p className="text-xs text-muted">{filteredContacts.length} contact(s)</p>
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
            <table className="w-full min-w-[880px] text-left text-sm">
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
        </section>
      </div>
    </div>
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

  for (const status of ["Prospect", "En discussion", "Partenaire"] as const) {
    const count = contacts.filter((contact) => contact.status === status).length;
    if (count > 0) filters.push({ label: status, value: status, count, kind: "status" });
  }

  const roles = countValues(contacts.map((contact) => contact.role).filter(Boolean));
  const tags = countValues(contacts.flatMap((contact) => contact.tags));

  for (const [role, count] of roles.slice(0, 6)) {
    filters.push({ label: role, value: role, count, kind: "role" });
  }

  for (const [tag, count] of tags.slice(0, 10)) {
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
