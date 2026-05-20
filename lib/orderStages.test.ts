import { describe, expect, it } from "vitest";
import {
  CUSTOMER_STAGES,
  INTERNAL_STAGES,
  chipToneForStage,
  currentInternalStage,
  deriveCustomerStage,
  type InternalStage,
} from "./orderStages";

function staged(names: string[]): InternalStage[] {
  // Each internal stage marked with a real timestamp; order in the array
  // shouldn't matter to derivation.
  return INTERNAL_STAGES.map((name) => ({
    name,
    completedAt: names.includes(name) ? 1_700_000_000_000 : undefined,
  }));
}

describe("INTERNAL_STAGES", () => {
  it("contains the 14 internal stage names in the expected order", () => {
    expect(INTERNAL_STAGES).toEqual([
      "Inquiry",
      "Planned",
      "Started",
      "Design Ideated",
      "Design Confirmed",
      "Invoice Sent",
      "Order Size Confirmed",
      "Sent to supplier",
      "Invoice Paid",
      "Colour Confirmation",
      "Production",
      "Produced",
      "Shipped",
      "Delivered",
    ]);
  });
});

describe("CUSTOMER_STAGES", () => {
  it("contains the 8 customer-facing stages in display order", () => {
    expect(CUSTOMER_STAGES).toEqual([
      "Order Started",
      "Design Ideated",
      "Design Confirmed",
      "Order Size Confirmed",
      "Production Started",
      "Full Production",
      "Shipped",
      "Delivered",
    ]);
  });

  it("does not leak internal stage names that aren't also customer-facing", () => {
    const internalOnly = [
      "Inquiry",
      "Planned",
      "Started",
      "Invoice Sent",
      "Sent to supplier",
      "Invoice Paid",
      "Colour Confirmation",
      "Production",
      "Produced",
    ];
    for (const name of internalOnly) {
      expect(CUSTOMER_STAGES).not.toContain(name);
    }
  });
});

describe("deriveCustomerStage", () => {
  it("returns null when no internal stages are completed", () => {
    expect(deriveCustomerStage(staged([]))).toBeNull();
  });

  it("returns null when the array is empty (defensive)", () => {
    expect(deriveCustomerStage([])).toBeNull();
  });

  it("returns Order Started once Inquiry is completed", () => {
    expect(deriveCustomerStage(staged(["Inquiry"]))).toBe("Order Started");
  });

  it("returns Design Ideated when Inquiry and Design Ideated are completed", () => {
    expect(
      deriveCustomerStage(staged(["Inquiry", "Design Ideated"])),
    ).toBe("Design Ideated");
  });

  it("requires BOTH Design Ideated AND Design Confirmed for Design Confirmed", () => {
    // Per PRD example: Design Confirmed is shown only when both internal
    // Design Ideated and Design Confirmed have been completed.
    expect(
      deriveCustomerStage(staged(["Inquiry", "Design Confirmed"])),
    ).toBe("Order Started");

    expect(
      deriveCustomerStage(
        staged(["Inquiry", "Design Ideated", "Design Confirmed"]),
      ),
    ).toBe("Design Confirmed");
  });

  it("returns Order Size Confirmed when that internal stage is checked", () => {
    expect(
      deriveCustomerStage(
        staged([
          "Inquiry",
          "Design Ideated",
          "Design Confirmed",
          "Order Size Confirmed",
        ]),
      ),
    ).toBe("Order Size Confirmed");
  });

  it("returns Production Started when Sent to supplier is checked", () => {
    expect(
      deriveCustomerStage(
        staged([
          "Inquiry",
          "Design Ideated",
          "Design Confirmed",
          "Order Size Confirmed",
          "Sent to supplier",
        ]),
      ),
    ).toBe("Production Started");
  });

  it("returns Full Production when internal Production is checked", () => {
    expect(
      deriveCustomerStage(
        staged([
          "Inquiry",
          "Design Ideated",
          "Design Confirmed",
          "Order Size Confirmed",
          "Sent to supplier",
          "Production",
        ]),
      ),
    ).toBe("Full Production");
  });

  it("returns Shipped when Shipped is checked", () => {
    expect(
      deriveCustomerStage(
        staged([
          "Inquiry",
          "Design Ideated",
          "Design Confirmed",
          "Order Size Confirmed",
          "Sent to supplier",
          "Production",
          "Shipped",
        ]),
      ),
    ).toBe("Shipped");
  });

  it("returns Delivered once everything is checked", () => {
    expect(deriveCustomerStage(staged([...INTERNAL_STAGES]))).toBe("Delivered");
  });

  it("returns the most advanced stage when stages are completed out of order", () => {
    // Customer support might check Delivered before earlier stages.
    // Customer-facing should still reflect the highest reached, not be
    // gated by missing earlier prerequisites.
    expect(
      deriveCustomerStage(
        staged([
          "Inquiry",
          "Design Ideated",
          "Design Confirmed",
          "Delivered",
        ]),
      ),
    ).toBe("Delivered");
  });

  it("treats a completedAt of null as not completed", () => {
    const stages: InternalStage[] = [
      // Mirrors the 'cleared' shape from 2-12 unchecking a stage.
      { name: "Inquiry", completedAt: null as unknown as undefined },
      { name: "Design Ideated", completedAt: 1_700_000_000_000 },
    ];
    expect(deriveCustomerStage(stages)).toBe("Design Ideated");
  });

  it("ignores unrecognized internal stage names without crashing", () => {
    const stages: InternalStage[] = [
      { name: "Inquiry", completedAt: 1_700_000_000_000 },
      { name: "Bogus Stage", completedAt: 1_700_000_000_000 },
    ];
    expect(deriveCustomerStage(stages)).toBe("Order Started");
  });
});

