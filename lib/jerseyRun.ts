// Shared validation for the jersey run setup form. The same rules are
// enforced again server-side in convex/jerseyRuns.ts so a hand-rolled
// client can't bypass them — see the matching constants there.

export const SIZE_OPTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
] as const;
export type SizeOption = (typeof SIZE_OPTIONS)[number];

// Sort a list of sizes (from a jersey run) into canonical display order.
// Legacy "XXL" runs created before the XXL → 2XL rename are slotted
// where 2XL would appear so they still render in the right spot.
const SIZE_DISPLAY_INDEX: Record<string, number> = {
  XS: 0,
  S: 1,
  M: 2,
  L: 3,
  XL: 4,
  "2XL": 5,
  XXL: 5,
  "3XL": 6,
  "4XL": 7,
};

export function sortSizes(sizes: readonly string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_DISPLAY_INDEX[a] ?? Number.POSITIVE_INFINITY;
    const ib = SIZE_DISPLAY_INDEX[b] ?? Number.POSITIVE_INFINITY;
    return ia - ib;
  });
}

export const NAMES_MODES = ["open", "fixed"] as const;
export type NamesMode = (typeof NAMES_MODES)[number];

export const MAX_CUSTOM_QUESTIONS = 5;
export const QUESTION_LABEL_MAX_LENGTH = 200;
export const ROSTER_NAME_MAX_LENGTH = 80;
export const ROSTER_NUMBER_MAX_LENGTH = 8;
export const MAX_ROSTER_ENTRIES = 200;

export type RosterEntry = { name: string; number: string };
export type CustomQuestion = { id: string; label: string };

export type JerseyRunInput = {
  sizeOptions: string[];
  namesMode: NamesMode | "";
  fixedRoster: RosterEntry[];
  customQuestions: CustomQuestion[];
  // Kept as a string in form state so the empty state is valid; coerced
  // to a timestamp at payload time.
  deadline: string;
};

export type JerseyRunErrors = {
  sizeOptions?: string;
  namesMode?: string;
  fixedRoster?: string;
  customQuestions?: string;
  deadline?: string;
};

export type JerseyRunPayload = {
  sizeOptions: SizeOption[];
  namesMode: NamesMode;
  fixedRoster: Array<{ name: string; number: string | undefined }>;
  customQuestions: CustomQuestion[];
  deadline: number;
};

export const EMPTY_JERSEY_RUN: JerseyRunInput = {
  sizeOptions: [],
  namesMode: "",
  fixedRoster: [],
  customQuestions: [],
  deadline: "",
};

export function isSizeOption(value: string): value is SizeOption {
  return (SIZE_OPTIONS as readonly string[]).includes(value);
}

export function isNamesMode(value: string): value is NamesMode {
  return (NAMES_MODES as readonly string[]).includes(value);
}

// Parse a date input (YYYY-MM-DD) into a UTC end-of-day timestamp.
// Returns null for empty or invalid input so the caller can decide what
// to do (validation produces a user-facing error; payload throws).
export function parseDeadline(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Date.parse on a bare YYYY-MM-DD treats it as UTC midnight. Push to
  // end of day so a run with deadline = today stays open all day.
  const ms = Date.parse(`${trimmed}T23:59:59.999Z`);
  if (!Number.isFinite(ms)) return null;
  return ms;
}

export function validateJerseyRun(
  input: JerseyRunInput,
  now: number = Date.now(),
): JerseyRunErrors {
  const errors: JerseyRunErrors = {};

  const cleanedSizes = input.sizeOptions.filter(isSizeOption);
  if (cleanedSizes.length === 0)
    errors.sizeOptions = "Pick at least one size.";

  if (!isNamesMode(input.namesMode))
    errors.namesMode = "Choose how names will be collected.";

  if (input.namesMode === "fixed") {
    const namedEntries = input.fixedRoster
      .map((entry) => ({
        name: entry.name.trim(),
        number: entry.number.trim(),
      }))
      .filter((entry) => entry.name.length > 0);
    if (namedEntries.length === 0)
      errors.fixedRoster = "Add at least one name to the roster.";
    else if (input.fixedRoster.length > MAX_ROSTER_ENTRIES)
      errors.fixedRoster = `Rosters are capped at ${MAX_ROSTER_ENTRIES} names.`;
    else if (
      namedEntries.some((entry) => entry.name.length > ROSTER_NAME_MAX_LENGTH)
    )
      errors.fixedRoster = `Keep each name under ${ROSTER_NAME_MAX_LENGTH} characters.`;
    else if (
      namedEntries.some(
        (entry) => entry.number.length > ROSTER_NUMBER_MAX_LENGTH,
      )
    )
      errors.fixedRoster = `Keep each number under ${ROSTER_NUMBER_MAX_LENGTH} characters.`;
  }

  if (input.customQuestions.length > MAX_CUSTOM_QUESTIONS)
    errors.customQuestions = `Up to ${MAX_CUSTOM_QUESTIONS} custom questions.`;
  else if (
    input.customQuestions.some((q) => q.label.trim().length === 0)
  )
    errors.customQuestions = "Every question needs a label.";
  else if (
    input.customQuestions.some(
      (q) => q.label.trim().length > QUESTION_LABEL_MAX_LENGTH,
    )
  )
    errors.customQuestions = `Keep each question under ${QUESTION_LABEL_MAX_LENGTH} characters.`;

  const deadline = parseDeadline(input.deadline);
  if (deadline === null) errors.deadline = "Pick a deadline date.";
  else if (deadline < now) errors.deadline = "Deadline must be in the future.";

  return errors;
}

// Convert validated form state into the payload the Convex mutation
// expects. Throws if the input was never run through validateJerseyRun
// — callers should gate on an empty error object first.
export function toJerseyRunPayload(input: JerseyRunInput): JerseyRunPayload {
  if (!isNamesMode(input.namesMode))
    throw new Error("Invalid namesMode");

  const sizeOptions = input.sizeOptions.filter(isSizeOption);
  if (sizeOptions.length === 0) throw new Error("Invalid sizeOptions");

  const deadline = parseDeadline(input.deadline);
  if (deadline === null) throw new Error("Invalid deadline");

  const fixedRoster =
    input.namesMode === "fixed"
      ? input.fixedRoster
          .map((entry) => ({
            name: entry.name.trim(),
            number: entry.number.trim(),
          }))
          .filter((entry) => entry.name.length > 0)
          .map((entry) => ({
            name: entry.name,
            number: entry.number.length > 0 ? entry.number : undefined,
          }))
      : [];

  const customQuestions = input.customQuestions
    .map((q) => ({ id: q.id, label: q.label.trim() }))
    .filter((q) => q.label.length > 0);

  return {
    sizeOptions,
    namesMode: input.namesMode,
    fixedRoster,
    customQuestions,
    deadline,
  };
}

// Generate a unique id for a new custom question or roster entry. Uses
// crypto.randomUUID where available (modern browsers and Node 19+); falls
// back to a timestamp+random combo in older environments and JSDOM.
export function newQuestionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
