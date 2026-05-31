import { describe, expect, it } from "vitest";
import {
  BRIEF_MAX_LENGTH,
  CANVA_LINK_MAX_LENGTH,
  EMPTY_DESIGN,
  JERSEY_STYLE_MAX_LENGTH,
  NECKLINES,
  SLEEVE_STYLES,
  TITLE_MAX_LENGTH,
  isHttpUrl,
  isNeckline,
  isSleeveStyle,
  toDesignPayload,
  validateDesign,
  type DesignInput,
} from "./design";

function validInput(overrides: Partial<DesignInput> = {}): DesignInput {
  return {
    title: "Spring season kits",
    brief: "Retro 90s look, cobalt blue with cream accents.",
    canvaLink: "",
    jerseyStyle: "",
    neckline: "",
    sleeveStyle: "",
    ...overrides,
  };
}

describe("validateDesign — happy path", () => {
  it("accepts a fully populated design", () => {
    expect(validateDesign(validInput())).toEqual({});
  });

  it("accepts an empty canva link (optional)", () => {
    expect(validateDesign(validInput({ canvaLink: "" }))).toEqual({});
  });

  it("accepts a valid https canva link", () => {
    expect(
      validateDesign(
        validInput({ canvaLink: "https://www.canva.com/design/abc/edit" }),
      ),
    ).toEqual({});
  });

  it("accepts a design with all silhouette specs set", () => {
    expect(
      validateDesign(
        validInput({
          jerseyStyle: "Soccer jersey",
          neckline: "Crew Neck",
          sleeveStyle: "Raglan",
        }),
      ),
    ).toEqual({});
  });
});

describe("validateDesign — required fields", () => {
  it("flags only title and brief when the form is empty", () => {
    const errors = validateDesign(EMPTY_DESIGN);
    expect(errors.title).toBeTruthy();
    expect(errors.brief).toBeTruthy();
  });

  it("rejects a whitespace-only title", () => {
    expect(validateDesign(validInput({ title: "   " })).title).toBeTruthy();
  });

  it("rejects a whitespace-only brief", () => {
    expect(validateDesign(validInput({ brief: "   " })).brief).toBeTruthy();
  });

  it("does not require files — an idea-only brief is a valid design", () => {
    // Flow spec §Flow 1: files are optional; a brief alone is a valid design.
    expect(validateDesign(validInput())).toEqual({});
  });
});

describe("validateDesign — silhouette specs (optional)", () => {
  it("accepts blank specs (the cut is undecided)", () => {
    const errors = validateDesign(
      validInput({ jerseyStyle: "", neckline: "", sleeveStyle: "" }),
    );
    expect(errors.jerseyStyle).toBeUndefined();
    expect(errors.neckline).toBeUndefined();
    expect(errors.sleeveStyle).toBeUndefined();
  });

  it("rejects a jersey style over the max length", () => {
    expect(
      validateDesign(
        validInput({ jerseyStyle: "x".repeat(JERSEY_STYLE_MAX_LENGTH + 1) }),
      ).jerseyStyle,
    ).toBeTruthy();
  });

  it("accepts a jersey style at exactly the max length", () => {
    expect(
      validateDesign(
        validInput({ jerseyStyle: "x".repeat(JERSEY_STYLE_MAX_LENGTH) }),
      ).jerseyStyle,
    ).toBeUndefined();
  });

  it("rejects a neckline outside the allowlist", () => {
    expect(
      validateDesign(validInput({ neckline: "Boat Neck" })).neckline,
    ).toBeTruthy();
  });

  it("rejects a sleeve style outside the allowlist", () => {
    expect(
      validateDesign(validInput({ sleeveStyle: "Sleeveless" })).sleeveStyle,
    ).toBeTruthy();
  });
});

