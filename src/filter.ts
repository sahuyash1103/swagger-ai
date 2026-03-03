import type { EndpointFilter } from "./types.js";

export function shouldIncludeEndpoint(
  path: string,
  method: string,
  filter?: EndpointFilter,
): boolean {
  if (!filter) return true;

  // 1. Method filtering
  if (filter.methods && filter.methods.length > 0) {
    if (
      !filter.methods.map((m) => m.toLowerCase()).includes(method.toLowerCase())
    ) {
      return false;
    }
  }

  // 2. Exclude filtering (takes precedence)
  if (filter.exclude && filter.exclude.length > 0) {
    for (const ex of filter.exclude) {
      if (typeof ex === "string" && path === ex) return false;
      if (ex instanceof RegExp && ex.test(path)) return false;
    }
  }

  // 3. Include filtering (if configured, must match at least one)
  if (filter.include && filter.include.length > 0) {
    let included = false;
    for (const inc of filter.include) {
      if (typeof inc === "string" && path === inc) included = true;
      if (inc instanceof RegExp && inc.test(path)) included = true;
    }
    if (!included) return false;
  }

  return true;
}
