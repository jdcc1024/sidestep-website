"use client";

import Link from "next/link";
import { use } from "react";
import { Logo } from "@/components/layout/Logo";
import { JerseyRunPublicForm } from "@/components/run/JerseyRunPublicForm";
import type { Id } from "@/convex/_generated/dataModel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function JerseyRunPublicPage({ params }: PageProps) {
  const { id } = use(params);
  const jerseyRunId = id as Id<"jerseyRuns">;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-700"
          >
            About Sidestep
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
            <JerseyRunPublicForm jerseyRunId={jerseyRunId} />
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6 text-center text-xs text-zinc-500 sm:px-6">
          Powered by Sidestep — custom team jerseys, made in Vancouver.
        </div>
      </footer>
    </div>
  );
}
