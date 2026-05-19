import { PRICING_TIERS } from "@/lib/pricing";
import { PricingCalculator } from "./PricingCalculator";

const POPULAR_TIER_LABEL = "10–25 jerseys";

const taglines: Record<string, string> = {
  "1–9 jerseys": "Small squads",
  "10–25 jerseys": "Our most popular tier",
  "26–50 jerseys": "Full teams",
  "51+ jerseys": "Clubs & leagues",
};

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="border-b border-zinc-200 bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Transparent pricing by team size.
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            The bigger your order, the lower the per-jersey cost. Use the
            calculator below for a live estimate.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_TIERS.map((tier) => {
            const highlight = tier.label === POPULAR_TIER_LABEL;
            const cardClasses = highlight
              ? "ring-2 ring-teal-600 shadow-lg"
              : "border border-zinc-200";
            return (
              <article
                key={tier.label}
                className={`flex flex-col rounded-xl bg-white p-6 ${cardClasses}`}
              >
                {highlight && (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-semibold text-zinc-500">
                  {taglines[tier.label]}
                </p>
                <h3 className="mt-1 text-xl font-bold text-zinc-900">
                  {tier.label}
                </h3>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-zinc-900">
                    ${tier.pricePerUnit}
                  </span>
                  <span className="text-sm text-zinc-500">per jersey</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12">
          <PricingCalculator />
        </div>
      </div>
    </section>
  );
}
