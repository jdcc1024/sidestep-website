// Public surface of the roster-entry lib. Re-exports the atomic rules
// (constants, RosterSource, check helpers, rosterMatchKey) and the form
// adapter so consumers import from "@/lib/rosterEntry" while the Convex
// side imports from "@/lib/rosterEntry/rules" directly.

export * from "./rules";
export * from "./form";
