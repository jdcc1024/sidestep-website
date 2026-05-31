// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// One shared stub for every useMutation call. Validation tests never reach
// the submit path; the happy-path tests have no pending files, so the only
// mutation invoked is createDesign — generateUploadUrl is never called.
const mutationStub = vi.fn(async () => undefined);
vi.mock("convex/react", () => ({
  useMutation: () => mutationStub,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { DesignForm } from "./DesignForm";

describe("DesignForm", () => {
  // The mutation stub is shared across tests; clear call history so the
  // "not called" assertions don't see calls from a prior happy-path test.
  beforeEach(() => mutationStub.mockClear());

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
    expect(mutationStub).not.toHaveBeenCalled();
  });

  it("does not block submission on missing files — an idea-only brief is valid", async () => {
    const user = userEvent.setup();
    render(<DesignForm />);

    await user.type(screen.getByLabelText(/^title$/i), "Spring kit idea");
    await user.type(
      screen.getByLabelText(/^brief$/i),
      "Cobalt blue, retro stripes.",
    );
    await user.click(screen.getByRole("button", { name: /save design/i }));

    // No "upload a file" error, and the design is created with zero files.
    expect(screen.queryByText(/upload at least one file/i)).toBeNull();
    expect(mutationStub).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Spring kit idea",
        brief: "Cobalt blue, retro stripes.",
        fileIds: [],
      }),
    );
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

  it("renders the silhouette spec fields and forwards jersey style in the payload", async () => {
    const user = userEvent.setup();
    render(<DesignForm />);

    // The three silhouette-spec controls are present. Exact label text so
    // we don't also match the Select placeholders ("Choose a neckline…").
    expect(screen.getByLabelText(/jersey style/i)).toBeInTheDocument();
    expect(screen.getByText("Neckline")).toBeInTheDocument();
    expect(screen.getByText("Sleeve style")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^title$/i), "Home kit");
    await user.type(screen.getByLabelText(/^brief$/i), "Bold stripes.");
    await user.type(screen.getByLabelText(/jersey style/i), "Soccer jersey");
    await user.click(screen.getByRole("button", { name: /save design/i }));

    expect(mutationStub).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Home kit",
        brief: "Bold stripes.",
        jerseyStyle: "Soccer jersey",
      }),
    );
  });
});
