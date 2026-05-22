// Shared validation for the portal order creation form. The same rules are
// enforced again server-side in convex/orders.ts so a hand-rolled client
// can't bypass them — see the matching constants there.

export const NECKLINES = ["Crew Neck", "V-Neck"] as const;
export type Neckline = (typeof NECKLINES)[number];

export const SLEEVE_STYLES = ["Regular", "Raglan"] as const;
export type SleeveStyle = (typeof SLEEVE_STYLES)[number];

export const TEAM_NAME_MAX_LENGTH = 120;
export const SPORT_MAX_LENGTH = 120;
export const JERSEY_STYLE_MAX_LENGTH = 120;
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 10_000;

// The form keeps quantity as a string so the empty state stays valid; we
// only coerce to a number at validation/payload time.
export type OrderInput = {
  teamName: string;
  sport: string;
  estimatedQuantity: number | string;
  jerseyStyle: string;
  neckline: string;
  sleeveStyle: string;
  hasOwnDesign: boolean;
  designIds: string[];
};

export type OrderErrors = Partial<Record<keyof OrderInput, string>>;

export type OrderPayload = {
  teamName: string;
  sport: string;
  estimatedQuantity: number;
  jerseyStyle: string;
  neckline: Neckline;
  sleeveStyle: SleeveStyle;
  hasOwnDesign: boolean;
  designIds: string[];
};

export const EMPTY_ORDER: OrderInput = {
  teamName: "",
  sport: "",
  estimatedQuantity: "",
  jerseyStyle: "",
  neckline: "",
  sleeveStyle: "",
  hasOwnDesign: false,
  designIds: [],
};

export function isNeckline(value: string): value is Neckline {
  return (NECKLINES as readonly string[]).includes(value);
}

export function isSleeveStyle(value: string): value is SleeveStyle {
  return (SLEEVE_STYLES as readonly string[]).includes(value);
}

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

  const jerseyStyle = input.jerseyStyle.trim();
  if (!jerseyStyle) errors.jerseyStyle = "Tell us the jersey style.";
  else if (jerseyStyle.length > JERSEY_STYLE_MAX_LENGTH)
    errors.jerseyStyle = `Please keep this under ${JERSEY_STYLE_MAX_LENGTH} characters.`;

  if (!isNeckline(input.neckline))
    errors.neckline = "Pick a neckline.";

  if (!isSleeveStyle(input.sleeveStyle))
    errors.sleeveStyle = "Pick a sleeve style.";

  return errors;
}

// Convert validated form state into the payload shape the Convex mutation
// expects. Throws if the input was never run through validateOrder — the
// caller should always gate this on an empty error object.
export function toOrderPayload(input: OrderInput): OrderPayload {
  if (!isNeckline(input.neckline))
    throw new Error("Invalid neckline");
  if (!isSleeveStyle(input.sleeveStyle))
    throw new Error("Invalid sleeve style");

  const qty =
    typeof input.estimatedQuantity === "number"
      ? input.estimatedQuantity
      : Number.parseInt(String(input.estimatedQuantity).trim(), 10);
  if (!Number.isFinite(qty)) throw new Error("Invalid quantity");

  return {
    teamName: input.teamName.trim(),
    sport: input.sport.trim(),
    estimatedQuantity: qty,
    jerseyStyle: input.jerseyStyle.trim(),
    neckline: input.neckline,
    sleeveStyle: input.sleeveStyle,
    hasOwnDesign: input.hasOwnDesign,
    // Dedupe and drop blank ids so an inconsistent checkbox state can't
    // pass duplicates through to the server.
    designIds: Array.from(new Set(input.designIds.filter((id) => id.length > 0))),
  };
}
