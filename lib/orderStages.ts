// Stage mapping shared by the customer portal (2-04, 2-07) and the admin
// stage checklist (2-12). Internal stage names are administrative detail and
// must not leak to customers — derivation collapses the 14 internal stages
// onto 8 customer-facing labels.

export const INTERNAL_STAGES = [
  "Inquiry",
  "Planned",
  "Started",
  "Design Ideated",
  "Design Confirmed",
  "Invoice Sent",
  "Order Size Confirmed",
  "Sent to supplier",
  "Invoice Paid",
  "Colour Confirmation",
  "Production",
  "Produced",
  "Shipped",
  "Delivered",
] as const;

export type InternalStageName = (typeof INTERNAL_STAGES)[number];

export const CUSTOMER_STAGES = [
  "Order Started",
  "Design Ideated",
  "Design Confirmed",
  "Order Size Confirmed",
  "Production Started",
  "Full Production",
  "Shipped",
  "Delivered",
] as const;

export type CustomerStageName = (typeof CUSTOMER_STAGES)[number];

// Each customer-facing stage is "reached" when every internal stage listed
// here has a completedAt timestamp. The current customer-facing stage is the
// most advanced reached — admins can complete internal stages out of order
// (per 2-12) and the customer view still surfaces the furthest point.
const CUSTOMER_STAGE_REQUIREMENTS: Record<
  CustomerStageName,
  ReadonlyArray<InternalStageName>
> = {
  "Order Started": ["Inquiry"],
  "Design Ideated": ["Design Ideated"],
  "Design Confirmed": ["Design Ideated", "Design Confirmed"],
  "Order Size Confirmed": ["Order Size Confirmed"],
  "Production Started": ["Sent to supplier"],
  "Full Production": ["Production"],
  Shipped: ["Shipped"],
  Delivered: ["Delivered"],
};

export type InternalStage = {
  name: string;
  // Schema uses optional<number>; an explicit null can also appear if an
  // admin unchecks a stage that the writer modeled with null. Both mean
  // "not completed".
  completedAt?: number | null;
};

export function deriveCustomerStage(
  internalStages: ReadonlyArray<InternalStage>,
): CustomerStageName | null {
  const completed = new Set<string>();
  for (const stage of internalStages) {
    if (stage.completedAt != null) completed.add(stage.name);
  }

  let current: CustomerStageName | null = null;
  for (const customerStage of CUSTOMER_STAGES) {
    const requirements = CUSTOMER_STAGE_REQUIREMENTS[customerStage];
    if (requirements.every((r) => completed.has(r))) {
      current = customerStage;
    }
  }
  return current;
}

export type ChipTone = "pending" | "in-progress" | "complete";

export function chipToneForStage(
  stage: CustomerStageName | null,
): ChipTone {
  if (stage === null) return "pending";
  if (stage === "Delivered") return "complete";
  return "in-progress";
}

export type TimelineStepState = "complete" | "current" | "upcoming";

export type TimelineStep = {
  name: CustomerStageName;
  state: TimelineStepState;
};

// Builds the customer-facing 8-step timeline for the order detail page.
// Stages before the current one are "complete"; the current stage is
// "current"; later stages are "upcoming". Delivered is special-cased to
// render as fully complete so the final state reads as "done" rather than
// "in progress on the last step".
export function buildTimeline(
  current: CustomerStageName | null,
): TimelineStep[] {
  if (current === null) {
    return CUSTOMER_STAGES.map((name) => ({ name, state: "upcoming" }));
  }
  const currentIndex = CUSTOMER_STAGES.indexOf(current);
  return CUSTOMER_STAGES.map((name, idx) => {
    if (current === "Delivered") return { name, state: "complete" };
    if (idx < currentIndex) return { name, state: "complete" };
    if (idx === currentIndex) return { name, state: "current" };
    return { name, state: "upcoming" };
  });
}

// The latest internal stage marked complete, in INTERNAL_STAGES order — used
// by the admin overview column. Unlike deriveCustomerStage this does not
// collapse names; admins see the raw checklist label they're tracking.
// Stages are completed by checklist position, not by timestamp, so an admin
// who back-fills an earlier stage doesn't accidentally pull the column
// backwards.
export function currentInternalStage(
  internalStages: ReadonlyArray<InternalStage>,
): InternalStageName | null {
  const completed = new Set<string>();
  for (const stage of internalStages) {
    if (stage.completedAt != null) completed.add(stage.name);
  }
  let latest: InternalStageName | null = null;
  for (const name of INTERNAL_STAGES) {
    if (completed.has(name)) latest = name;
  }
  return latest;
}
