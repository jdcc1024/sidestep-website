"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { calculateEstimate, DESIGN_FEE } from "@/lib/pricing";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export function PricingCalculator() {
  const [quantityText, setQuantityText] = useState("12");
  const [hasDesignFee, setHasDesignFee] = useState(false);

  const parsed = Number.parseInt(quantityText, 10);
  const estimate = calculateEstimate(parsed, hasDesignFee);

  const quantityId = useId();
  const designFeeId = useId();
  const outputId = useId();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              Estimate your order
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Enter your jersey count to see live pricing.
            </p>
          </div>

          <div>
            <label
              htmlFor={quantityId}
              className="block text-sm font-medium text-zinc-700"
            >
              Number of jerseys
            </label>
            <input
              id={quantityId}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={quantityText}
              onChange={(event) => setQuantityText(event.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-lg font-semibold text-zinc-900 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30"
              aria-describedby={outputId}
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              id={designFeeId}
              type="checkbox"
              checked={hasDesignFee}
              onChange={(event) => setHasDesignFee(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-600"
            />
            <label htmlFor={designFeeId} className="text-sm text-zinc-700">
              <span className="font-medium text-zinc-900">
                Add design help
              </span>
              <span className="block text-zinc-600">
                I don&apos;t have my own design — add a flat{" "}
                {currency.format(DESIGN_FEE)} design fee.
              </span>
            </label>
          </div>
        </div>

        <div
          id={outputId}
          aria-live="polite"
          className="flex flex-col justify-between rounded-xl bg-zinc-50 p-6"
        >
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">Per jersey</dt>
              <dd className="font-semibold text-zinc-900">
                {currency.format(estimate.perUnitPrice)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">
                Jerseys subtotal ({estimate.quantity})
              </dt>
              <dd className="font-semibold text-zinc-900">
                {currency.format(estimate.subtotal)}
              </dd>
            </div>
            {estimate.designFee > 0 && (
              <div className="flex items-center justify-between">
                <dt className="text-zinc-600">Design fee</dt>
                <dd className="font-semibold text-zinc-900">
                  {currency.format(estimate.designFee)}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-zinc-200 pt-3">
              <dt className="text-base font-semibold text-zinc-900">
                Estimated total
              </dt>
              <dd className="text-2xl font-bold tracking-tight text-teal-700">
                {currency.format(estimate.total)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-zinc-500">
            Estimated cost — final quote confirmed by Sidestep.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">
          Ready to lock in your numbers?
        </p>
        <Link
          href="/intake"
          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          Get your official quote
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
