// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// One shared stub for every useMutation call — validation tests never
// reach the submit path, so we don't need to distinguish between them.
const mutationStub = vi.fn(async () => undefined);
vi.mock("convex/react", () => ({
  useMutation: () => mutationStub,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { DesignForm } from "./DesignForm";

describe("DesignForm", () => {
  it("surfaces RHF + zod validation errors when the user submits an empty form", async () => {
    const user = userEvent.setup();
    render(<DesignForm />);

    await user.click(screen.getByRole("button", { name: /save design/i }));

    expect(
      await screen.findByText(/give your design a title/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/add a brief so sidestep knows what you want/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/upload at least one file/i),
    ).toBeInTheDocument();
    expect(mutationStub).not.toHaveBeenCalled();
  });

  it("flags an invalid canva link", async () => {
    const user = userEvent.setup();
    render(<DesignForm />);

    await user.type(screen.getByLabelText(/canva share link/i), "canva.com/x");
    await user.click(screen.getByRole("button", { name: /save design/i }));

    expect(
      await screen.findByText(/paste a full link starting with https/i),
    ).toBeInTheDocument();
    expect(mutationStub).not.toHaveBeenCalled();
  });
});
