import { describe, expect, it } from "vitest";
import {
  EMPTY_ORDER_ENTRY,
  MAX_QTY,
  SUBMITTER_NAME_MAX_LENGTH,
  checkQty,
  checkSize,
  checkSubmitterEmail,
  checkSubmitterName,
  isOrderSource,
  toOrderEntryPayload,
  toSubmitterPayload,
  validateOrderEntry,
  validateSubmitter,
} from "./orderEntry";

const SIZES = ["S", "M", "L"];

describe("isOrderSource", () => {
  it("accepts captain and fan, rejects others", () => {
    expect(isOrderSource("captain")).toBe(true);
    expect(isOrderSource("fan")).toBe(true);
    expect(isOrderSource("robot")).toBe(false);
  });
});

describe("checkQty", () => {
  it("accepts a whole number in range", () => {
    expect(checkQty(3)).toEqual({ ok: true, value: 3 });
  });

  it("rejects zero and negatives", () => {
    expect(checkQty(0).ok).toBe(false);
    expect(checkQty(-1).ok).toBe(false);
  });

  it("rejects a fractional quantity", () => {
    expect(checkQty(1.5).ok).toBe(false);
  });

  it("rejects NaN", () => {
    expect(checkQty(Number.NaN).ok).toBe(false);
  });

  it("rejects a quantity over the cap", () => {
    expect(checkQty(MAX_QTY + 1).ok).toBe(false);
  });
});

describe("checkSize", () => {
  it("rejects an empty size", () => {
    expect(checkSize("", SIZES).ok).toBe(false);
  });

  it("rejects a size outside the run's options", () => {
    expect(checkSize("XXXL", SIZES).ok).toBe(false);
  });

  it("accepts a size in the options", () => {
    expect(checkSize("M", SIZES)).toEqual({ ok: true, value: "M" });
  });
});

describe("checkSubmitterName", () => {
  it("requires a non-empty name and trims it", () => {
    expect(checkSubmitterName("   ").ok).toBe(false);
    expect(checkSubmitterName("  Sam ")).toEqual({ ok: true, value: "Sam" });
  });

  it("rejects a name over the cap", () => {
    expect(
      checkSubmitterName("x".repeat(SUBMITTER_NAME_MAX_LENGTH + 1)).ok,
    ).toBe(false);
  });
});

describe("checkSubmitterEmail", () => {
  it("lowercases and trims so entries group by email", () => {
    expect(checkSubmitterEmail("  SAM@Example.com ")).toEqual({
      ok: true,
      value: "sam@example.com",
    });
  });

  it("rejects a malformed email", () => {
    expect(checkSubmitterEmail("nope").ok).toBe(false);
  });

  it("rejects an empty email", () => {
    expect(checkSubmitterEmail("").ok).toBe(false);
  });
});

describe("validateOrderEntry", () => {
  it("has no errors for a valid line", () => {
    expect(validateOrderEntry({ size: "M", qty: "2" }, SIZES)).toEqual({});
  });

  it("flags an empty line (default qty is valid, size is not)", () => {
    const errors = validateOrderEntry({ ...EMPTY_ORDER_ENTRY }, SIZES);
    expect(errors.size).toBeTruthy();
    expect(errors.qty).toBeUndefined();
  });

  it("flags a non-numeric qty", () => {
    expect(validateOrderEntry({ size: "M", qty: "lots" }, SIZES).qty).toBeTruthy();
  });

  it("flags a blank qty", () => {
    expect(validateOrderEntry({ size: "M", qty: "" }, SIZES).qty).toBeTruthy();
  });
});

describe("validateSubmitter", () => {
  it("has no errors for a valid submitter", () => {
    expect(
      validateSubmitter({
        submitterName: "Sam",
        submitterEmail: "sam@example.com",
      }),
    ).toEqual({});
  });

  it("flags both fields when empty", () => {
    const errors = validateSubmitter({
      submitterName: "",
      submitterEmail: "",
    });
    expect(errors.submitterName).toBeTruthy();
    expect(errors.submitterEmail).toBeTruthy();
  });
});

describe("toOrderEntryPayload", () => {
  it("parses qty to a number and passes size through", () => {
    expect(toOrderEntryPayload({ size: "L", qty: " 4 " }, SIZES)).toEqual({
      size: "L",
      qty: 4,
    });
  });

  it("throws on an invalid line", () => {
    expect(() => toOrderEntryPayload({ size: "ZZ", qty: "1" }, SIZES)).toThrow();
  });
});

describe("toSubmitterPayload", () => {
  it("trims the name and lowercases the email", () => {
    expect(
      toSubmitterPayload({
        submitterName: "  Sam Fan ",
        submitterEmail: " SAM@Example.com ",
      }),
    ).toEqual({ submitterName: "Sam Fan", submitterEmail: "sam@example.com" });
  });

  it("throws on an invalid submitter", () => {
    expect(() =>
      toSubmitterPayload({ submitterName: "", submitterEmail: "x" }),
    ).toThrow();
  });
});
