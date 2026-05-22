// Shared validation for the portal design creation / edit form. The same
// rules are enforced again server-side in convex/designs.ts so a hand-rolled
// client can't bypass them.

export const TITLE_MAX_LENGTH = 120;
export const BRIEF_MAX_LENGTH = 2000;
export const CANVA_LINK_MAX_LENGTH = 500;

export type DesignInput = {
  title: string;
  brief: string;
  canvaLink: string;
  // Number of files attached to this design after the pending submit —
  // existing files (edit mode) plus newly selected files. Validated as a
  // single count so the rule "at least one file" reads the same in both
  // create and edit flows.
  fileCount: number;
};

export type DesignErrors = Partial<Record<keyof DesignInput, string>>;

export type DesignPayload = {
  title: string;
  brief: string;
  canvaLink?: string;
};

export const EMPTY_DESIGN: DesignInput = {
  title: "",
  brief: "",
  canvaLink: "",
  fileCount: 0,
};

export function validateDesign(input: DesignInput): DesignErrors {
  const errors: DesignErrors = {};

  const title = input.title.trim();
  if (!title) errors.title = "Give your design a title.";
  else if (title.length > TITLE_MAX_LENGTH)
    errors.title = `Please keep the title under ${TITLE_MAX_LENGTH} characters.`;

  const brief = input.brief.trim();
  if (!brief) errors.brief = "Add a brief so Sidestep knows what you want.";
  else if (brief.length > BRIEF_MAX_LENGTH)
    errors.brief = `Please keep the brief under ${BRIEF_MAX_LENGTH} characters.`;

  const canvaLink = input.canvaLink.trim();
  if (canvaLink) {
    if (canvaLink.length > CANVA_LINK_MAX_LENGTH)
      errors.canvaLink = "That link is too long.";
    else if (!isHttpUrl(canvaLink))
      errors.canvaLink = "Paste a full link starting with https://";
  }

  if (input.fileCount < 1)
    errors.fileCount = "Upload at least one file (logo, mood board, reference image).";

  return errors;
}

export function toDesignPayload(input: DesignInput): DesignPayload {
  const title = input.title.trim();
  const brief = input.brief.trim();
  const canvaLink = input.canvaLink.trim();
  return {
    title,
    brief,
    ...(canvaLink ? { canvaLink } : {}),
  };
}

// Liberal URL check — we display the link as a clickable anchor and do no
// rendering of the content itself, so the goal is just to catch obvious
// typos and reject schemes other than http/https.
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
