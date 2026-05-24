"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { JerseyRunSetup } from "@/components/portal/JerseyRunSetup";
import { OrderTimeline } from "@/components/portal/OrderTimeline";
import {
  chipToneForStage,
  deriveCustomerStage,
  type ChipTone,
  type CustomerStageName,
} from "@/lib/orderStages";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const orderId = id as Id<"orders">;
  const result = useQuery(api.orders.getMyOrder, { orderId });

  if (result === undefined) return <Loading />;
  if (result === null) return <NotFound />;

  const { order, designs } = result;
  const stage = deriveCustomerStage(order.internalStages);
  const tone = chipToneForStage(stage);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/portal"
        className="text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        ← Back to dashboard
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Order
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {order.teamName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Created {formatDate(order.createdAt)} · {order.sport} ·{" "}
            {order.estimatedQuantity} jerseys
          </p>
        </div>
        <StageChip stage={stage} tone={tone} />
      </header>

      <section
        aria-labelledby="timeline-heading"
        className="mt-10 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <h2
          id="timeline-heading"
          className="text-base font-semibold text-foreground"
        >
          Progress
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Updates live as Sidestep moves your order forward.
        </p>
        <div className="mt-6">
          <OrderTimeline currentStage={stage} />
        </div>
      </section>

      <section
        aria-labelledby="specs-heading"
        className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <h2 id="specs-heading" className="text-base font-semibold text-foreground">
          Order details
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Team name" value={order.teamName} />
          <Field label="Sport" value={order.sport} />
          <Field label="Quantity" value={`${order.estimatedQuantity} jerseys`} />
          <Field label="Jersey style" value={order.jerseyStyle} />
          <Field label="Neckline" value={order.neckline} />
          <Field label="Sleeve style" value={order.sleeveStyle} />
          <Field
            label="Design"
            value={
              order.hasOwnDesign ? "I have my own design" : "Sidestep is helping"
            }
          />
          <Field label="Last updated" value={formatDate(order.updatedAt)} />
        </dl>
      </section>

      <section
        aria-labelledby="jersey-run-heading"
        className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <h2
          id="jersey-run-heading"
          className="text-base font-semibold text-foreground"
        >
          Jersey run
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Collect sizes, names, and numbers from your team with one shareable
          link.
        </p>
        <div className="mt-6">
          <JerseyRunSetup orderId={orderId} />
        </div>
      </section>

      <section
        aria-labelledby="designs-heading"
        className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <h2
          id="designs-heading"
          className="text-base font-semibold text-foreground"
        >
          Linked designs
        </h2>
        {designs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No designs linked to this order yet.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {designs.map((design) => (
              <li key={design._id}>
                <Link
                  href={`/portal/designs/${design._id}`}
                  className="flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                >
                  <h3 className="text-sm font-semibold text-foreground">
                    {design.title}
                  </h3>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {design.fileCount === 0
                      ? "No files yet"
                      : `${design.fileCount} file${
                          design.fileCount === 1 ? "" : "s"
                        }`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}

function StageChip({
  stage,
  tone,
}: {
  stage: CustomerStageName | null;
  tone: ChipTone;
}) {
  const palette: Record<ChipTone, string> = {
    pending: "bg-muted text-muted-foreground",
    "in-progress": "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-medium ${palette[tone]}`}
    >
      {stage ?? "Pending"}
    </span>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-10 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-32 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-40 animate-pulse rounded bg-muted" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground">Order not found</h1>
      <p className="mt-2 text-muted-foreground">
        We couldn&apos;t find that order — it may have been removed.
      </p>
      <Link
        href="/portal"
        className="mt-6 inline-flex items-center gap-1 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
      >
        Back to dashboard
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
