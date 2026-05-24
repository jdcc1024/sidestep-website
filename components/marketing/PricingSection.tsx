import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
      className="border-b border-border bg-background py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Pricing
          </p>
          <h2 className="mt-3 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Transparent pricing by team size.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The bigger your order, the lower the per-jersey cost. Use the
            calculator below for a live estimate.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_TIERS.map((tier) => {
            const highlight = tier.label === POPULAR_TIER_LABEL;
            return (
              <Card
                key={tier.label}
                className={
                  highlight
                    ? "ring-2 ring-teal-600 shadow-lg"
                    : undefined
                }
              >
                <CardContent className="flex flex-col gap-1">
                  {highlight && (
                    <Badge className="mb-3 w-fit bg-teal-50 text-teal-700 hover:bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300">
                      Most popular
                    </Badge>
                  )}
                  <p className="text-sm font-semibold text-muted-foreground">
                    {taglines[tier.label]}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-foreground">
                    {tier.label}
                  </h3>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-foreground">
                      ${tier.pricePerUnit}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      per jersey
                    </span>
                  </div>
                </CardContent>
              </Card>
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
