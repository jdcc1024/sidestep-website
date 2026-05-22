import { describe, expect, it } from "vitest";
import {
  EMPTY_ORDER,
  JERSEY_STYLE_MAX_LENGTH,
  MAX_QUANTITY,
  MIN_QUANTITY,
  NECKLINES,
  SLEEVE_STYLES,
  SPORT_MAX_LENGTH,
  TEAM_NAME_MAX_LENGTH,
  isNeckline,
  isSleeveStyle,
  toOrderPayload,
  validateOrder,
  type OrderInput,
} from "./order";

function validInput(overrides: Partial<OrderInput> = {}): OrderInput {
  return {
    teamName: "Westside FC",
    sport: "Ultimate Frisbee",
    estimatedQuantity: 12,
    jerseyStyle: "Ultimate Frisbee jersey",
    neckline: "Crew Neck",
    sleeveStyle: "Regular",
    hasOwnDesign: false,
    designIds: [],
    ...overrides,
  };
}

describe("validateOrder — happy path", () => {
  it("accepts a fully populated order", () => {
    expect(validateOrder(validInput())).toEqual({});
  });

  it("accepts a quantity supplied as a string (form state)", () => {
    expect(validateOrder(validInput({ estimatedQuantity: "12" }))).toEqual({});
  });

  it("accepts each valid neckline", () => {
    for (const value of NECKLINES) {
      expect(
        validateOrder(validInput({ neckline: value })).neckline,
      ).toBeUndefined();
    }
  });

  it("accepts each valid sleeve style", () => {
    for (const value of SLEEVE_STYLES) {
      expect(
        validateOrder(validInput({ sleeveStyle: value })).sleeveStyle,
      ).toBeUndefined();
    }
  });

  it("accepts zero linked designs (designs are optional)", () => {
    expect(
      validateOrder(validInput({ designIds: [] })).designIds,
    ).toBeUndefined();
  });
});

describe("validateOrder — required fields", () => {
  it("flags every required field when the form is empty", () => {
    const errors = validateOrder(EMPTY_ORDER);
    expect(errors.teamName).toBeTruthy();
    expect(errors.sport).toBeTruthy();
    expect(errors.estimatedQuantity).toBeTruthy();
    expect(errors.jerseyStyle).toBeTruthy();
    expect(errors.neckline).toBeTruthy();
    expect(errors.sleeveStyle).toBeTruthy();
  });

  it("rejects a whitespace-only team name", () => {
    expect(
      validateOrder(validInput({ teamName: "   " })).teamName,
    ).toBeTruthy();
  });

  it("rejects a whitespace-only sport", () => {
    expect(validateOrder(validInput({ sport: "   " })).sport).toBeTruthy();
  });

  it("rejects a whitespace-only jersey style", () => {
    expect(
      validateOrder(validInput({ jerseyStyle: "   " })).jerseyStyle,
    ).toBeTruthy();
  });
});

describe("validateOrder — quantity rules", () => {
  it("rejects quantity below the minimum", () => {
    expect(
      validateOrder(validInput({ estimatedQuantity: 0 })).estimatedQuantity,
    ).toBeTruthy();
  });

  it("accepts the minimum quantity", () => {
    expect(
      validateOrder(validInput({ estimatedQuantity: MIN_QUANTITY }))
        .estimatedQuantity,
    ).toBeUndefined();
  });

  it("rejects a non-integer quantity", () => {
    expect(
      validateOrder(validInput({ estimatedQuantity: 5.5 })).estimatedQuantity,
    ).toBeTruthy();
  });

  it("rejects a quantity above the cap", () => {
    expect(
      validateOrder(validInput({ estimatedQuantity: MAX_QUANTITY + 1 }))
        .estimatedQuantity,
    ).toBeTruthy();
  });

  it("rejects garbled string quantities", () => {
    expect(
      validateOrder(validInput({ estimatedQuantity: "lots" }))
        .estimatedQuantity,
    ).toBeTruthy();
  });

  it("rejects an empty string quantity", () => {
    expect(
      validateOrder(validInput({ estimatedQuantity: "" })).estimatedQuantity,
    ).toBeTruthy();
  });
});

