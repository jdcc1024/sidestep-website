// Shared validation for the public jersey-run submission form.
// Mirrored by guards in convex/jerseyRuns.ts:submitResponse so a
// hand-rolled client cannot bypass these rules.

export const RESPONDENT_NAME_MAX_LENGTH = 120;
export const EMAIL_MAX_LENGTH = 254;
export const JERSEY_NAME_MAX_LENGTH = 40;
export const JERSEY_NUMBER_MAX_LENGTH = 8;
export const ANSWER_MAX_LENGTH = 500;

export type JerseyRunForResponse = {
  namesMode: "open" | "fixed";
  sizeOptions: string[];
  customQuestions: { id: string; label: string }[];
  fixedRoster: { name: string; number?: string }[] | undefined;
  deadline: number;
  status: "open" | "closed";
};

export type JerseyRunResponseInput = {
  respondentName: string;
  respondentEmail: string;
  size: string;
  jerseyName: string;
  jerseyNumber: string;
  // Stringified index into the run's fixedRoster; empty string when unset.
  // Kept as a string because <select> values are strings.
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

export function isJerseyRunClosed(
  run: Pick<JerseyRunForResponse, "status" | "deadline">,
  now: number = Date.now(),
): boolean {
  if (run.status === "closed") return true;
  return run.deadline < now;
}

// Deliberately loose — the email regex catches typos like missing "@" or
// the local-part being empty. Strict RFC compliance is a job for the
// mail server, not the form. The captain reads these by hand anyway.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateResponse(
  input: JerseyRunResponseInput,
  run: JerseyRunForResponse,
  now: number = Date.now(),
): JerseyRunResponseErrors {
  if (isJerseyRunClosed(run, now)) {
    return { closed: "This jersey run is closed." };
  }

  const errors: JerseyRunResponseErrors = {};

  const name = input.respondentName.trim();
  if (name.length === 0) errors.respondentName = "Tell us your name.";
  else if (name.length > RESPONDENT_NAME_MAX_LENGTH)
    errors.respondentName = `Keep your name under ${RESPONDENT_NAME_MAX_LENGTH} characters.`;

  const email = input.respondentEmail.trim();
  if (email.length === 0)
    errors.respondentEmail = "We need an email so your captain can reach you.";
  else if (email.length > EMAIL_MAX_LENGTH)
    errors.respondentEmail = "That email is too long.";
  else if (!EMAIL_PATTERN.test(email))
    errors.respondentEmail = "That doesn't look like an email.";

  if (input.size.length === 0) errors.size = "Pick a size.";
  else if (!run.sizeOptions.includes(input.size))
    errors.size = "Pick a size from the list.";

  if (run.namesMode === "open") {
    if (input.jerseyName.length > JERSEY_NAME_MAX_LENGTH)
      errors.jerseyName = `Keep the jersey name under ${JERSEY_NAME_MAX_LENGTH} characters.`;
    if (input.jerseyNumber.length > JERSEY_NUMBER_MAX_LENGTH)
      errors.jerseyNumber = `Keep the jersey number under ${JERSEY_NUMBER_MAX_LENGTH} characters.`;
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

  // Only inspect answers tied to known question ids — extras are ignored
  // (they could come from a stale form snapshot if the captain edited
  // questions after sharing the link).
  const knownIds = new Set(run.customQuestions.map((q) => q.id));
  for (const id of knownIds) {
    const value = input.customAnswers[id] ?? "";
    if (value.length > ANSWER_MAX_LENGTH) {
      errors.customAnswers = `Keep each answer under ${ANSWER_MAX_LENGTH} characters.`;
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
