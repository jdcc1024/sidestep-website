"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrderTimeline } from "@/components/portal/OrderTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import {
  chipToneForStage,
  deriveCustomerStage,
  type ChipTone,
  type CustomerStageName,
} from "@/lib/orderStages";

type PageProps = {
  params: Promise<{ id: string }>;
};

type OrderDesign = {
  _id: Id<"designs">;
  title: string;
  brief: string;
  canvaLink?: string;
  jerseyStyle?: string;
  neckline?: string;
  sleeveStyle?: string;
  fileCount: number;
};

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const orderId = id as Id<"orders">;
  const result = useQuery(api.orders.getMyOrder, { orderId });
  // Run state drives the handoff CTA. A run only exists once the captain has
  // gone through Run Setup ("first collect") — saving an order never creates
  // one, so null here is the common starting state, not an error.
  const run = useQuery(api.jerseyRuns.getByOrder, { orderId });

  if (result === undefined) return <Loading />;
  if (result === null) return <NotFound />;

  const { order, designs } = result;
  const stage = deriveCustomerStage(order.internalStages);
  const tone = chipToneForStage(stage);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/portal"
        className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200"
      >
        ← Back to dashboard
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
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
        <div className="flex shrink-0 items-center gap-3">
          <StageChip stage={stage} tone={tone} />
          <Link
            href={`/portal/orders/${orderId}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Edit order
          </Link>
        </div>
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
          <Field
            label="Design"
            value={
              order.hasOwnDesign ? "I have my own design" : "Sidestep is helping"
            }
          />
          <Field label="Last updated" value={formatDate(order.updatedAt)} />
        </dl>
      </section>

      <section aria-labelledby="designs-heading" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="designs-heading"
              className="text-lg font-semibold text-foreground"
            >
              Designs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {designs.length === 0
                ? "Each design in this order — home, away, warmup — gets its own section here."
                : `${designs.length} design${
                    designs.length === 1 ? "" : "s"
                  } in this order.`}
            </p>
          </div>
          <Link
            href={`/portal/orders/${orderId}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {designs.length === 0 ? "Attach a design" : "Manage designs"}
          </Link>
        </div>

        {designs.length === 0 ? (
          <NoDesigns orderId={orderId} />
        ) : (
          <div className="mt-4 space-y-4">
            {designs.map((design) => (
              <DesignSection key={design._id} design={design} />
            ))}
          </div>
        )}
      </section>

      <CollectSection
        orderId={orderId}
        run={run}
        hasDesigns={designs.length > 0}
      />
    </div>
  );
}

// Each linked design renders as its own section under the one order timeline
// (O-05). It carries the design's silhouette specs and a per-design rollup
// placeholder — real collected counts arrive once O-07 wires the roster.
function DesignSection({ design }: { design: OrderDesign }) {
  const hasSpecs = design.jerseyStyle || design.neckline || design.sleeveStyle;
  return (
    <section
      aria-label={`Design: ${design.title}`}
      className="rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {design.title}
          </h3>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {design.fileCount === 0
              ? "No files yet"
              : `${design.fileCount} file${design.fileCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href={`/portal/designs/${design._id}`}
          className="text-sm font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200"
        >
          View design →
        </Link>
      </div>

      {hasSpecs ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Spec label="Jersey style" value={design.jerseyStyle} />
          <Spec label="Neckline" value={design.neckline} />
          <Spec label="Sleeve style" value={design.sleeveStyle} />
        </dl>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          The cut isn&apos;t decided yet — Sidestep will help you choose.
        </p>
      )}

      {/* Per-design rollup — placeholder until O-07 derives counts from the
          unified roster. The run spans all designs, so "which design" becomes
          a per-row attribute the Roster Manager fills in later. */}
      <div className="mt-4 rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Collected counts will appear here once your team starts submitting.
      </div>
    </section>
  );
}

function NoDesigns({ orderId }: { orderId: Id<"orders"> }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        No designs attached yet
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Attach at least one design to move this order forward and unlock
        collecting sizes from your team.
      </p>
      <Link
        href={`/portal/orders/${orderId}/edit`}
        className={cn(
          buttonVariants({ size: "sm" }),
          "mt-4 bg-teal-600 font-semibold text-white hover:bg-teal-700",
        )}
      >
        Attach a design
      </Link>
    </div>
  );
}

// The handoff into Run Setup. Run creation is lazy: this section routes the
// captain to the setup surface, where the first "collect" creates the run.
// Gated until at least one design is attached so the progress milestone the
// order page shows stays honest.
function CollectSection({
  orderId,
  run,
  hasDesigns,
}: {
  orderId: Id<"orders">;
  run: { _id: Id<"jerseyRuns">; deadline: number; status: "open" | "closed" } | null | undefined;
  hasDesigns: boolean;
}) {
  return (
    <section
      aria-labelledby="collect-heading"
      className="mt-10 rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <h2 id="collect-heading" className="text-base font-semibold text-foreground">
        Collect from your team
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Gather sizes, names, and numbers with one shareable link.
      </p>

      <div className="mt-6">
        {run === undefined ? (
          <Skeleton className="h-10 w-48" />
        ) : run !== null ? (
          <RunStatus orderId={orderId} run={run} />
        ) : hasDesigns ? (
          <Link
            href={`/portal/orders/${orderId}/run/setup`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-teal-600 font-semibold text-white hover:bg-teal-700",
            )}
          >
            Set up your run
          </Link>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Not available yet.
            </span>{" "}
            Attach a design above first — then you can set up a run to collect
            sizes from your team.
          </div>
        )}
      </div>
    </section>
  );
}

function RunStatus({
  orderId,
  run,
}: {
  orderId: Id<"orders">;
  run: { deadline: number; status: "open" | "closed" };
}) {
  const closed = run.status === "closed";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            closed
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
          }`}
        >
          {closed ? "Collection closed" : "Collecting"}
        </span>
        <span className="text-sm text-muted-foreground">
          {closed ? "Closed " : "Closes "}
          {formatDate(run.deadline)}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/portal/orders/${orderId}/run/responses`}
          className={cn(
            buttonVariants({ size: "sm" }),
            "bg-teal-600 font-semibold text-white hover:bg-teal-700",
          )}
        >
          View responses
        </Link>
        <Link
          href={`/portal/orders/${orderId}/run/setup`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Manage run
        </Link>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground/90">
        {value || <span className="text-muted-foreground">Not set</span>}
      </dd>
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
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-6 bg-teal-600 font-semibold text-white shadow-sm hover:bg-teal-700",
        )}
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
