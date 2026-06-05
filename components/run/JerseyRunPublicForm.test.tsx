// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "@/convex/_generated/dataModel";

// submitOrder is the new fan submission mutation (R-02). Typed via the
// generic (not a named impl param) so `.mock.calls` carries the args shape
// without tripping no-unused-vars. beforeEach wires the resolved value.
type SubmitArgs = {
  jerseyRunId: string;
  submitterName: string;
  submitterEmail: string;
  customAnswers: Record<string, string>;
  lines: unknown[];
};
const submitOrder = vi.fn<(args: SubmitArgs) => Promise<unknown>>();

// getPublic's payload is configurable per test (open vs fixed, one vs many
// designs) via this mutable holder, which beforeEach resets to the default
// single-design open-mode run.
const HOME = "design_home" as Id<"designs">;
const AWAY = "design_away" as Id<"designs">;

type PublicData = {
  teamName: string;
  captainName: string;
  run: {
    namesMode: "open" | "fixed";
    sizeOptions: string[];
    customQuestions: { id: string; label: string }[];
    deadline: number;
    status: "open" | "closed" | "locked";
  };
  designs: {
    _id: Id<"designs">;
    title: string;
    roster: { _id: Id<"rosterEntries">; name: string; number?: string }[];
  }[];
};

const FAR_FUTURE = Date.now() + 1000 * 60 * 60 * 24 * 365;

function singleDesignOpen(): PublicData {
  return {
    teamName: "Vancouver Ravens",
    captainName: "Sam Captain",
    run: {
      namesMode: "open",
      sizeOptions: ["S", "M", "L"],
      customQuestions: [],
      deadline: FAR_FUTURE,
      status: "open",
    },
    designs: [{ _id: HOME, title: "Home", roster: [] }],
  };
}

let publicData: PublicData = singleDesignOpen();

vi.mock("convex/react", () => ({
  useQuery: () => publicData,
  useMutation: () => submitOrder,
}));

import { JerseyRunPublicForm } from "./JerseyRunPublicForm";

const fakeRunId = "jersey_run_test_id" as Id<"jerseyRuns">;

