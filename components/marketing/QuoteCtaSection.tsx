import Link from "next/link";

export function QuoteCtaSection() {
  return (
    <section id="quote" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 px-8 py-14 text-center shadow-xl sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.18),transparent_55%)]"
          />
          <div className="relative">
            <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Ready to outfit your team?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-teal-50">
              Tell us a little about your team and the look you&apos;re after.
              We&apos;ll come back with ideas, mock-ups, and a quote.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/intake"
                className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-teal-700 shadow-sm hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
              >
                Get a quote
              </Link>
              <a
                href="mailto:info@sidestep.design"
                className="rounded-md border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
              >
                info@sidestep.design
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
