import Link from "next/link";

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-b from-teal-50/60 to-white"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Your Team. Your Colors.
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
            Custom team jerseys, designed with you.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-600">
            Sidestep is a Vancouver-based custom jersey studio. Backed by 20+
            years of industry experience, we help your team design and produce
            fully sublimated jerseys that reflect your story — from concept to
            delivery.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/intake"
              className="rounded-md bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Start your order
            </Link>
            <Link
              href="#process"
              className="rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              See our process
            </Link>
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            Serving the Greater Vancouver area. Most orders ship in around 4
            weeks.
          </p>
        </div>

        {/* TODO: replace with client jersey photos */}
        <div
          aria-label="Custom sublimated jersey photo placeholder"
          role="img"
          className="relative mx-auto flex aspect-[4/5] w-full max-w-md items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-teal-800 shadow-xl ring-1 ring-teal-900/10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
          <div className="relative z-10 px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Sidestep
            </p>
            <p className="mt-3 font-mono text-5xl font-bold text-white drop-shadow-sm">
              #07
            </p>
            <p className="mt-3 text-sm font-medium text-white/85">
              Your design here
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
