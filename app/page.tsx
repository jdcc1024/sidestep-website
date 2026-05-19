import Link from "next/link";
import { MarketingShell } from "@/components/layout/MarketingShell";

export default function Home() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            Custom team jerseys, made in Vancouver
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Sidestep your jersey headaches.
          </h1>
          <p className="mt-6 text-lg text-zinc-600">
            Full marketing site coming in 2-01. Until then, the shell, nav, and
            footer are in place so the rest of the team can drop content into
            place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/intake"
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Get a Quote
            </Link>
            <Link
              href="/portal"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Captain portal
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
