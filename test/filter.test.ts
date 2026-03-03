import { describe, it, expect } from "vitest";
import { shouldIncludeEndpoint } from "../src/filter.js";
import type { EndpointFilter } from "../src/types.js";

describe("Endpoint Filter", () => {
  it("includes all endpoints when no filter is provided", () => {
    expect(shouldIncludeEndpoint("/users", "get", undefined)).toBe(true);
    expect(shouldIncludeEndpoint("/admin", "delete", undefined)).toBe(true);
  });

  it("excludes paths matching the exclude list (exact string)", () => {
    const filter: EndpointFilter = { exclude: ["/hidden"] };
    expect(shouldIncludeEndpoint("/hidden", "get", filter)).toBe(false);
    expect(shouldIncludeEndpoint("/users", "get", filter)).toBe(true);
  });

  it("excludes paths matching a regex in the exclude list", () => {
    const filter: EndpointFilter = { exclude: [/^\/admin/] };
    expect(shouldIncludeEndpoint("/admin/users", "get", filter)).toBe(false);
    expect(shouldIncludeEndpoint("/users", "get", filter)).toBe(true);
  });

  it("includes only paths in the include list (exact string)", () => {
    const filter: EndpointFilter = { include: ["/users"] };
    expect(shouldIncludeEndpoint("/users", "get", filter)).toBe(true);
    expect(shouldIncludeEndpoint("/orders", "get", filter)).toBe(false);
  });

  it("includes only paths matching a regex in the include list", () => {
    const filter: EndpointFilter = { include: [/^\/api/] };
    expect(shouldIncludeEndpoint("/api/v1/users", "get", filter)).toBe(true);
    expect(shouldIncludeEndpoint("/health", "get", filter)).toBe(false);
  });

  it("exclude overrides include for the same path", () => {
    const filter: EndpointFilter = {
      include: ["/users"],
      exclude: ["/users"],
    };
    expect(shouldIncludeEndpoint("/users", "get", filter)).toBe(false);
  });

  it("filters by HTTP method (case-insensitive)", () => {
    const filter: EndpointFilter = { methods: ["get", "post"] };
    expect(shouldIncludeEndpoint("/users", "get", filter)).toBe(true);
    expect(shouldIncludeEndpoint("/users", "POST", filter)).toBe(true);
    expect(shouldIncludeEndpoint("/users", "delete", filter)).toBe(false);
  });

  it("combines path include and method filters", () => {
    const filter: EndpointFilter = { include: ["/users"], methods: ["post"] };
    expect(shouldIncludeEndpoint("/users", "post", filter)).toBe(true);
    expect(shouldIncludeEndpoint("/users", "get", filter)).toBe(false);
    expect(shouldIncludeEndpoint("/orders", "post", filter)).toBe(false);
  });
});
