/* eslint-disable */
  /**
   * Generated `api` utility.
   *
   * THIS CODE IS AUTOMATICALLY GENERATED.
   *
   * To regenerate, run `npx convex dev`.
   * @module
   */
  
  import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
  import type * as calendar from "../calendar.js";
import type * as classwork from "../classwork.js";
import type * as friends from "../friends.js";
import type * as lib_auth from "../lib/auth.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";
import type * as water from "../water.js";
import type * as workouts from "../workouts.js";

  /**
   * A utility for referencing Convex functions in your app's API.
   *
   * Usage:
   * ```js
   * const myFunctionReference = api.myModule.myFunction;
   * ```
   */
  declare const fullApi: ApiFromModules<{
    "calendar": typeof calendar,
"classwork": typeof classwork,
"friends": typeof friends,
"lib/auth": typeof lib_auth,
"settings": typeof settings,
"users": typeof users,
"water": typeof water,
"workouts": typeof workouts,
  }>;
  export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
  export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
  