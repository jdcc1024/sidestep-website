// Form adapter for the portal design creation / edit form. Wraps the
// atomic rules in ./rules into a DesignErrors record keyed by form field,
// plus a toDesignPayload helper that converts validated input into the
// shape the Convex mutation accepts. The Convex side imports the same
// rules directly — see convex/designs.ts.
//
// Silhouette specs (style/neckline/sleeve) live in ./rules and on the
// designs table. As of O-02 the design form captures them, so this adapter
// validates and forwards them too. Files are optional — an idea-only brief
// is a valid design (flow spec §Flow 1).

import {
  BRIEF_MAX_LENGTH,
  CANVA_LINK_MAX_LENGTH,
  JERSEY_STYLE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  isHttpUrl,
  isNeckline,
  isSleeveStyle,
} from "./rules";

export type DesignInput = {
  title: string;
  brief: string;
  canvaLink: string;
  // Silhouette specs — all optional. Empty string means "undecided"; a
  // non-empty neckline / sleeveStyle must match the allowlists in ./rules.
  jerseyStyle: string;
  neckline: string;
  sleeveStyle: string;
};

export type DesignErrors = Partial<Record<keyof DesignInput, string>>;

export type DesignPayload = {
  title: string;
  brief: string;
  canvaLink?: string;
  jerseyStyle?: string;
  neckline?: string;
  sleeveStyle?: string;
};

export const EMPTY_DESIGN: DesignInput = {
  title: "",
  brief: "",
  canvaLink: "",
  jerseyStyle: "",
  neckline: "",
  sleeveStyle: "",
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

  const jerseyStyle = input.jerseyStyle.trim();
  if (jerseyStyle.length > JERSEY_STYLE_MAX_LENGTH)
    errors.jerseyStyle = `Please keep the jersey style under ${JERSEY_STYLE_MAX_LENGTH} characters.`;

  const neckline = input.neckline.trim();
  if (neckline && !isNeckline(neckline))
    errors.neckline = "Pick a neckline from the list.";

  const sleeveStyle = input.sleeveStyle.trim();
  if (sleeveStyle && !isSleeveStyle(sleeveStyle))
    errors.sleeveStyle = "Pick a sleeve style from the list.";

  return errors;
}

export function toDesignPayload(input: DesignInput): DesignPayload {
  const title = input.title.trim();
  const brief = input.brief.trim();
  const canvaLink = input.canvaLink.trim();
  const jerseyStyle = input.jerseyStyle.trim();
  const neckline = input.neckline.trim();
  const sleeveStyle = input.sleeveStyle.trim();
  return {
    title,
    brief,
    ...(canvaLink ? { canvaLink } : {}),
    ...(jerseyStyle ? { jerseyStyle } : {}),
    ...(neckline ? { neckline } : {}),
    ...(sleeveStyle ? { sleeveStyle } : {}),
  };
}
