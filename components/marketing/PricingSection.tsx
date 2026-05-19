import Link from "next/link";

type Tier = {
  quantity: string;
  price: string;
  unit: string;
  tagline: string;
  highlight?: boolean;
  note?: string;
};

const tiers: Tier[] = [
  {
    quantity: "5–10 jerseys",
    price: "$55",
    unit: "per jersey",
    tagline: "Small squads",
    note: "Subject to special-order fee.",
  },
  {
    quantity: "10+ jerseys",
    price: "$45",
    unit: "per jersey",
    tagline: "Our most popular tier",
    highlight: true,
  },
  {
    quantity: "50+ jerseys",
    price: "$36",
    unit: "per jersey",
    tagline: "Full clubs & leagues",
  },
];

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
            The bigger your order, the lower the per-jersey cost. Use these as
            a starting point — reach out for a tailored quote.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => {
            const cardClasses = tier.highlight
              ? "ring-2 ring-teal-600 shadow-lg"
              : "border border-zinc-200";
            return (
              <article
                key={tier.quantity}
                className={`flex flex-col rounded-xl bg-white p-6 ${cardClasses}`}
              >
                {tier.highlight && (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-semibold text-zinc-500">
                  {tier.tagline}
                </p>
                <h3 className="mt-1 text-xl font-bold text-zinc-900">
                  {tier.quantity}
                </h3>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-zinc-900">
                    {tier.price}
                  </span>
                  <span className="text-sm text-zinc-500">{tier.unit}</span>
                </div>
                {tier.note && (
                  <p className="mt-3 text-sm text-zinc-500">{tier.note}</p>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-6 text-center">
          <p className="text-sm text-zinc-600">
            Want to plug in your exact order size?{" "}
            <Link
              href="/intake"
              className="font-semibold text-teal-700 underline-offset-4 hover:underline"
            >
              Get a custom quote
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
