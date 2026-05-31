// Public surface of the design lib. Re-exports the atomic rules (length
// caps, silhouette-spec allowlists, type guards, isHttpUrl) and the form
// adapter (validateDesign, toDesignPayload, DesignErrors) so existing
// consumers can keep importing from "@/lib/design" while the Convex side
// imports from "@/lib/design/rules" directly.

export * from "./rules";
export * from "./form";