describe("validateDesign — length caps", () => {
  it("rejects a title over the max length", () => {
    expect(
      validateDesign(validInput({ title: "x".repeat(TITLE_MAX_LENGTH + 1) }))
        .title,
    ).toBeTruthy();
  });

  it("accepts a title at exactly the max length", () => {
    expect(
      validateDesign(validInput({ title: "x".repeat(TITLE_MAX_LENGTH) }))
        .title,
    ).toBeUndefined();
  });

  it("rejects a brief over the max length", () => {
    expect(
      validateDesign(validInput({ brief: "x".repeat(BRIEF_MAX_LENGTH + 1) }))
        .brief,
    ).toBeTruthy();
  });

  it("accepts a brief at exactly the max length", () => {
    expect(
      validateDesign(validInput({ brief: "x".repeat(BRIEF_MAX_LENGTH) }))
        .brief,
    ).toBeUndefined();
  });

  it("rejects a canva link over the max length", () => {
    const tooLong = "https://canva.com/" + "x".repeat(CANVA_LINK_MAX_LENGTH);
    expect(
      validateDesign(validInput({ canvaLink: tooLong })).canvaLink,
    ).toBeTruthy();
  });
});

describe("validateDesign — canva link format", () => {
  it("rejects a link without a scheme", () => {
    expect(
      validateDesign(validInput({ canvaLink: "canva.com/design/abc" }))
        .canvaLink,
    ).toBeTruthy();
  });

  it("rejects a javascript: pseudo-url", () => {
    expect(
      validateDesign(validInput({ canvaLink: "javascript:alert(1)" }))
        .canvaLink,
    ).toBeTruthy();
  });

  it("rejects garbled text", () => {
    expect(
      validateDesign(validInput({ canvaLink: "not a url at all" }))
        .canvaLink,
    ).toBeTruthy();
  });

  it("accepts plain http://", () => {
    expect(
      validateDesign(validInput({ canvaLink: "http://canva.com/design/abc" }))
        .canvaLink,
    ).toBeUndefined();
  });
});

describe("isHttpUrl", () => {
  it.each([
    "https://canva.com/design/abc",
    "http://example.com",
    "https://sub.example.co.uk/path?q=1",
  ])("accepts %s", (value) => {
    expect(isHttpUrl(value)).toBe(true);
  });

  it.each([
    "canva.com",
    "ftp://example.com",
    "javascript:alert(1)",
    "",
    "   ",
    "not a url",
  ])("rejects %s", (value) => {
    expect(isHttpUrl(value)).toBe(false);
  });
});

describe("silhouette spec allowlists", () => {
  it("NECKLINES has the expected members", () => {
    expect(NECKLINES).toEqual(["Crew Neck", "V-Neck"]);
  });

  it("SLEEVE_STYLES has the expected members", () => {
    expect(SLEEVE_STYLES).toEqual(["Regular", "Raglan"]);
  });

  it("caps jersey style at 120 characters", () => {
    expect(JERSEY_STYLE_MAX_LENGTH).toBe(120);
  });

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

describe("toDesignPayload", () => {
  it("trims whitespace from all string fields", () => {
    const payload = toDesignPayload(
      validInput({ title: "  Kits  ", brief: "  brief here  " }),
    );
    expect(payload.title).toBe("Kits");
    expect(payload.brief).toBe("brief here");
  });

  it("omits canvaLink when blank", () => {
    expect(
      toDesignPayload(validInput({ canvaLink: "" })).canvaLink,
    ).toBeUndefined();
  });

  it("omits canvaLink when whitespace only", () => {
    expect(
      toDesignPayload(validInput({ canvaLink: "   " })).canvaLink,
    ).toBeUndefined();
  });

  it("includes canvaLink when present", () => {
    expect(
      toDesignPayload(
        validInput({ canvaLink: "  https://canva.com/design/abc  " }),
      ).canvaLink,
    ).toBe("https://canva.com/design/abc");
  });

  it("omits every silhouette spec when blank", () => {
    const payload = toDesignPayload(validInput());
    expect(payload.jerseyStyle).toBeUndefined();
    expect(payload.neckline).toBeUndefined();
    expect(payload.sleeveStyle).toBeUndefined();
  });

  it("includes and trims jersey style when present", () => {
    expect(
      toDesignPayload(validInput({ jerseyStyle: "  Soccer jersey  " }))
        .jerseyStyle,
    ).toBe("Soccer jersey");
  });

  it("includes neckline and sleeve style when present", () => {
    const payload = toDesignPayload(
      validInput({ neckline: "V-Neck", sleeveStyle: "Raglan" }),
    );
    expect(payload.neckline).toBe("V-Neck");
    expect(payload.sleeveStyle).toBe("Raglan");
  });
});
