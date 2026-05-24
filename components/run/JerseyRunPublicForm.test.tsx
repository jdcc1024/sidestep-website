// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "@/convex/_generated/dataModel";

// useQuery returns a usable open-mode run so JerseyRunPublicForm renders the
// form view (rather than skeleton/not-found/closed). useMutation returns a
// stub so submit attempts don't blow up if they slip past validation.
const submitResponse = vi.fn(async () => {});
vi.mock("convex/react", () => ({
  useQuery: () => ({
    teamName: "Vancouver Ravens",
    captainName: "Sam Captain",
    run: {
      namesMode: "open" as const,
      sizeOptions: ["S", "M", "L"],
      customQuestions: [],
      fixedRoster: undefined,
      // Deadline far in the future so the run isn't treated as closed.
      deadline: Date.now() + 1000 * 60 * 60 * 24 * 365,
      status: "open" as const,
    },
  }),
  useMutation: () => submitResponse,
}));

import { JerseyRunPublicForm } from "./JerseyRunPublicForm";

const fakeRunId = "jersey_run_test_id" as Id<"jerseyRuns">;

describe("JerseyRunPublicForm", () => {
  it("surfaces RHF + zod validation errors when the user submits an empty form", async () => {
    const user = userEvent.setup();
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      await screen.findByText(/tell us your name/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/we need an email/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a size/i)).toBeInTheDocument();
    expect(submitResponse).not.toHaveBeenCalled();
  });
});
