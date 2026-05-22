import { describe, expect, it } from "vitest";
import {
  ANSWER_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  EMPTY_RESPONSE,
  JERSEY_NAME_MAX_LENGTH,
  JERSEY_NUMBER_MAX_LENGTH,
  RESPONDENT_NAME_MAX_LENGTH,
  hasBlankNameOrNumber,
  isJerseyRunClosed,
  toResponsePayload,
  validateResponse,
  type JerseyRunForResponse,
  type JerseyRunResponseInput,
} from "./jerseyRunResponse";

const NOW = Date.parse("2026-05-22T12:00:00.000Z");

function openRun(
  overrides: Partial<JerseyRunForResponse> = {},
): JerseyRunForResponse {
  return {
    namesMode: "open",
    sizeOptions: ["S", "M", "L"],
    customQuestions: [],
    fixedRoster: undefined,
    deadline: Date.parse("2026-06-15T23:59:59.999Z"),
    status: "open",
    ...overrides,
  };
}

function fixedRun(
  overrides: Partial<JerseyRunForResponse> = {},
): JerseyRunForResponse {
  return openRun({
    namesMode: "fixed",
    fixedRoster: [
      { name: "Alex", number: "7" },
      { name: "Bo", number: undefined },
      { name: "Casey", number: "23" },
    ],
    ...overrides,
  });
}

function validInput(
  overrides: Partial<JerseyRunResponseInput> = {},
): JerseyRunResponseInput {
  return {
    respondentName: "Sam Fan",
    respondentEmail: "sam@example.com",
    size: "M",
    jerseyName: "Sam",
    jerseyNumber: "12",
    rosterSelection: "",
    customAnswers: {},
    ...overrides,
  };
}

describe("isJerseyRunClosed", () => {
  it("is open when status is open and deadline is in the future", () => {
    expect(isJerseyRunClosed(openRun(), NOW)).toBe(false);
  });

  it("is closed when status is closed", () => {
    expect(isJerseyRunClosed(openRun({ status: "closed" }), NOW)).toBe(true);
  });

  it("is closed when the deadline has passed", () => {
    const past = Date.parse("2026-05-01T23:59:59.999Z");
    expect(isJerseyRunClosed(openRun({ deadline: past }), NOW)).toBe(true);
  });

  it("treats a deadline equal to now as still open (boundary)", () => {
    expect(isJerseyRunClosed(openRun({ deadline: NOW }), NOW)).toBe(false);
  });
});

describe("validateResponse — required fields", () => {
  it("flags every required field when the input is empty", () => {
    const errors = validateResponse(EMPTY_RESPONSE, openRun(), NOW);
    expect(errors.respondentName).toBeTruthy();
    expect(errors.respondentEmail).toBeTruthy();
    expect(errors.size).toBeTruthy();
  });

  it("rejects a whitespace-only name", () => {
    expect(
      validateResponse(validInput({ respondentName: "   " }), openRun(), NOW)
        .respondentName,
    ).toBeTruthy();
  });

  it("rejects an obviously malformed email", () => {
    expect(
      validateResponse(
        validInput({ respondentEmail: "not-an-email" }),
        openRun(),
        NOW,
      ).respondentEmail,
    ).toBeTruthy();
  });

  it("rejects a name over the cap", () => {
    expect(
      validateResponse(
        validInput({ respondentName: "x".repeat(RESPONDENT_NAME_MAX_LENGTH + 1) }),
        openRun(),
        NOW,
      ).respondentName,
    ).toBeTruthy();
  });

  it("rejects an email over the cap", () => {
    expect(
      validateResponse(
        validInput({
          respondentEmail: `${"x".repeat(EMAIL_MAX_LENGTH)}@example.com`,
        }),
        openRun(),
        NOW,
      ).respondentEmail,
    ).toBeTruthy();
  });
});

describe("validateResponse — size", () => {
  it("rejects a size not in the run's options", () => {
    expect(
      validateResponse(validInput({ size: "XXXL" }), openRun(), NOW).size,
    ).toBeTruthy();
  });

  it("accepts a size that is in the run's options", () => {
    expect(
      validateResponse(validInput({ size: "M" }), openRun(), NOW).size,
    ).toBeUndefined();
  });
});

describe("validateResponse — open mode", () => {
  it("does not require jersey name or number (warning happens separately)", () => {
    const errors = validateResponse(
      validInput({ jerseyName: "", jerseyNumber: "" }),
      openRun(),
      NOW,
    );
    expect(errors.jerseyName).toBeUndefined();
    expect(errors.jerseyNumber).toBeUndefined();
  });

  it("rejects a jersey name over the cap", () => {
    expect(
      validateResponse(
        validInput({ jerseyName: "x".repeat(JERSEY_NAME_MAX_LENGTH + 1) }),
        openRun(),
        NOW,
      ).jerseyName,
    ).toBeTruthy();
  });

  it("rejects a jersey number over the cap", () => {
    expect(
      validateResponse(
        validInput({ jerseyNumber: "x".repeat(JERSEY_NUMBER_MAX_LENGTH + 1) }),
        openRun(),
        NOW,
      ).jerseyNumber,
    ).toBeTruthy();
  });
});

