// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createOrder = vi.fn(async () => "order_new_test_id");
const push = vi.fn();

vi.mock("convex/react", () => ({
  // listMyDesigns returns [] so the design checklist renders the empty state
  // (form is still submittable since designIds is optional).
  useQuery: () => [],
  useMutation: () => createOrder,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { OrderForm } from "./OrderForm";

describe("OrderForm", () => {
  it("surfaces RHF + zod validation errors when the user submits an empty form", async () => {
    const user = userEvent.setup();
    render(<OrderForm />);

    await user.click(screen.getByRole("button", { name: /create order/i }));

    expect(
      await screen.findByText(/give your team a name/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/what sport or activity is this for/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/order at least 1 jersey/i)).toBeInTheDocument();
    expect(screen.getByText(/tell us the jersey style/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a neckline/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a sleeve style/i)).toBeInTheDocument();
    expect(createOrder).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
