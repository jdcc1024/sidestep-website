import Link from "next/link";

import { Button } from "@/components/ui/button";

export function QuoteCtaSection() {
  return (
    <section id="quote" className="bg-background py-20 sm:py-24">
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
              <Button
                size="lg"
                className="h-11 bg-white px-5 text-sm text-teal-700 shadow-sm hover:bg-teal-50"
                render={<Link href="/intake">Get a quote</Link>}
              />
              <Button
                variant="outline"
                size="lg"
                className="h-11 border-white/40 bg-transparent px-5 text-sm text-white hover:bg-white/10 hover:text-white"
                render={<a href="mailto:info@sidestep.design">info@sidestep.design</a>}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
