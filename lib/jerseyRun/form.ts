// Form adapter for the jersey-run setup page. Wraps the atomic rules in
// ./rules into a JerseyRunErrors record keyed by form field, plus a
// toJerseyRunPayload helper that converts validated input into the
// shape the Convex mutation accepts. The Convex side imports the same
// rules directly — see convex/jerseyRuns.ts.

import {
  MAX_CUSTOM_QUESTIONS,
  MAX_ROSTER_ENTRIES,
  QUESTION_LABEL_MAX_LENGTH,
  ROSTER_NAME_MAX_LENGTH,
  ROSTER_NUMBER_MAX_LENGTH,
  type CustomQuestion,
  type NamesMode,
  type RosterEntry,
  type SizeOption,
  isNamesMode,
  isSizeOption,
  parseDeadline,
} from "./rules";

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
