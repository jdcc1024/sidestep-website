"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  describeDeadline,
  estimateForResponses,
  participationLabel,
} from "@/lib/jerseyRunDashboard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function JerseyRunResponsesPage({ params }: PageProps) {
  const { id } = use(params);
  const orderId = id as Id<"orders">;

  // Resolve the run from the order so the URL stays /orders/[id]/run/...
  // — captains link straight into this page from the order detail and
  // don't see jerseyRunIds anywhere in the UI.
  const order = useQuery(api.orders.getMyOrder, { orderId });
  const runStub = useQuery(
    api.jerseyRuns.getByOrder,
    order ? { orderId } : "skip",
  );
  const data = useQuery(
    api.jerseyRuns.listResponses,
    runStub ? { jerseyRunId: runStub._id } : "skip",
  );

  if (order === undefined || runStub === undefined || data === undefined)
    return <Loading orderId={orderId} />;
  if (order === null) return <NotFound orderId={orderId} />;
  if (runStub === null) return <NoRunYet orderId={orderId} />;
  if (data === null) return <NotFound orderId={orderId} />;

  const { run, responses } = data;
  const deadlineStatus = describeDeadline(run.deadline);
  const estimate = estimateForResponses(responses.length, order.order);
  const teamName = order.order.teamName;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href={`/portal/orders/${orderId}`}
        className="text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        ← Back to order
      </Link>

      <header className="mt-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
          Jersey run · {teamName}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Responses
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Updates live as your team submits — no need to refresh.
        </p>
      </header>

      <section
        aria-label="Summary"
        className="mt-8 grid gap-3 sm:grid-cols-3"
      >
        <SummaryCard
          label="Participation"
          value={String(responses.length)}
          caption={participationLabel(responses.length)}
        />
        <SummaryCard
          label="Deadline"
          value={deadlineStatus.kind === "closed" ? "Closed" : deadlineStatus.label.replace(/^Closes /, "")}
          caption={deadlineStatus.label}
          tone={deadlineStatus.kind === "closed" ? "muted" : "active"}
        />
        <SummaryCard
          label="Estimated total"
          value={formatPrice(estimate.total)}
          caption={
            estimate.quantity === 0
              ? "Waiting for the first response"
              : `${estimate.quantity} × ${formatPrice(estimate.perUnitPrice)}${
                  estimate.designFee > 0
                    ? ` + ${formatPrice(estimate.designFee)} design fee`
                    : ""
                }`
          }
        />
      </section>

      <section
        aria-label="Response table"
        className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
      >
        {responses.length === 0 ? (
          <EmptyState jerseyRunId={run._id} />
        ) : (
          <ResponseTable
            responses={responses}
            customQuestions={run.customQuestions}
          />
        )}
      </section>
    </div>
  );
}

type ResponseRow = {
  _id: Id<"jerseyRunResponses">;
  respondentName: string;
  respondentEmail: string;
  size: string;
  jerseyName?: string;
  jerseyNumber?: string;
  customAnswers: Record<string, string>;
  submittedAt: number;
};

function ResponseTable({
  responses,
  customQuestions,
}: {
  responses: ResponseRow[];
  customQuestions: { id: string; label: string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            <th scope="col" className="px-4 py-3">Name</th>
            <th scope="col" className="px-4 py-3">Email</th>
            <th scope="col" className="px-4 py-3">Size</th>
            <th scope="col" className="px-4 py-3">Jersey name</th>
            <th scope="col" className="px-4 py-3">Number</th>
            {customQuestions.map((q) => (
              <th key={q.id} scope="col" className="px-4 py-3">
                {q.label}
              </th>
            ))}
            <th scope="col" className="px-4 py-3">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {responses.map((r) => (
            <tr key={r._id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                {r.respondentName}
              </td>
              <td className="px-4 py-3 text-zinc-700">{r.respondentEmail}</td>
              <td className="px-4 py-3 text-zinc-700">{r.size}</td>
              <td className="px-4 py-3 text-zinc-700">
                {r.jerseyName ?? <span className="text-zinc-400">—</span>}
              </td>
              <td className="px-4 py-3 text-zinc-700">
                {r.jerseyNumber ?? <span className="text-zinc-400">—</span>}
              </td>
              {customQuestions.map((q) => (
                <td key={q.id} className="px-4 py-3 text-zinc-700">
                  {r.customAnswers[q.id]?.trim() ? (
                    r.customAnswers[q.id]
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                {formatTimestamp(r.submittedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  caption,
  tone = "active",
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "active" | "muted";
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold ${
          tone === "muted" ? "text-zinc-500" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{caption}</p>
    </div>
  );
}

function EmptyState({ jerseyRunId }: { jerseyRunId: Id<"jerseyRuns"> }) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/run/${jerseyRunId}`
      : `/run/${jerseyRunId}`;
  return (
    <div className="px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-zinc-900">
        No responses yet
      </h2>
      <p className="mt-2 text-sm text-zinc-600">
        Share your link to get started — submissions show up here in
        real-time.
      </p>
      <p className="mt-4 inline-block break-all rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        {shareUrl}
      </p>
    </div>
  );
}

function NoRunYet({ orderId }: { orderId: Id<"orders"> }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900">No jersey run yet</h1>
      <p className="mt-2 text-zinc-600">
        Set up a jersey run on the order page to start collecting responses.
      </p>
      <Link
        href={`/portal/orders/${orderId}`}
        className="mt-6 inline-flex items-center gap-1 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
      >
        Back to order
      </Link>
    </div>
  );
}

function NotFound({ orderId }: { orderId: Id<"orders"> }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        We couldn&apos;t find that jersey run
      </h1>
      <p className="mt-2 text-zinc-600">
        It may have been removed, or you don&apos;t have access to it.
      </p>
      <Link
        href={`/portal/orders/${orderId}`}
        className="mt-6 inline-flex items-center gap-1 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
      >
        Back to order
      </Link>
    </div>
  );
}

function Loading({ orderId }: { orderId: Id<"orders"> }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href={`/portal/orders/${orderId}`}
        className="text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        ← Back to order
      </Link>
      <div className="mt-6 h-10 w-2/3 animate-pulse rounded bg-zinc-100" />
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded bg-zinc-100" />
        <div className="h-24 animate-pulse rounded bg-zinc-100" />
        <div className="h-24 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="mt-8 h-60 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

function formatPrice(amount: number): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
