// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "@/convex/_generated/dataModel";

// useQuery returns null → JerseyRunSetup branches to the form view.
// useMutation returns a stub so submit attempts don't blow up if they slip past validation.
const createMutation = vi.fn(async () => {});
vi.mock("convex/react", () => ({
  useQuery: () => null,
  useMutation: () => createMutation,
}));

import { JerseyRunSetup } from "./JerseyRunSetup";

const fakeOrderId = "order_test_id" as Id<"orders">;

describe("JerseyRunSetup", () => {
  it("surfaces RHF + zod validation errors when the user submits an empty form", async () => {
    const user = userEvent.setup();
    render(<JerseyRunSetup orderId={fakeOrderId} />);

    await user.click(
      screen.getByRole("button", { name: /create jersey run/i }),
    );

    expect(
      await screen.findByText(/pick at least one size/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/choose how names will be collected/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/pick a deadline date/i)).toBeInTheDocument();
    expect(createMutation).not.toHaveBeenCalled();
  });
});
