import { describe, expect, it } from "vitest";
import {
  EMPTY_ROSTER_ENTRY,
  ROSTER_NAME_MAX_LENGTH,
  ROSTER_NUMBER_MAX_LENGTH,
  checkRosterName,
  checkRosterNumber,
  isRosterSource,
  rosterMatchKey,
  toRosterEntryPayload,
  validateRosterEntry,
} from "./rosterEntry";

describe("isRosterSource", () => {
  it("accepts the two known sources", () => {
    expect(isRosterSource("captain")).toBe(true);
    expect(isRosterSource("fan")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isRosterSource("admin")).toBe(false);
    expect(isRosterSource("")).toBe(false);
  });
});

describe("checkRosterName", () => {
  it("requires a non-empty name", () => {
    expect(checkRosterName("   ").ok).toBe(false);
  });

  it("trims and returns the name", () => {
    const result = checkRosterName("  Gretzky  ");
    expect(result).toEqual({ ok: true, value: "Gretzky" });
  });

  it("rejects a name over the cap", () => {
    expect(checkRosterName("x".repeat(ROSTER_NAME_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
  });
});

describe("checkRosterNumber", () => {
  it("treats blank/undefined as an omitted (undefined) number", () => {
    expect(checkRosterNumber("")).toEqual({ ok: true, value: undefined });
    expect(checkRosterNumber(undefined)).toEqual({ ok: true, value: undefined });
    expect(checkRosterNumber("  ")).toEqual({ ok: true, value: undefined });
  });

  it("trims and returns a present number", () => {
    expect(checkRosterNumber("  99 ")).toEqual({ ok: true, value: "99" });
  });

  it("rejects a number over the cap", () => {
    expect(checkRosterNumber("9".repeat(ROSTER_NUMBER_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
  });
});

describe("rosterMatchKey", () => {
  it("matches the same slot regardless of case or surrounding space", () => {
    expect(rosterMatchKey("d1", "  Gretzky ", "99")).toBe(
      rosterMatchKey("d1", "gretzky", " 99 "),
    );
  });

  it("treats a missing number the same as an empty one", () => {
    expect(rosterMatchKey("d1", "Bo", undefined)).toBe(
      rosterMatchKey("d1", "Bo", ""),
    );
  });

  it("distinguishes different designs, names, and numbers", () => {
    const base = rosterMatchKey("d1", "Gretzky", "99");
    expect(rosterMatchKey("d2", "Gretzky", "99")).not.toBe(base);
    expect(rosterMatchKey("d1", "Lemieux", "99")).not.toBe(base);
    expect(rosterMatchKey("d1", "Gretzky", "66")).not.toBe(base);
  });
});

describe("validateRosterEntry", () => {
  it("has no errors for a valid entry", () => {
    expect(validateRosterEntry({ name: "Gretzky", number: "99" })).toEqual({});
  });

  it("flags a blank name", () => {
    expect(validateRosterEntry({ ...EMPTY_ROSTER_ENTRY }).name).toBeTruthy();
  });

  it("allows a blank number (number is optional)", () => {
    expect(
      validateRosterEntry({ name: "Bo", number: "" }).number,
    ).toBeUndefined();
  });
});

describe("toRosterEntryPayload", () => {
  it("trims name and normalizes a blank number to undefined", () => {
    expect(toRosterEntryPayload({ name: "  Bo  ", number: "  " })).toEqual({
      name: "Bo",
      number: undefined,
    });
  });

  it("throws on an invalid (empty) name", () => {
    expect(() => toRosterEntryPayload({ name: "", number: "1" })).toThrow();
  });
});
