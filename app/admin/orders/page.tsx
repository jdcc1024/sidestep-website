"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { currentInternalStage } from "@/lib/orderStages";

type SortKey =
  | "teamName"
  | "captainName"
  | "sport"
  | "estimatedQuantity"
  | "currentStage"
  | "createdAt";

type SortDirection = "asc" | "desc";

type ColumnDef = {
  key: SortKey;
  label: string;
  numeric?: boolean;
};

const COLUMNS: ReadonlyArray<ColumnDef> = [
  { key: "teamName", label: "Team" },
  { key: "captainName", label: "Captain" },
  { key: "sport", label: "Sport" },
  { key: "estimatedQuantity", label: "Qty", numeric: true },
  { key: "currentStage", label: "Current stage" },
  { key: "createdAt", label: "Created", numeric: true },
];

export default function AdminOrdersPage() {
  const orders = useQuery(api.admin.listOrders);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const rows = useMemo(() => {
    if (!orders) return [];
    return orders
      .map((order) => ({
        ...order,
        currentStage: currentInternalStage(order.internalStages) ?? "—",
      }))
      .sort((a, b) => compareBy(a, b, sortKey, direction));
  }, [orders, sortKey, direction]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection(key === "createdAt" ? "desc" : "asc");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-rose-700">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          All orders
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600">
          Every order across every customer. Click a row to open the full
          admin view.
        </p>
      </header>

      <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        {orders === undefined ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyOrders />
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
                  <tr
                    key={row._id}
                    className="hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      <Link
                        href={`/admin/orders/${row._id}`}
                        className="text-teal-700 hover:underline"
                      >
                        {row.teamName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      <div>{row.captainName}</div>
                      <div className="text-xs text-zinc-500">
                        {row.captainEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {row.sport}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {row.estimatedQuantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {row.currentStage}
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
    <div className="space-y-2 p-4" aria-label="Loading orders">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded bg-zinc-100"
        />
      ))}
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-base font-semibold text-zinc-900">No orders yet</p>
      <p className="mt-2 text-sm text-zinc-600">
        Orders will appear here as customers start them.
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
