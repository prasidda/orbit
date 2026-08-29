/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calendar from "../calendar.js";
import type * as classwork from "../classwork.js";
import type * as friends from "../friends.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_recurrence from "../lib/recurrence.js";
import type * as recurrences from "../recurrences.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";
import type * as water from "../water.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  calendar: typeof calendar;
  classwork: typeof classwork;
  friends: typeof friends;
  "lib/auth": typeof lib_auth;
  "lib/recurrence": typeof lib_recurrence;
  recurrences: typeof recurrences;
  settings: typeof settings;
  users: typeof users;
  water: typeof water;
  workouts: typeof workouts;
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
