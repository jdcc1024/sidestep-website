"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DesignForm } from "@/components/portal/DesignForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function DesignDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const designId = id as Id<"designs">;
  const design = useQuery(api.designs.getMyDesign, { designId });
  const [editing, setEditing] = useState(false);

  if (design === undefined) {
    return <Loading />;
  }

  if (design === null) {
    return <NotFound />;
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={`/portal/designs/${design._id}`}
          onClick={(e) => {
            e.preventDefault();
            setEditing(false);
          }}
          className="text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          ← Cancel edit
        </Link>
        <header className="mt-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Edit design
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {design.title}
          </h1>
        </header>
        <div className="mt-10">
          <DesignForm
            mode={{
              kind: "edit",
              designId: design._id,
              initialTitle: design.title,
              initialBrief: design.brief,
              initialCanvaLink: design.canvaLink ?? "",
              existingFileCount: design.files.length,
            }}
          />
        </div>
      </div>
    );
  }

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
            Design
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {design.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Created {formatDate(design.createdAt)}
            {design.updatedAt !== design.createdAt && (
              <span> · Updated {formatDate(design.updatedAt)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-md border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
        >
          Edit design
        </button>
      </header>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-zinc-900">Brief</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
          {design.brief}
        </p>
      </section>

      {design.canvaLink && (
        <section className="mt-8">
          <h2 className="text-base font-semibold text-zinc-900">Canva</h2>
          <a
            href={design.canvaLink}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-flex items-center gap-1 break-all text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            {design.canvaLink}
            <span aria-hidden>↗</span>
          </a>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-base font-semibold text-zinc-900">
          Files ({design.files.length})
        </h2>
        {design.files.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No files attached.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {design.files.map((file, idx) => (
              <li
                key={file.storageId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="truncate text-sm text-zinc-700">
                  File {idx + 1}
                </span>
                {file.url ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-medium text-teal-700 hover:text-teal-800"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-sm text-zinc-400">Unavailable</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="h-6 w-32 animate-pulse rounded bg-zinc-100" />
      <div className="mt-6 h-10 w-2/3 animate-pulse rounded bg-zinc-100" />
      <div className="mt-8 h-32 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900">Design not found</h1>
      <p className="mt-2 text-zinc-600">
        We couldn&apos;t find that design — it may have been removed.
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
