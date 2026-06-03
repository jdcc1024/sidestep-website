// Public surface of the order-entry lib. Re-exports the atomic rules
// (constants, OrderSource, check helpers) and the form adapter so
// consumers import from "@/lib/orderEntry" while the Convex side imports
// from "@/lib/orderEntry/rules" directly.

export * from "./rules";
export * from "./form";
