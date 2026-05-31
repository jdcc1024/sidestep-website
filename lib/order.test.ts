import { describe, expect, it } from "vitest";
import {
  EMPTY_ORDER,
  MAX_QUANTITY,
  MIN_QUANTITY,
  SPORT_MAX_LENGTH,
  TEAM_NAME_MAX_LENGTH,
  toOrderPayload,
  validateOrder,
  type OrderInput,
} from "./order";

function validInput(overrides: Partial<OrderInput> = {}): OrderInput {
  return {
    teamName: "Westside FC",
    sport: "Ultimate Frisbee",
    estimatedQuantity: 12,
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
  });

  it("rejects a whitespace-only team name", () => {
    expect(
      validateOrder(validInput({ teamName: "   " })).teamName,
    ).toBeTruthy();
  });

  it("rejects a whitespace-only sport", () => {
    expect(validateOrder(validInput({ sport: "   " })).sport).toBeTruthy();
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
});

describe("toOrderPayload", () => {
  it("trims whitespace from every string field", () => {
    const payload = toOrderPayload(
      validInput({
        teamName: "  Westside FC  ",
        sport: "  Ultimate  ",
      }),
    );
    expect(payload.teamName).toBe("Westside FC");
    expect(payload.sport).toBe("Ultimate");
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
});
