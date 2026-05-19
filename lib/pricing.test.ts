import { describe, expect, it } from "vitest";
import { calculateEstimate, PRICING_TIERS, DESIGN_FEE } from "./pricing";

describe("PRICING_TIERS", () => {
  it("covers every quantity from 5 upward with no gaps", () => {
    let cursor = 5;
    for (const tier of PRICING_TIERS) {
      expect(tier.min).toBe(cursor);
      cursor = tier.max === null ? Infinity : tier.max + 1;
    }
    expect(cursor).toBe(Infinity);
  });
});

describe("calculateEstimate — tier boundaries (no design fee)", () => {
  const cases: Array<[number, number]> = [
    [1, 0],
    [9, 60],
    [10, 50],
    [24, 50],
    [25, 45],
    [49, 45],
    [50, 40],
    [51, 40],
    [100, 40],
  ];

  for (const [quantity, expectedUnit] of cases) {
    it(`quantity ${quantity} uses $${expectedUnit}/unit`, () => {
      const result = calculateEstimate(quantity, false);
      expect(result.perUnitPrice).toBe(expectedUnit);
      expect(result.subtotal).toBe(quantity * expectedUnit);
      expect(result.designFee).toBe(0);
      expect(result.total).toBe(quantity * expectedUnit);
    });
  }
});

describe("calculateEstimate — design fee toggle", () => {
  it("adds $125 when design fee is enabled", () => {
    const result = calculateEstimate(20, true);
    expect(result.perUnitPrice).toBe(50);
    expect(result.subtotal).toBe(1000);
    expect(result.designFee).toBe(DESIGN_FEE);
    expect(result.designFee).toBe(125);
    expect(result.total).toBe(1125);
  });

  it("does not charge design fee when toggle is off", () => {
    const result = calculateEstimate(20, false);
    expect(result.designFee).toBe(0);
    expect(result.total).toBe(1000);
  });
});

describe("calculateEstimate — zero and invalid quantities", () => {
  it("returns all zeros for quantity 0 even with design fee toggled", () => {
    const result = calculateEstimate(0, true);
    expect(result.quantity).toBe(0);
    expect(result.perUnitPrice).toBe(0);
    expect(result.subtotal).toBe(0);
    expect(result.designFee).toBe(0);
    expect(result.total).toBe(0);
  });

  it("clamps negative quantities to 0", () => {
    const result = calculateEstimate(-5, true);
    expect(result.quantity).toBe(0);
    expect(result.total).toBe(0);
  });

  it("handles NaN by returning zero", () => {
    const result = calculateEstimate(Number.NaN, true);
    expect(result.quantity).toBe(0);
    expect(result.total).toBe(0);
  });

  it("floors fractional quantities", () => {
    const result = calculateEstimate(10.9, false);
    expect(result.quantity).toBe(10);
    expect(result.perUnitPrice).toBe(50);
    expect(result.subtotal).toBe(500);
  });
});