describe("currentInternalStage", () => {
  it("returns null when no stages are completed", () => {
    expect(currentInternalStage(staged([]))).toBeNull();
  });

  it("returns null when the array is empty", () => {
    expect(currentInternalStage([])).toBeNull();
  });

  it("returns Inquiry when only Inquiry is completed", () => {
    expect(currentInternalStage(staged(["Inquiry"]))).toBe("Inquiry");
  });

  it("returns Delivered when every stage is completed", () => {
    expect(currentInternalStage(staged([...INTERNAL_STAGES]))).toBe(
      "Delivered",
    );
  });

  it("returns the latest stage by checklist order, not by array position", () => {
    // Reverse the input array order — output must still pick the highest
    // INTERNAL_STAGES index.
    const stages: InternalStage[] = INTERNAL_STAGES.slice()
      .reverse()
      .map((name) =>
        name === "Design Confirmed" || name === "Inquiry"
          ? { name, completedAt: 1_700_000_000_000 }
          : { name, completedAt: undefined },
      );
    expect(currentInternalStage(stages)).toBe("Design Confirmed");
  });

  it("ignores a completedAt of null (treats as not completed)", () => {
    const stages: InternalStage[] = [
      { name: "Inquiry", completedAt: 1_700_000_000_000 },
      { name: "Design Ideated", completedAt: null as unknown as undefined },
    ];
    expect(currentInternalStage(stages)).toBe("Inquiry");
  });

  it("ignores unrecognized stage names", () => {
    const stages: InternalStage[] = [
      { name: "Inquiry", completedAt: 1_700_000_000_000 },
      { name: "Bogus Stage", completedAt: 1_700_000_000_000 },
    ];
    expect(currentInternalStage(stages)).toBe("Inquiry");
  });
});

describe("chipToneForStage", () => {
  it("returns pending when there is no current stage", () => {
    expect(chipToneForStage(null)).toBe("pending");
  });

  it("returns complete when the customer-facing stage is Delivered", () => {
    expect(chipToneForStage("Delivered")).toBe("complete");
  });

  it("returns in-progress for every non-terminal customer-facing stage", () => {
    const inProgress = CUSTOMER_STAGES.filter((s) => s !== "Delivered");
    for (const stage of inProgress) {
      expect(chipToneForStage(stage)).toBe("in-progress");
    }
  });
});
