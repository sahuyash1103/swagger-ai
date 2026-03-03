import { describe, it, expect } from "vitest";
import { parseSwagger } from "../src/parser.js";
import { mockSwagger } from "./mockSwagger.js";

describe("Swagger Parser", () => {
  it("extracts methods and paths", () => {
    const endpoints = parseSwagger(mockSwagger, { baseUrl: "http://api" });
    expect(endpoints.length).toBe(4);

    const getUsers = endpoints.find((e) => e.operationId === "getUsers")!;
    expect(getUsers.method).toBe("GET");
    expect(getUsers.path).toBe("/users");
    expect(getUsers.summary).toBe("Get all users");
  });

  it("extracts security requirements from global config", () => {
    const endpoints = parseSwagger(mockSwagger, { baseUrl: "http://api" });
    const getUsers = endpoints.find((e) => e.operationId === "getUsers")!;
    expect(getUsers.securityRequirements).toContain("bearerAuth");
  });

  it("resolves refs and formats nested schemas simplifying them", () => {
    const endpoints = parseSwagger(mockSwagger, { baseUrl: "http://api" });

    // Test Response parsing
    const getUsers = endpoints.find((e) => e.operationId === "getUsers")!;
    const okResponse = getUsers.responses.find((r) => r.statusCode === "200")!;
    // schema should be simplified Array -> Object -> id(int), name(str)
    expect(okResponse.schemaDetails).toEqual([
      { id: "integer", name: "string" },
    ]);

    // Test Request Body parsing
    const createUser = endpoints.find((e) => e.operationId === "createUser");
    const body = createUser?.requestBody?.[0];
    expect(body?.contentType).toBe("application/json");
    expect(body?.schemaDetails).toEqual({ id: "integer", name: "string" });
  });

  it("pulls parameters to plain shapes", () => {
    const endpoints = parseSwagger(mockSwagger, { baseUrl: "http://api" });
    const getUserById = endpoints.find((e) => e.operationId === "getUserById");
    expect(getUserById?.parameters.length).toBe(1);
    expect(getUserById?.parameters[0]?.name).toBe("id");
    expect(getUserById?.parameters[0]?.in).toBe("path");
    expect(getUserById?.parameters[0]?.type).toBe("integer");
  });

  it("filters out endpoints based on exclude config", () => {
    const endpoints = parseSwagger(mockSwagger, {
      baseUrl: "http://api",
      endpoints: { exclude: ["/hidden"] },
    });

    expect(endpoints.length).toBe(3);
    expect(endpoints.find((e) => e.path === "/hidden")).toBeUndefined();
  });

  it("filters in endpoints based on methods config", () => {
    const endpoints = parseSwagger(mockSwagger, {
      baseUrl: "http://api",
      endpoints: { methods: ["post"] },
    });

    expect(endpoints.length).toBe(1);
    expect(endpoints[0]?.method).toBe("POST");
  });
});