describe("validateOrder — length caps", () => {
  it("rejects a team name over the cap", () => {
    expect(
      validateOrder(
        validInput({ teamName: "x".repeat(TEAM_NAME_MAX_LENGTH + 1) }),
      ).teamName,
    ).toBeTruthy();
  });

  it("accepts a team name at exactly the cap", () => {
    expect(
      validateOrder(
        validInput({ teamName: "x".repeat(TEAM_NAME_MAX_LENGTH) }),
      ).teamName,
    ).toBeUndefined();
  });

  it("rejects a sport over the cap", () => {
    expect(
      validateOrder(validInput({ sport: "x".repeat(SPORT_MAX_LENGTH + 1) }))
        .sport,
    ).toBeTruthy();
  });

  it("rejects a jersey style over the cap", () => {
    expect(
      validateOrder(
        validInput({ jerseyStyle: "x".repeat(JERSEY_STYLE_MAX_LENGTH + 1) }),
      ).jerseyStyle,
    ).toBeTruthy();
  });
});

describe("validateOrder — enum fields", () => {
  it("rejects an unknown neckline", () => {
    expect(
      validateOrder(validInput({ neckline: "Boat Neck" })).neckline,
    ).toBeTruthy();
  });

  it("rejects an empty neckline", () => {
    expect(validateOrder(validInput({ neckline: "" })).neckline).toBeTruthy();
  });

  it("rejects an unknown sleeve style", () => {
    expect(
      validateOrder(validInput({ sleeveStyle: "Sleeveless" })).sleeveStyle,
    ).toBeTruthy();
  });

  it("rejects an empty sleeve style", () => {
    expect(
      validateOrder(validInput({ sleeveStyle: "" })).sleeveStyle,
    ).toBeTruthy();
  });
});

describe("isNeckline / isSleeveStyle", () => {
  it("isNeckline accepts every member of NECKLINES", () => {
    for (const value of NECKLINES) expect(isNeckline(value)).toBe(true);
  });

  it("isNeckline rejects anything else", () => {
    expect(isNeckline("")).toBe(false);
    expect(isNeckline("Boat Neck")).toBe(false);
  });

  it("isSleeveStyle accepts every member of SLEEVE_STYLES", () => {
    for (const value of SLEEVE_STYLES) expect(isSleeveStyle(value)).toBe(true);
  });

  it("isSleeveStyle rejects anything else", () => {
    expect(isSleeveStyle("")).toBe(false);
    expect(isSleeveStyle("Sleeveless")).toBe(false);
  });
});

describe("toOrderPayload", () => {
  it("trims whitespace from every string field", () => {
    const payload = toOrderPayload(
      validInput({
        teamName: "  Westside FC  ",
        sport: "  Ultimate  ",
        jerseyStyle: "  Ultimate jersey  ",
      }),
    );
    expect(payload.teamName).toBe("Westside FC");
    expect(payload.sport).toBe("Ultimate");
    expect(payload.jerseyStyle).toBe("Ultimate jersey");
  });

  it("coerces a string quantity to a number", () => {
    const payload = toOrderPayload(validInput({ estimatedQuantity: "20" }));
    expect(payload.estimatedQuantity).toBe(20);
  });

  it("passes through a numeric quantity unchanged", () => {
    const payload = toOrderPayload(validInput({ estimatedQuantity: 7 }));
    expect(payload.estimatedQuantity).toBe(7);
  });

  it("preserves the hasOwnDesign flag", () => {
    expect(toOrderPayload(validInput({ hasOwnDesign: true })).hasOwnDesign).toBe(
      true,
    );
    expect(toOrderPayload(validInput({ hasOwnDesign: false })).hasOwnDesign).toBe(
      false,
    );
  });

  it("dedupes designIds", () => {
    const payload = toOrderPayload(
      validInput({ designIds: ["a", "b", "a", "c", "b"] }),
    );
    expect(payload.designIds).toEqual(["a", "b", "c"]);
  });

  it("drops blank designIds", () => {
    const payload = toOrderPayload(validInput({ designIds: ["a", "", "b"] }));
    expect(payload.designIds).toEqual(["a", "b"]);
  });

  it("throws for an invalid neckline (caller should have validated)", () => {
    expect(() =>
      toOrderPayload(validInput({ neckline: "Boat Neck" })),
    ).toThrow();
  });

  it("throws for an invalid sleeve style (caller should have validated)", () => {
    expect(() =>
      toOrderPayload(validInput({ sleeveStyle: "Sleeveless" })),
    ).toThrow();
  });
});
