// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "@/convex/_generated/dataModel";
import { INTERNAL_STAGES } from "@/lib/orderStages";

// useMutation returns a stub so we can assert on the payload the checklist
// sends without touching a real Convex backend.
type StagePayload = {
  orderId: string;
  stages: Array<{ name: string; completedAt: number | null }>;
};
const updateMutation = vi.fn<(args: StagePayload) => Promise<void>>();
vi.mock("convex/react", () => ({
  useMutation: () => updateMutation,
}));

import { OrderStageChecklist } from "./OrderStageChecklist";

const orderId = "order_test_id" as Id<"orders">;

describe("OrderStageChecklist", () => {
  it("renders all 14 internal stages with the seeded one checked", () => {
    render(
      <OrderStageChecklist
        orderId={orderId}
        internalStages={[{ name: "Inquiry", completedAt: 1700000000000 }]}
      />,
    );

    for (const name of INTERNAL_STAGES) {
      expect(screen.getByRole("checkbox", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("checkbox", { name: "Inquiry" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Design Confirmed" }),
    ).not.toBeChecked();
  });

  it("sends the full 14-stage array with a timestamp when a stage is checked", async () => {
    const user = userEvent.setup();
    render(
      <OrderStageChecklist
        orderId={orderId}
        internalStages={[{ name: "Inquiry", completedAt: 1700000000000 }]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Design Confirmed" }));

    expect(updateMutation).toHaveBeenCalledTimes(1);
    const payload = updateMutation.mock.calls[0][0];
    expect(payload.orderId).toBe(orderId);
    expect(payload.stages).toHaveLength(INTERNAL_STAGES.length);

    // The seeded stage keeps its timestamp; the newly checked one gains a
    // non-null timestamp; everything else stays null.
    const byName = new Map(payload.stages.map((s) => [s.name, s.completedAt]));
    expect(byName.get("Inquiry")).toBe(1700000000000);
    expect(byName.get("Design Confirmed")).toEqual(expect.any(Number));
    expect(byName.get("Planned")).toBeNull();
  });

  it("clears the timestamp when a completed stage is unchecked", async () => {
    const user = userEvent.setup();
    render(
      <OrderStageChecklist
        orderId={orderId}
        internalStages={[
          { name: "Inquiry", completedAt: 1700000000000 },
          { name: "Design Confirmed", completedAt: 1700000000000 },
        ]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Design Confirmed" }));

    const payload = updateMutation.mock.calls.at(-1)![0];
    const byName = new Map(payload.stages.map((s) => [s.name, s.completedAt]));
    expect(byName.get("Design Confirmed")).toBeNull();
    expect(byName.get("Inquiry")).toBe(1700000000000);
  });
});
