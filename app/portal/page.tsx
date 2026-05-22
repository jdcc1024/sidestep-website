"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  chipToneForStage,
  deriveCustomerStage,
  type ChipTone,
} from "@/lib/orderStages";

const BRIEF_PREVIEW_CHARS = 140;

export default function PortalDashboardPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const orders = useQuery(api.orders.listMyOrders);
  const designs = useQuery(api.designs.listMyDesigns);

  const greetingName = user?.firstName ?? "Captain";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {isUserLoaded ? `Welcome back, ${greetingName}.` : "Welcome back."}
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600">
          Your orders and designs at a glance. Everything here updates in
          real-time as Sidestep moves your work forward.
        </p>
      </header>

      <section aria-labelledby="orders-heading" className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="orders-heading"
              className="text-xl font-semibold text-zinc-900"
            >
              My Orders
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Track every order you&apos;ve placed.
            </p>
          </div>
        </div>
        <div className="mt-4">
          {orders === undefined ? (
            <SectionSkeleton />
          ) : orders.length === 0 ? (
            <EmptyOrders />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {orders.map((order) => (
                <li key={order._id}>
                  <OrderCard order={order} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="designs-heading" className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="designs-heading"
              className="text-xl font-semibold text-zinc-900"
            >
              My Designs
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Briefs, mood boards, and reference files.
            </p>
          </div>
          {designs && designs.length > 0 && (
            <Link
              href="/portal/designs/new"
              className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              New design <span aria-hidden>→</span>
            </Link>
          )}
        </div>
        <div className="mt-4">
          {designs === undefined ? (
            <SectionSkeleton />
          ) : designs.length === 0 ? (
            <EmptyDesigns />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {designs.map((design) => (
                <li key={design._id}>
                  <DesignCard design={design} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function OrderCard({ order }: { order: Doc<"orders"> }) {
  const stage = deriveCustomerStage(order.internalStages);
  const tone = chipToneForStage(stage);

  return (
    <article className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-zinc-900">
          {order.teamName}
        </h3>
        <StageChip stage={stage} tone={tone} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-zinc-500">Sport</dt>
        <dd className="text-zinc-900">{order.sport}</dd>
        <dt className="text-zinc-500">Quantity</dt>
        <dd className="text-zinc-900">{order.estimatedQuantity} jerseys</dd>
      </dl>
    </article>
  );
}

function DesignCard({ design }: { design: Doc<"designs"> }) {
  const fileCount = design.fileIds.length;
  const briefPreview = truncate(design.brief, BRIEF_PREVIEW_CHARS);

  return (
    <Link
      href={`/portal/designs/${design._id}`}
      className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
    >
      <h3 className="text-lg font-semibold text-zinc-900">{design.title}</h3>
      {briefPreview && (
        <p className="mt-2 text-sm text-zinc-600">{briefPreview}</p>
      )}
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {fileCount === 0
          ? "No files yet"
          : `${fileCount} file${fileCount === 1 ? "" : "s"}`}
      </p>
    </Link>
  );
}

function StageChip({
  stage,
  tone,
}: {
  stage: string | null;
  tone: ChipTone;
}) {
  const label = stage ?? "Pending";
  const palette: Record<ChipTone, string> = {
    pending: "bg-zinc-100 text-zinc-700",
    "in-progress": "bg-amber-100 text-amber-800",
    complete: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${palette[tone]}`}
    >
      {label}
    </span>
  );
}

function EmptyOrders() {
  return (
    <EmptyState
      iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      title="You don't have any orders yet"
      body="Once you create an order, you'll see its progress through every stage right here."
      ctaLabel="Start your first order"
      ctaHref="/portal/orders/new"
    />
  );
}

function EmptyDesigns() {
  return (
    <EmptyState
      iconPath="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      title="No designs yet"
      body="Upload your team logo, mood board, or reference photos so Sidestep can get started."
      ctaLabel="Upload a design"
      ctaHref="/portal/designs/new"
    />
  );
}

function EmptyState({
  iconPath,
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  iconPath: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
      <svg
        className="mx-auto h-10 w-10 text-zinc-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d={iconPath}
        />
      </svg>
      <h3 className="mt-4 text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600">{body}</p>
      <Link
        href={ctaHref}
        className="mt-5 inline-flex items-center gap-1 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
      >
        {ctaLabel} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-label="Loading">
      {[0, 1].map((i) => (
        <li
          key={i}
          className="h-32 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100"
        />
      ))}
    </ul>
  );
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trimEnd()}…`;
}
