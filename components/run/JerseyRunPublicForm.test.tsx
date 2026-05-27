// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "@/convex/_generated/dataModel";

// useQuery returns a usable open-mode run so JerseyRunPublicForm renders the
// form view (rather than skeleton/not-found/closed). useMutation returns a
// stub so submit attempts don't blow up if they slip past validation.
const submitResponse = vi.fn(async () => {});

// The component now calls useQuery twice (getPublic for the run + 3-08's
// listMyResponsesForRun for the signed-in panel). Dispatch by function
// name so each call gets the right payload — without this branch the
// panel query would receive the run object and crash trying to .map() it.
const listMyResponsesForRunMock = vi.fn(
  (): Array<Record<string, unknown>> => [],
);

vi.mock("convex/react", async () => {
  const { getFunctionName } = await vi.importActual<
    typeof import("convex/server")
  >("convex/server");
  return {
    useQuery: (ref: unknown) => {
      const name = getFunctionName(ref as Parameters<typeof getFunctionName>[0]);
      if (name.endsWith(":listMyResponsesForRun")) {
        return listMyResponsesForRunMock();
      }
      return {
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
      };
    },
    useMutation: () => submitResponse,
  };
});

import { JerseyRunPublicForm } from "./JerseyRunPublicForm";

const fakeRunId = "jersey_run_test_id" as Id<"jerseyRuns">;

async function fillCompleteForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: {
    respondentName?: string;
    respondentEmail?: string;
    size?: string;
    // null means "skip this field" (leave blank); undefined means "use default".
    jerseyName?: string | null;
    jerseyNumber?: string | null;
  } = {},
) {
  const respondentName = overrides.respondentName ?? "Pat Parent";
  const respondentEmail = overrides.respondentEmail ?? "pat@example.com";
  const size = overrides.size ?? "M";
  const jerseyName =
    overrides.jerseyName === undefined ? "Alex" : overrides.jerseyName;
  const jerseyNumber =
    overrides.jerseyNumber === undefined ? "7" : overrides.jerseyNumber;

  await user.type(screen.getByLabelText(/your name/i), respondentName);
  await user.type(screen.getByLabelText(/your email/i), respondentEmail);
  await user.click(screen.getByRole("radio", { name: size }));
  if (jerseyName !== null) {
    await user.type(screen.getByLabelText(/name on jersey/i), jerseyName);
  }
  if (jerseyNumber !== null) {
    await user.type(screen.getByLabelText(/^number$/i), jerseyNumber);
  }
}

describe("JerseyRunPublicForm", () => {
  beforeEach(() => {
    submitResponse.mockReset();
    submitResponse.mockImplementation(async () => {});
    // Default to empty (no prior responses) so the panel stays hidden unless
    // a specific test seeds it. Mirrors the signed-out / first-timer case.
    listMyResponsesForRunMock.mockReset();
    listMyResponsesForRunMock.mockReturnValue([]);
  });

  it("surfaces RHF + zod validation errors when the user submits an empty form", async () => {
    const user = userEvent.setup();
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(
      await screen.findByText(/tell us your name/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/we need an email/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a size/i)).toBeInTheDocument();
    expect(submitResponse).not.toHaveBeenCalled();
  });

  describe("Submit and add another", () => {
    it("submits and resets per-jersey fields while preserving respondent name and email", async () => {
      const user = userEvent.setup();
      render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

      await fillCompleteForm(user);
      await user.click(
        screen.getByRole("button", { name: /submit and add another/i }),
      );

      await waitFor(() => {
        expect(submitResponse).toHaveBeenCalledTimes(1);
      });
      expect(submitResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          jerseyRunId: fakeRunId,
          respondentName: "Pat Parent",
          respondentEmail: "pat@example.com",
          size: "M",
          jerseyName: "Alex",
          jerseyNumber: "7",
        }),
      );

      // Form must remain on screen — NOT the "You're in!" success state.
      expect(screen.queryByText(/you're in/i)).not.toBeInTheDocument();

      // Respondent identity sticks across consecutive entries.
      expect(screen.getByLabelText(/your name/i)).toHaveValue("Pat Parent");
      expect(screen.getByLabelText(/your email/i)).toHaveValue(
        "pat@example.com",
      );

      // Per-jersey fields wiped, ready for the next entry.
      await waitFor(() => {
        expect(screen.getByLabelText(/name on jersey/i)).toHaveValue("");
      });
      expect(screen.getByLabelText(/^number$/i)).toHaveValue("");
      expect(screen.getByRole("radio", { name: "M" })).not.toBeChecked();

      // Both submit actions usable again.
      expect(
        screen.getByRole("button", { name: /^submit$/i }),
      ).toBeEnabled();
      expect(
        screen.getByRole("button", { name: /submit and add another/i }),
      ).toBeEnabled();
    });

    it("routes a blank-jersey submission through the warning dialog before firing the mutation", async () => {
      const user = userEvent.setup();
      render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

      await fillCompleteForm(user, { jerseyName: null, jerseyNumber: null });
      await user.click(
        screen.getByRole("button", { name: /submit and add another/i }),
      );

      // Dialog gates the submission — mutation hasn't fired yet.
      expect(
        await screen.findByText(/leave the jersey blank/i),
      ).toBeInTheDocument();
      expect(submitResponse).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: /yes, submit/i }));

      await waitFor(() => {
        expect(submitResponse).toHaveBeenCalledTimes(1);
      });
      // Add-another branch fires: stays on form, identity preserved.
      expect(screen.queryByText(/you're in/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/your name/i)).toHaveValue("Pat Parent");
    });

    it("ignores a rapid second click while a submission is in flight", async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void = () => {};
      submitResponse.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);
      await fillCompleteForm(user);

      const addAnother = screen.getByRole("button", {
        name: /submit and add another/i,
      });
      await user.click(addAnother);

      // Submission in flight — button disabled, second click is a no-op.
      await waitFor(() => {
        expect(addAnother).toBeDisabled();
      });
      await user.click(addAnother);

      resolveSubmit();

      await waitFor(() => {
        expect(submitResponse).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Your responses to this run panel (3-08)", () => {
    it("stays hidden when the signed-in visitor has no prior responses", () => {
      // Default mock returns [] — first-timer and anonymous look identical.
      render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);
      expect(
        screen.queryByRole("heading", { name: /your responses to this run/i }),
      ).not.toBeInTheDocument();
    });

    it("renders one card per prior response with size, name, and number", () => {
      listMyResponsesForRunMock.mockReturnValue([
        {
          _id: "resp_1",
          jerseyRunId: fakeRunId,
          respondentName: "Pat Parent",
          respondentEmail: "pat@example.com",
          size: "M",
          jerseyName: "Alex",
          jerseyNumber: "7",
          customAnswers: {},
          submittedAt: Date.now() - 60_000,
        },
        {
          _id: "resp_2",
          jerseyRunId: fakeRunId,
          respondentName: "Pat Parent",
          respondentEmail: "pat@example.com",
          size: "S",
          jerseyName: "Jamie",
          jerseyNumber: "3",
          customAnswers: {},
          submittedAt: Date.now() - 120_000,
        },
      ]);

      render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

      expect(
        screen.getByRole("heading", { name: /your responses to this run/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/2 submissions from you/i)).toBeInTheDocument();
      expect(screen.getByText(/Alex #7/)).toBeInTheDocument();
      expect(screen.getByText(/Jamie #3/)).toBeInTheDocument();
      expect(screen.getByText(/Size M/)).toBeInTheDocument();
      expect(screen.getByText(/Size S/)).toBeInTheDocument();
    });
  });
});
