"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { INTERNAL_STAGES } from "@/lib/orderStages";

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const result = useQuery(api.admin.getOrder, {
    orderId: id as Id<"orders">,
  });

  if (result === undefined) {
    return <DetailSkeleton />;
  }
  if (result === null) {
    return <NotFound />;
  }

  const { order, captain, designs, jerseyRun, jerseyRunResponseCount } =
    result;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/admin/orders"
        className="text-sm text-teal-700 hover:underline"
      >
        ← All orders
      </Link>

      <header className="mt-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-rose-700">
          Admin · Order
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {order.teamName}
        </h1>
        <p className="mt-2 text-zinc-600">
          Created {formatDate(order.createdAt)} · {order.sport} ·{" "}
          {order.estimatedQuantity} jerseys
        </p>
      </header>

      <section
        aria-labelledby="captain-heading"
        className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <h2
          id="captain-heading"
          className="text-base font-semibold text-zinc-900"
        >
          Captain
        </h2>
        {captain ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Field label="Name" value={captain.name} />
            <Field
              label="Email"
              value={
                <a
                  href={`mailto:${captain.email}`}
                  className="text-teal-700 hover:underline"
                >
                  {captain.email}
                </a>
              }
            />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            Captain record missing.
          </p>
        )}
      </section>

      <section
        aria-labelledby="specs-heading"
        className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <h2 id="specs-heading" className="text-base font-semibold text-zinc-900">
          Order specs
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Team name" value={order.teamName} />
          <Field label="Sport" value={order.sport} />
          <Field label="Quantity" value={String(order.estimatedQuantity)} />
          <Field label="Jersey style" value={order.jerseyStyle} />
          <Field label="Neckline" value={order.neckline} />
          <Field label="Sleeve style" value={order.sleeveStyle} />
          <Field
            label="Customer has own design"
            value={order.hasOwnDesign ? "Yes" : "No"}
          />
          <Field
            label="Last updated"
            value={formatDate(order.updatedAt)}
          />
        </dl>
      </section>

      <section
        aria-labelledby="designs-heading"
        className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <h2
          id="designs-heading"
          className="text-base font-semibold text-zinc-900"
        >
          Linked designs
        </h2>
        {designs.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No designs linked yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {designs.map((design) => (
              <li
                key={design._id}
                className="rounded-md border border-zinc-200 p-4"
              >
                <h3 className="text-sm font-semibold text-zinc-900">
                  {design.title}
                </h3>
                {design.brief && (
                  <p className="mt-1 text-sm text-zinc-600">{design.brief}</p>
                )}
                {design.canvaLink && (
                  <p className="mt-2 text-xs">
                    <a
                      href={design.canvaLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 hover:underline"
                    >
                      Canva link ↗
                    </a>
                  </p>
                )}
                {design.fileUrls.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {design.fileUrls.map((file, idx) =>
                      file.url ? (
                        <li key={file.storageId}>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                          >
                            File {idx + 1} ↓
                          </a>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="stages-heading"
        className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <h2
          id="stages-heading"
          className="text-base font-semibold text-zinc-900"
        >
          Internal stages
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Read-only here — editable checklist with timestamps ships in 2-12.
        </p>
        <ul className="mt-4 space-y-2">
          {INTERNAL_STAGES.map((name) => {
            const stage = order.internalStages.find((s) => s.name === name);
            const completed = stage?.completedAt != null;
            return (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <StageDot completed={completed} />
                  <span
                    className={
                      completed
                        ? "font-medium text-zinc-900"
                        : "text-zinc-600"
                    }
                  >
                    {name}
                  </span>
                </span>
                <span className="text-xs text-zinc-500">
                  {completed && stage?.completedAt
                    ? formatDate(stage.completedAt)
                    : "Pending"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="run-heading"
        className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <h2 id="run-heading" className="text-base font-semibold text-zinc-900">
          Jersey run
        </h2>
        {jerseyRun ? (
          <>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Field label="Status" value={jerseyRun.status} />
              <Field label="Names mode" value={jerseyRun.namesMode} />
              <Field
                label="Deadline"
                value={formatDate(jerseyRun.deadline)}
              />
              <Field label="Responses" value={String(jerseyRunResponseCount)} />
            </dl>
            <p className="mt-4 text-sm">
              <Link
                href={`/admin/jersey-runs/${jerseyRun._id}`}
                className="text-teal-700 hover:underline"
              >
                View responses and close run →
              </Link>
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            No jersey run created for this order.
          </p>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-zinc-900">{value}</dd>
    </div>
  );
}

function StageDot({ completed }: { completed: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 rounded-full ${
        completed ? "bg-emerald-500" : "bg-zinc-300"
      }`}
    />
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="h-6 w-32 animate-pulse rounded bg-zinc-100" />
      <div className="mt-4 h-10 w-72 animate-pulse rounded bg-zinc-100" />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="mt-6 h-40 animate-pulse rounded-lg bg-zinc-100"
        />
      ))}
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-2xl font-semibold text-zinc-900">Order not found</p>
      <p className="mt-2 text-zinc-600">
        The order you&apos;re looking for doesn&apos;t exist or has been
        deleted.
      </p>
      <Link
        href="/admin/orders"
        className="mt-6 inline-block text-sm text-teal-700 hover:underline"
      >
        ← Back to all orders
      </Link>
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
