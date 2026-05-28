// Form adapter for the public jersey-run submission page. Wraps the
// atomic rules in ./rules into a JerseyRunResponseErrors record keyed
// by form field, plus payload + warning helpers. The Convex side
// imports the same rules directly — see convex/jerseyRuns.ts.

import {
  checkCustomAnswer,
  checkJerseyName,
  checkJerseyNumber,
  checkRespondentEmail,
  checkRespondentName,
  checkSize,
  isJerseyRunClosed,
  type JerseyRunForResponse,
} from "./rules";

export type JerseyRunResponseInput = {
  respondentName: string;
  respondentEmail: string;
  size: string;
  jerseyName: string;
  jerseyNumber: string;
  // Stringified index into the run's fixedRoster; empty string when
  // unset. Kept as a string because <select> values are strings.
  rosterSelection: string;
  customAnswers: Record<string, string>;
};

export type JerseyRunResponseErrors = {
  respondentName?: string;
  respondentEmail?: string;
  size?: string;
  jerseyName?: string;
  jerseyNumber?: string;
  rosterSelection?: string;
  customAnswers?: string;
  // Set when the run is no longer accepting submissions — the form
  // collapses to a "this run is closed" message rather than showing
  // per-field errors.
  closed?: string;
};

export type JerseyRunResponsePayload = {
  respondentName: string;
  respondentEmail: string;
  size: string;
  jerseyName: string | undefined;
  jerseyNumber: string | undefined;
  customAnswers: Record<string, string>;
};

export const EMPTY_RESPONSE: JerseyRunResponseInput = {
  respondentName: "",
  respondentEmail: "",
  size: "",
  jerseyName: "",
  jerseyNumber: "",
  rosterSelection: "",
  customAnswers: {},
};

export function validateResponse(
  input: JerseyRunResponseInput,
  run: JerseyRunForResponse,
  now: number = Date.now(),
): JerseyRunResponseErrors {
  if (isJerseyRunClosed(run, now)) {
    return { closed: "This jersey run is closed." };
  }

  const errors: JerseyRunResponseErrors = {};

  const nameCheck = checkRespondentName(input.respondentName);
  if (!nameCheck.ok) errors.respondentName = nameCheck.error;

  const emailCheck = checkRespondentEmail(input.respondentEmail);
  if (!emailCheck.ok) errors.respondentEmail = emailCheck.error;

  const sizeCheck = checkSize(input.size, run.sizeOptions);
  if (!sizeCheck.ok) errors.size = sizeCheck.error;

  if (run.namesMode === "open") {
    const jerseyNameCheck = checkJerseyName(input.jerseyName);
    if (!jerseyNameCheck.ok) errors.jerseyName = jerseyNameCheck.error;
    const jerseyNumberCheck = checkJerseyNumber(input.jerseyNumber);
    if (!jerseyNumberCheck.ok) errors.jerseyNumber = jerseyNumberCheck.error;
  } else {
    const roster = run.fixedRoster ?? [];
    if (input.rosterSelection.length === 0)
      errors.rosterSelection = "Pick your name from the list.";
    else {
      const idx = Number.parseInt(input.rosterSelection, 10);
      if (!Number.isInteger(idx) || idx < 0 || idx >= roster.length)
        errors.rosterSelection = "Pick your name from the list.";
    }
  }

  // Only inspect answers tied to known question ids — extras are
  // ignored (they could come from a stale form snapshot if the captain
  // edited questions after sharing the link).
  const knownIds = new Set(run.customQuestions.map((q) => q.id));
  for (const id of knownIds) {
    const value = input.customAnswers[id] ?? "";
    const result = checkCustomAnswer(value);
    if (!result.ok) {
      errors.customAnswers = result.error;
      break;
    }
  }

  return errors;
}

// True when either the jersey name or number would be blank on the
// resulting jersey. Drives the confirmation modal — submitting without
// a name or number is allowed, but worth a second look.
export function hasBlankNameOrNumber(
  input: JerseyRunResponseInput,
  run: JerseyRunForResponse,
): boolean {
  if (run.namesMode === "open") {
    return (
      input.jerseyName.trim().length === 0 ||
      input.jerseyNumber.trim().length === 0
    );
  }
  const idx = Number.parseInt(input.rosterSelection, 10);
  const roster = run.fixedRoster ?? [];
  const entry = Number.isInteger(idx) ? roster[idx] : undefined;
  if (!entry) return true;
  const number = (entry.number ?? "").trim();
  return entry.name.trim().length === 0 || number.length === 0;
}

export function toResponsePayload(
  input: JerseyRunResponseInput,
  run: JerseyRunForResponse,
): JerseyRunResponsePayload {
  const respondentName = input.respondentName.trim();
  const respondentEmail = input.respondentEmail.trim().toLowerCase();
  const size = input.size;

  let jerseyName: string | undefined;
  let jerseyNumber: string | undefined;
  if (run.namesMode === "open") {
    const n = input.jerseyName.trim();
    const num = input.jerseyNumber.trim();
    jerseyName = n.length > 0 ? n : undefined;
    jerseyNumber = num.length > 0 ? num : undefined;
  } else {
    const roster = run.fixedRoster ?? [];
    const idx = Number.parseInt(input.rosterSelection, 10);
    if (!Number.isInteger(idx) || idx < 0 || idx >= roster.length)
      throw new Error("Invalid roster selection");
    const entry = roster[idx];
    const n = entry.name.trim();
    const num = (entry.number ?? "").trim();
    jerseyName = n.length > 0 ? n : undefined;
    jerseyNumber = num.length > 0 ? num : undefined;
  }

  const customAnswers: Record<string, string> = {};
  for (const q of run.customQuestions) {
    const raw = input.customAnswers[q.id];
    customAnswers[q.id] = typeof raw === "string" ? raw.trim() : "";
  }

  return {
    respondentName,
    respondentEmail,
    size,
    jerseyName,
    jerseyNumber,
    customAnswers,
  };
}
