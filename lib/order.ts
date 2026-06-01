// Shared validation for the portal order creation form. The same rules are
// enforced again server-side in convex/orders.ts so a hand-rolled client
// can't bypass them — see the matching constants there.
//
// Silhouette specs (jerseyStyle / neckline / sleeveStyle) moved off the
// order onto the design in O-01 — see lib/design. The order now only owns
// team/order context and the links to spec-carrying designs.

export const TEAM_NAME_MAX_LENGTH = 120;
export const SPORT_MAX_LENGTH = 120;
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 10_000;

// The form keeps quantity as a string so the empty state stays valid; we
// only coerce to a number at validation/payload time.
export type OrderInput = {
  teamName: string;
  sport: string;
  estimatedQuantity: number | string;
  hasOwnDesign: boolean;
  designIds: string[];
};

export type OrderErrors = Partial<Record<keyof OrderInput, string>>;

export type OrderPayload = {
  teamName: string;
  sport: string;
  estimatedQuantity: number;
  hasOwnDesign: boolean;
  designIds: string[];
};

export const EMPTY_ORDER: OrderInput = {
  teamName: "",
  sport: "",
  estimatedQuantity: "",
  hasOwnDesign: false,
  designIds: [],
};

export function validateOrder(input: OrderInput): OrderErrors {
  const errors: OrderErrors = {};

  const teamName = input.teamName.trim();
  if (!teamName) errors.teamName = "Give your team a name.";
  else if (teamName.length > TEAM_NAME_MAX_LENGTH)
    errors.teamName = `Please keep the team name under ${TEAM_NAME_MAX_LENGTH} characters.`;

  const sport = input.sport.trim();
  if (!sport) errors.sport = "What sport or activity is this for?";
  else if (sport.length > SPORT_MAX_LENGTH)
    errors.sport = `Please keep this under ${SPORT_MAX_LENGTH} characters.`;

  const qty =
    typeof input.estimatedQuantity === "number"
      ? input.estimatedQuantity
      : Number.parseInt(String(input.estimatedQuantity).trim(), 10);
  if (!Number.isFinite(qty) || qty < MIN_QUANTITY)
    errors.estimatedQuantity = `Order at least ${MIN_QUANTITY} jersey.`;
  else if (qty > MAX_QUANTITY)
    errors.estimatedQuantity = `That's a lot — please contact us directly for orders over ${MAX_QUANTITY}.`;
  else if (!Number.isInteger(qty))
    errors.estimatedQuantity = "Use a whole number.";

  return errors;
}

// Count the designs that would actually be linked: deduped, blanks dropped —
// the same normalisation toOrderPayload applies. Keeps the progress gate
// honest if the checkbox state ever carries duplicates or empty strings.
export function linkedDesignCount(designIds: string[]): number {
  return new Set(designIds.filter((id) => id.length > 0)).size;
}

// Progress milestones for the New / Edit Order page. "complete" = done,
// "current" = reached and actionable now, "blocked" = can't proceed yet.
//
// The "design" milestone is the gate the PRD calls out: it stays "blocked"
// while no design is linked and clears to "complete" the moment one is — and
// "collect" stays blocked behind it. Zero designs is a nudge here, not a hard
// validation error (the order still saves), so the gate lives in this
// progress view rather than in validateOrder.
export type OrderMilestoneStatus = "complete" | "current" | "blocked";

export type OrderMilestone = {
  id: "details" | "design" | "collect";
  label: string;
  status: OrderMilestoneStatus;
};

export function orderMilestones(input: OrderInput): OrderMilestone[] {
  const errors = validateOrder(input);
  const detailsValid = !errors.teamName && !errors.sport && !errors.estimatedQuantity;
  const designsLinked = linkedDesignCount(input.designIds) >= 1;

  return [
    {
      id: "details",
      label: "Order details",
      status: detailsValid ? "complete" : "current",
    },
    {
      id: "design",
      label: "Design attached",
      status: designsLinked ? "complete" : "blocked",
    },
    {
      id: "collect",
      label: "Ready to collect",
      status: detailsValid && designsLinked ? "current" : "blocked",
    },
  ];
}

// Convert validated form state into the payload shape the Convex mutation
// expects. Throws if the input was never run through validateOrder — the
// caller should always gate this on an empty error object.
export function toOrderPayload(input: OrderInput): OrderPayload {
  const qty =
    typeof input.estimatedQuantity === "number"
      ? input.estimatedQuantity
      : Number.parseInt(String(input.estimatedQuantity).trim(), 10);
  if (!Number.isFinite(qty)) throw new Error("Invalid quantity");

  return {
    teamName: input.teamName.trim(),
    sport: input.sport.trim(),
    estimatedQuantity: qty,
    hasOwnDesign: input.hasOwnDesign,
    // Dedupe and drop blank ids so an inconsistent checkbox state can't
    // pass duplicates through to the server.
    designIds: Array.from(new Set(input.designIds.filter((id) => id.length > 0))),
  };
}
