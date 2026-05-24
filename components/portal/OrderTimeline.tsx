"use client";

import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buildTimeline, type CustomerStageName } from "@/lib/orderStages";

type Props = {
  currentStage: CustomerStageName | null;
};

// The customer-facing 8-stage timeline rendered as a vertical list on
// mobile and a horizontal stepper at sm+. Stage data is derived from
// `internalStages` upstream (lib/orderStages) — only customer-facing
// labels reach this component so no internal stage name can leak.
export function OrderTimeline({ currentStage }: Props) {
  const steps = buildTimeline(currentStage);

  return (
    <ol
      aria-label="Order progress"
      className="grid gap-4 sm:grid-cols-8 sm:gap-2"
    >
      {steps.map((step, idx) => {
        const isCurrent = step.state === "current";
        const isComplete = step.state === "complete";
        return (
          <li
            key={step.name}
            aria-current={isCurrent ? "step" : undefined}
            className="flex items-start gap-3 sm:flex-col sm:items-stretch sm:gap-2"
          >
            <div className="flex items-center sm:flex-col sm:items-stretch">
              <StepDot state={step.state} index={idx} />
              {idx < steps.length - 1 && (
                <Separator
                  aria-hidden
                  className={`hidden h-0.5 flex-1 sm:block ${
                    isComplete ? "bg-teal-600" : "bg-zinc-200"
                  }`}
                />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
              <p
                className={`text-sm font-medium ${
                  isCurrent
                    ? "text-teal-700"
                    : isComplete
                      ? "text-zinc-900"
                      : "text-zinc-500"
                }`}
              >
                {step.name}
              </p>
              <Badge
                variant={
                  isCurrent ? "default" : isComplete ? "secondary" : "outline"
                }
                className={`w-fit sm:hidden ${
                  isCurrent ? "bg-teal-600 text-white" : ""
                }`}
              >
                {isCurrent ? "In progress" : isComplete ? "Complete" : "Upcoming"}
              </Badge>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({
  state,
  index,
}: {
  state: "complete" | "current" | "upcoming";
  index: number;
}) {
  const base =
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold";
  if (state === "complete") {
    return (
      <span
        aria-hidden
        className={`${base} border-teal-600 bg-teal-600 text-white`}
      >
        <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span
        aria-hidden
        className={`${base} border-teal-600 bg-white text-teal-700 ring-2 ring-teal-100`}
      >
        {index + 1}
      </span>
    );
  }
  return (
    <span aria-hidden className={`${base} border-zinc-300 bg-white text-zinc-400`}>
      {index + 1}
    </span>
  );
}
