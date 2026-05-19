export type PricingTier = {
  label: string;
  min: number;
  max: number | null;
  pricePerUnit: number;
};

export const PRICING_TIERS: ReadonlyArray<PricingTier> = [
  { label: "5–9 jerseys", min: 5, max: 9, pricePerUnit: 60 },
  { label: "10–25 jerseys", min: 10, max: 24, pricePerUnit: 50 },
  { label: "26–50 jerseys", min: 25, max: 49, pricePerUnit: 45 },
  { label: "51+ jerseys", min: 50, max: null, pricePerUnit: 40 },
];

export const DESIGN_FEE = 125;

export type EstimateResult = {
  quantity: number;
  perUnitPrice: number;
  subtotal: number;
  designFee: number;
  total: number;
};

function tierFor(quantity: number): PricingTier | null {
  for (const tier of PRICING_TIERS) {
    const withinMin = quantity >= tier.min;
    const withinMax = tier.max === null || quantity <= tier.max;
    if (withinMin && withinMax) return tier;
  }
  return null;
}

export function calculateEstimate(
  quantity: number,
  hasDesignFee: boolean
): EstimateResult {
  const safeQuantity =
    Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0;

  if (safeQuantity === 0) {
    return {
      quantity: 0,
      perUnitPrice: 0,
      subtotal: 0,
      designFee: 0,
      total: 0,
    };
  }

  const tier = tierFor(safeQuantity);
  const perUnitPrice = tier ? tier.pricePerUnit : 0;
  const subtotal = perUnitPrice * safeQuantity;
  const designFee = hasDesignFee ? DESIGN_FEE : 0;

  return {
    quantity: safeQuantity,
    perUnitPrice,
    subtotal,
    designFee,
    total: subtotal + designFee,
  };
}