describe("JerseyRunPublicForm", () => {
  beforeEach(() => {
    submitOrder.mockReset();
    submitOrder.mockResolvedValue({
      submitterEmail: "pat@example.com",
      created: 1,
      collisions: 0,
      entries: [],
    });
    publicData = singleDesignOpen();
  });

  it("surfaces validation errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/tell us your name/i)).toBeInTheDocument();
    expect(screen.getByText(/we need an email/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a size/i)).toBeInTheDocument();
    expect(submitOrder).not.toHaveBeenCalled();
  });

  it("submits a single jersey as one order-entry line", async () => {
    const user = userEvent.setup();
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    await user.type(screen.getByLabelText(/your name/i), "Pat Parent");
    await user.type(screen.getByLabelText(/your email/i), "pat@example.com");
    await user.type(screen.getByLabelText(/name on jersey/i), "Alex");
    await user.type(screen.getByLabelText(/^number$/i), "7");
    await user.click(screen.getByRole("radio", { name: "M" }));

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(submitOrder).toHaveBeenCalledTimes(1);
    });
    expect(submitOrder).toHaveBeenCalledWith({
      jerseyRunId: fakeRunId,
      submitterName: "Pat Parent",
      submitterEmail: "pat@example.com",
      customAnswers: {},
      lines: [
        { designId: HOME, name: "Alex", number: "7", size: "M", qty: 1 },
      ],
    });
    expect(await screen.findByText(/you're in/i)).toBeInTheDocument();
  });

  it("adds a second jersey line and submits both", async () => {
    const user = userEvent.setup();
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    await user.type(screen.getByLabelText(/your name/i), "Pat Parent");
    await user.type(screen.getByLabelText(/your email/i), "pat@example.com");

    // First jersey.
    const firstCard = screen.getByRole("group", { name: /jersey 1/i });
    await user.type(within(firstCard).getByLabelText(/name on jersey/i), "Alex");
    await user.click(within(firstCard).getByRole("radio", { name: "M" }));

    // Add a second line.
    await user.click(
      screen.getByRole("button", { name: /add another jersey/i }),
    );
    const secondCard = screen.getByRole("group", { name: /jersey 2/i });
    await user.type(
      within(secondCard).getByLabelText(/name on jersey/i),
      "Jamie",
    );
    await user.click(within(secondCard).getByRole("radio", { name: "L" }));

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(submitOrder).toHaveBeenCalledTimes(1);
    });
    const arg = submitOrder.mock.calls[0][0] as { lines: unknown[] };
    expect(arg.lines).toEqual([
      { designId: HOME, name: "Alex", number: undefined, size: "M", qty: 1 },
      { designId: HOME, name: "Jamie", number: undefined, size: "L", qty: 1 },
    ]);
  });

  it("routes a blank jersey through the confirm dialog before submitting", async () => {
    const user = userEvent.setup();
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    await user.type(screen.getByLabelText(/your name/i), "Pat Parent");
    await user.type(screen.getByLabelText(/your email/i), "pat@example.com");
    await user.click(screen.getByRole("radio", { name: "M" }));
    // Leave name + number blank.

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(
      await screen.findByText(/leave a jersey blank/i),
    ).toBeInTheDocument();
    expect(submitOrder).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /yes, submit/i }));
    await waitFor(() => {
      expect(submitOrder).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a design picker only when the order has multiple designs", async () => {
    publicData = {
      ...singleDesignOpen(),
      designs: [
        { _id: HOME, title: "Home", roster: [] },
        { _id: AWAY, title: "Away", roster: [] },
      ],
    };
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    expect(screen.getByText(/your jerseys & designs/i)).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /design/i }),
    ).toBeInTheDocument();
  });

  function fixedSingleDesign(): PublicData {
    return {
      ...singleDesignOpen(),
      run: { ...singleDesignOpen().run, namesMode: "fixed" },
      designs: [
        {
          _id: HOME,
          title: "Home",
          roster: [
            { _id: "slot_1" as Id<"rosterEntries">, name: "Gretzky", number: "99" },
          ],
        },
      ],
    };
  }

  it("lets a fan tap sizes per roster slot and submits one line per size", async () => {
    publicData = fixedSingleDesign();
    const user = userEvent.setup();
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    // No free-text name field and no name dropdown — a roster grid instead.
    expect(screen.queryByLabelText(/name on jersey/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /pick your name/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Gretzky")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your name/i), "Pat Parent");
    await user.type(screen.getByLabelText(/your email/i), "pat@example.com");

    // Tap M twice (qty 2) and L once for the same slot.
    await user.click(
      screen.getByRole("button", { name: /add one M for Gretzky/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /add one M for Gretzky/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /add one L for Gretzky/i }),
    );

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(submitOrder).toHaveBeenCalledTimes(1);
    });
    expect(submitOrder).toHaveBeenCalledWith({
      jerseyRunId: fakeRunId,
      submitterName: "Pat Parent",
      submitterEmail: "pat@example.com",
      customAnswers: {},
      lines: [
        { designId: HOME, rosterEntryId: "slot_1", size: "M", qty: 2 },
        { designId: HOME, rosterEntryId: "slot_1", size: "L", qty: 1 },
      ],
    });
  });

  it("decrements a slot's size and hides the minus at zero", async () => {
    publicData = fixedSingleDesign();
    const user = userEvent.setup();
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    // No "−" until the size has a count.
    expect(
      screen.queryByRole("button", { name: /remove one M for Gretzky/i }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /add one M for Gretzky/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /remove one M for Gretzky/i }),
    );

    expect(
      screen.queryByRole("button", { name: /remove one M for Gretzky/i }),
    ).not.toBeInTheDocument();
  });

  it("blocks a fixed-mode submit with nothing selected", async () => {
    publicData = fixedSingleDesign();
    const user = userEvent.setup();
    render(<JerseyRunPublicForm jerseyRunId={fakeRunId} />);

    await user.type(screen.getByLabelText(/your name/i), "Pat Parent");
    await user.type(screen.getByLabelText(/your email/i), "pat@example.com");

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(
      await screen.findByText(/add at least one jersey/i),
    ).toBeInTheDocument();
    expect(submitOrder).not.toHaveBeenCalled();
  });
});
