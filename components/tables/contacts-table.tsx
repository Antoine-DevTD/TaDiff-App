"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "@/types";

const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: "name",
    header: "Nom",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "organization",
    header: "Structure",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "city",
    header: "Ville",
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const tone = row.original.status === "Partenaire" ? "success" : "neutral";
      return <Badge tone={tone}>{row.original.status}</Badge>;
    },
  },
];

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  // TanStack Table intentionally returns function-rich instances.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-panel">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-border bg-panel-strong/50 text-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 font-medium">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="bg-panel">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
