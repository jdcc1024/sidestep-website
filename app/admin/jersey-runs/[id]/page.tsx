"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { describeDeadline } from "@/lib/jerseyRunDashboard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function AdminJerseyRunDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const jerseyRunId = id as Id<"jerseyRuns">;

  const data = useQuery(api.jerseyRuns.listResponses, { jerseyRunId });
  const closeRun = useMutation(api.jerseyRuns.closeRunByAdmin);

  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  if (data === undefined) return <Loading />;
  if (data === null) return <NotFound />;

  const { run, order, responses } = data;
  const deadlineStatus = describeDeadline(run.deadline);
  const isClosed = run.status === "closed";

  const handleClose = async () => {
    if (closing || isClosed) return;
    const confirmed = window.confirm(
      `Close the jersey run for ${order.teamName}? This sends closure emails to the captain and Sidestep ops.`,
    );
    if (!confirmed) return;
    setClosing(true);
    setCloseError(null);
    try {
      await closeRun({ jerseyRunId });
    } catch (err) {
      const message =
        err instanceof ConvexError
          ? String(err.data)
          : err instanceof Error
            ? err.message
            : "Failed to close run.";
      setCloseError(message);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/admin/jersey-runs"
        className="text-sm text-teal-700 hover:underline"
      >
        ← All jersey runs
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-rose-700">
            Admin · Jersey run
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {order.teamName}
          </h1>
          <p className="mt-2 text-zinc-600">
            <Link
              href={`/admin/orders/${order._id}`}
              className="text-teal-700 hover:underline"
            >
              Open order →
            </Link>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={run.status} />
          {isClosed ? (
            <span className="text-xs text-zinc-500">Close emails sent</span>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              disabled={closing}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {closing ? "Closing…" : "Close run"}
            </button>
          )}
          {closeError && (
            <p className="text-xs text-rose-700">{closeError}</p>
          )}
        </div>
      </header>

      <section
        aria-label="Summary"
        className="mt-8 grid gap-3 sm:grid-cols-4"
      >
        <SummaryCard
          label="Responses"
          value={String(responses.length)}
          caption={
            responses.length === 1
              ? "1 submission"
              : `${responses.length} submissions`
          }
        />
        <SummaryCard
          label="Deadline"
          value={formatDate(run.deadline)}
          caption={deadlineStatus.label}
          tone={deadlineStatus.kind === "closed" ? "muted" : "active"}
        />
        <SummaryCard
          label="Names mode"
          value={run.namesMode === "fixed" ? "Fixed roster" : "Open"}
          caption={
            run.namesMode === "fixed"
              ? `${run.fixedRoster?.length ?? 0} roster names`
              : "Anyone can submit"
          }
        />
        <SummaryCard
          label="Sizes offered"
          value={run.sizeOptions.join(", ") || "—"}
          caption="Pickable on the public form"
        />
      </section>

      <section
        aria-labelledby="responses-heading"
        className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
      >
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2
            id="responses-heading"
            className="text-base font-semibold text-zinc-900"
          >
            Responses
          </h2>
        </div>
        {responses.length === 0 ? (
          <EmptyResponses />
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
              <td className="px-4 py-3 text-zinc-700">
                <a
                  href={`mailto:${r.respondentEmail}`}
                  className="text-teal-700 hover:underline"
                >
                  {r.respondentEmail}
                </a>
              </td>
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

function StatusBadge({ status }: { status: "open" | "closed" }) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Open
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700">
      Closed
    </span>
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
        className={`mt-2 text-xl font-bold ${
          tone === "muted" ? "text-zinc-500" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{caption}</p>
    </div>
  );
}

function EmptyResponses() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-base font-semibold text-zinc-900">
        No responses yet
      </p>
      <p className="mt-2 text-sm text-zinc-600">
        Submissions show up here as fans fill out the public form.
      </p>
    </div>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="h-6 w-32 animate-pulse rounded bg-zinc-100" />
      <div className="mt-4 h-10 w-72 animate-pulse rounded bg-zinc-100" />
      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded bg-zinc-100" />
        ))}
      </div>
      <div className="mt-8 h-64 animate-pulse rounded-lg bg-zinc-100" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-2xl font-semibold text-zinc-900">
        Jersey run not found
      </p>
      <p className="mt-2 text-zinc-600">
        The run you&apos;re looking for doesn&apos;t exist or has been deleted.
      </p>
      <Link
        href="/admin/jersey-runs"
        className="mt-6 inline-block text-sm text-teal-700 hover:underline"
      >
        ← Back to all jersey runs
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

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
