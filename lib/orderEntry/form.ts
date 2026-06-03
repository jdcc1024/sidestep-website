// Form adapter for a single order-entry line plus its submitter (R-01
// foundation; the multi-line fan form lands in R-02, composing these
// per line). Wraps the atomic rules into field-keyed error records and a
// payload shaper. The Convex `orderEntries` mutations import the same
// rules directly so client and server can't drift.

import {
  checkQty,
  checkSize,
  checkSubmitterEmail,
  checkSubmitterName,
} from "./rules";

// One jersey line. `qty` is a string because it comes from a number
// <input>; the adapter parses it before checking. Name/number for a
// matching roster slot are validated separately in lib/rosterEntry — a
// line with no name is a legitimate blank/bulk jersey.
export type OrderEntryInput = {
  size: string;
  qty: string;
};

// Shared across all of one submission's lines, so it lives apart from
// the per-line input.
export type SubmitterInput = {
  submitterName: string;
  submitterEmail: string;
};

export type OrderEntryErrors = {
  size?: string;
  qty?: string;
};

export type SubmitterErrors = {
  submitterName?: string;
  submitterEmail?: string;
};

export type OrderEntryPayload = {
  size: string;
  qty: number;
};

export type SubmitterPayload = {
  submitterName: string;
  submitterEmail: string;
};

export const EMPTY_ORDER_ENTRY: OrderEntryInput = {
  size: "",
  qty: "1",
};

// Parses the qty string to an integer for checkQty. NaN flows through as
// a non-integer so checkQty produces the "whole number" error rather
// than this adapter inventing its own message.
function parseQty(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return Number.NaN;
  return Number(trimmed);
}

export function validateOrderEntry(
  input: OrderEntryInput,
  sizeOptions: readonly string[],
): OrderEntryErrors {
  const errors: OrderEntryErrors = {};

  const sizeCheck = checkSize(input.size, sizeOptions);
  if (!sizeCheck.ok) errors.size = sizeCheck.error;

  const qtyCheck = checkQty(parseQty(input.qty));
  if (!qtyCheck.ok) errors.qty = qtyCheck.error;

  return errors;
}

export function validateSubmitter(input: SubmitterInput): SubmitterErrors {
  const errors: SubmitterErrors = {};

  const nameCheck = checkSubmitterName(input.submitterName);
  if (!nameCheck.ok) errors.submitterName = nameCheck.error;

  const emailCheck = checkSubmitterEmail(input.submitterEmail);
  if (!emailCheck.ok) errors.submitterEmail = emailCheck.error;

  return errors;
}

// Throws on invalid input so a caller that skipped validation fails loud
// rather than writing a bad row — same convention as the legacy response
// payload shaper.
export function toOrderEntryPayload(
  input: OrderEntryInput,
  sizeOptions: readonly string[],
): OrderEntryPayload {
  const sizeCheck = checkSize(input.size, sizeOptions);
  if (!sizeCheck.ok) throw new Error(sizeCheck.error);
  const qtyCheck = checkQty(parseQty(input.qty));
  if (!qtyCheck.ok) throw new Error(qtyCheck.error);
  return { size: sizeCheck.value, qty: qtyCheck.value };
}

export function toSubmitterPayload(input: SubmitterInput): SubmitterPayload {
  const nameCheck = checkSubmitterName(input.submitterName);
  if (!nameCheck.ok) throw new Error(nameCheck.error);
  const emailCheck = checkSubmitterEmail(input.submitterEmail);
  if (!emailCheck.ok) throw new Error(emailCheck.error);
  return {
    submitterName: nameCheck.value,
    submitterEmail: emailCheck.value,
  };
}
