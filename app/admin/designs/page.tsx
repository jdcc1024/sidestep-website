"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type SortKey = "title" | "ownerName" | "fileCount" | "createdAt";
type SortDirection = "asc" | "desc";

type ColumnDef = {
  key: SortKey;
  label: string;
};

const COLUMNS: ReadonlyArray<ColumnDef> = [
  { key: "title", label: "Title" },
  { key: "ownerName", label: "Owner" },
  { key: "fileCount", label: "Files" },
  { key: "createdAt", label: "Created" },
];

export default function AdminDesignsPage() {
  const designs = useQuery(api.admin.listDesigns);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const rows = useMemo(() => {
    if (!designs) return [];
    return designs
      .map((design) => ({
        ...design,
        fileCount: design.fileIds.length,
      }))
      .sort((a, b) => compareBy(a, b, sortKey, direction));
  }, [designs, sortKey, direction]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection(key === "createdAt" || key === "fileCount" ? "desc" : "asc");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-rose-700">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          All designs
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600">
          Every design uploaded across every customer.
        </p>
      </header>

      <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        {designs === undefined ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyDesigns />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={
                        sortKey === col.key
                          ? direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-zinc-900"
                      >
                        {col.label}
                        <SortIndicator
                          active={sortKey === col.key}
                          direction={direction}
                        />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {rows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {row.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      <div>{row.ownerName}</div>
                      <div className="text-xs text-zinc-500">
                        {row.ownerEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {row.fileCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active)
    return (
      <span aria-hidden className="text-zinc-300">
        ↕
      </span>
    );
  return <span aria-hidden>{direction === "asc" ? "↑" : "↓"}</span>;
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-label="Loading designs">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-zinc-100" />
      ))}
    </div>
  );
}

function EmptyDesigns() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-base font-semibold text-zinc-900">No designs yet</p>
      <p className="mt-2 text-sm text-zinc-600">
        Designs will appear here as customers upload them.
      </p>
    </div>
  );
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function compareBy<T extends Record<SortKey, unknown>>(
  a: T,
  b: T,
  key: SortKey,
  direction: SortDirection,
): number {
  const left = a[key];
  const right = b[key];
  const result =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), undefined, {
          sensitivity: "base",
        });
  return direction === "asc" ? result : -result;
}
