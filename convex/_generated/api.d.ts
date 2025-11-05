/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as artifacts from "../artifacts.js";
import type * as chatRuns from "../chatRuns.js";
import type * as chatTitles from "../chatTitles.js";
import type * as chats from "../chats.js";
import type * as documents from "../documents.js";
import type * as embeddings from "../embeddings.js";
import type * as memory from "../memory.js";
import type * as messages from "../messages.js";
import type * as projects from "../projects.js";
import type * as tools from "../tools.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  artifacts: typeof artifacts;
  chatRuns: typeof chatRuns;
  chatTitles: typeof chatTitles;
  chats: typeof chats;
  documents: typeof documents;
  embeddings: typeof embeddings;
  memory: typeof memory;
  messages: typeof messages;
  projects: typeof projects;
  tools: typeof tools;
  utils: typeof utils;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