describe("validateResponse — fixed mode", () => {
  it("requires a roster selection", () => {
    expect(
      validateResponse(
        validInput({ rosterSelection: "" }),
        fixedRun(),
        NOW,
      ).rosterSelection,
    ).toBeTruthy();
  });

  it("rejects a roster selection outside the roster bounds", () => {
    expect(
      validateResponse(
        validInput({ rosterSelection: "99" }),
        fixedRun(),
        NOW,
      ).rosterSelection,
    ).toBeTruthy();
  });

  it("accepts a valid roster selection", () => {
    expect(
      validateResponse(
        validInput({ rosterSelection: "1" }),
        fixedRun(),
        NOW,
      ).rosterSelection,
    ).toBeUndefined();
  });
});

describe("validateResponse — closed run", () => {
  it("flags a closed run with a single closed error", () => {
    const errors = validateResponse(
      validInput(),
      openRun({ status: "closed" }),
      NOW,
    );
    expect(errors.closed).toBeTruthy();
  });
});

describe("validateResponse — custom answers", () => {
  it("rejects an answer over the cap", () => {
    const run = openRun({ customQuestions: [{ id: "q1", label: "Why?" }] });
    expect(
      validateResponse(
        validInput({
          customAnswers: { q1: "x".repeat(ANSWER_MAX_LENGTH + 1) },
        }),
        run,
        NOW,
      ).customAnswers,
    ).toBeTruthy();
  });

  it("ignores answers to unknown question ids", () => {
    const run = openRun({ customQuestions: [{ id: "q1", label: "Why?" }] });
    expect(
      validateResponse(
        validInput({ customAnswers: { q1: "Because", ghost: "huge".repeat(9999) } }),
        run,
        NOW,
      ).customAnswers,
    ).toBeUndefined();
  });
});

describe("hasBlankNameOrNumber", () => {
  it("returns true when name is blank in open mode", () => {
    expect(
      hasBlankNameOrNumber(validInput({ jerseyName: "  " }), openRun()),
    ).toBe(true);
  });

  it("returns true when number is blank in open mode", () => {
    expect(
      hasBlankNameOrNumber(validInput({ jerseyNumber: "" }), openRun()),
    ).toBe(true);
  });

  it("returns false when both are filled in open mode", () => {
    expect(hasBlankNameOrNumber(validInput(), openRun())).toBe(false);
  });

  it("returns true when the picked roster entry has no number", () => {
    // Index 1 = Bo, number undefined.
    expect(
      hasBlankNameOrNumber(
        validInput({ rosterSelection: "1" }),
        fixedRun(),
      ),
    ).toBe(true);
  });

  it("returns false when the picked roster entry has both name and number", () => {
    expect(
      hasBlankNameOrNumber(
        validInput({ rosterSelection: "0" }),
        fixedRun(),
      ),
    ).toBe(false);
  });
});

describe("toResponsePayload — open mode", () => {
  it("trims and passes through name/number/email/size", () => {
    const payload = toResponsePayload(
      validInput({
        respondentName: "  Sam Fan  ",
        respondentEmail: "  SAM@example.com  ",
        size: "M",
        jerseyName: "  Sam  ",
        jerseyNumber: "  12  ",
      }),
      openRun(),
    );
    expect(payload.respondentName).toBe("Sam Fan");
    expect(payload.respondentEmail).toBe("sam@example.com");
    expect(payload.size).toBe("M");
    expect(payload.jerseyName).toBe("Sam");
    expect(payload.jerseyNumber).toBe("12");
  });

  it("returns undefined for jersey name/number when blank", () => {
    const payload = toResponsePayload(
      validInput({ jerseyName: "", jerseyNumber: "" }),
      openRun(),
    );
    expect(payload.jerseyName).toBeUndefined();
    expect(payload.jerseyNumber).toBeUndefined();
  });

  it("includes only answers for known question ids", () => {
    const run = openRun({
      customQuestions: [
        { id: "q1", label: "Why?" },
        { id: "q2", label: "When?" },
      ],
    });
    const payload = toResponsePayload(
      validInput({
        customAnswers: { q1: "  because  ", q2: "", ghost: "ignored" },
      }),
      run,
    );
    expect(payload.customAnswers).toEqual({ q1: "because", q2: "" });
  });
});

describe("toResponsePayload — fixed mode", () => {
  it("fills name and number from the selected roster entry", () => {
    const payload = toResponsePayload(
      validInput({ rosterSelection: "2" }),
      fixedRun(),
    );
    expect(payload.jerseyName).toBe("Casey");
    expect(payload.jerseyNumber).toBe("23");
  });

  it("leaves number undefined when the entry has no number", () => {
    const payload = toResponsePayload(
      validInput({ rosterSelection: "1" }),
      fixedRun(),
    );
    expect(payload.jerseyName).toBe("Bo");
    expect(payload.jerseyNumber).toBeUndefined();
  });

  it("throws when the roster selection is out of range (caller should validate)", () => {
    expect(() =>
      toResponsePayload(validInput({ rosterSelection: "99" }), fixedRun()),
    ).toThrow();
  });
});
