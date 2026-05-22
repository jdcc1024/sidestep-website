/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _schemaSmokeTest from "../_schemaSmokeTest.js";
import type * as admin from "../admin.js";
import type * as crons from "../crons.js";
import type * as designs from "../designs.js";
import type * as intakes from "../intakes.js";
import type * as jerseyRunActions from "../jerseyRunActions.js";
import type * as jerseyRuns from "../jerseyRuns.js";
import type * as orders from "../orders.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _schemaSmokeTest: typeof _schemaSmokeTest;
  admin: typeof admin;
  crons: typeof crons;
  designs: typeof designs;
  intakes: typeof intakes;
  jerseyRunActions: typeof jerseyRunActions;
  jerseyRuns: typeof jerseyRuns;
  orders: typeof orders;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
