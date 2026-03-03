/**
 * Sample Swagger/OpenAPI document for demo purposes.
 * In a real app this would come from swagger-jsdoc, swagger-autogen, or a YAML file.
 */
export const swaggerDoc = {
  openapi: "3.0.0",
  info: { title: "Users API", version: "1.0.0", description: "Manage users." },
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 42 },
          name: { type: "string", example: "Alice" },
          email: { type: "string", example: "alice@example.com" },
        },
      },
    },
  },
  paths: {
    "/users": {
      get: {
        operationId: "listUsers",
        tags: ["Users"],
        summary: "List all users",
        description: "Returns a paginated list of all registered users.",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Maximum number of users to return",
            required: false,
            schema: { type: "integer", example: 20 },
          },
        ],
        responses: {
          "200": {
            description: "A list of users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/User" },
                },
                example: [{ id: 1, name: "Alice", email: "alice@example.com" }],
              },
            },
          },
          "401": { description: "Unauthorized — bearer token missing or invalid" },
        },
      },
      post: {
        operationId: "createUser",
        tags: ["Users"],
        summary: "Create a new user",
        description: "Registers a new user account.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
              example: { name: "Bob", email: "bob@example.com" },
            },
          },
        },
        responses: {
          "201": {
            description: "User created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
                example: { id: 2, name: "Bob", email: "bob@example.com" },
              },
            },
          },
          "400": { description: "Validation error — required fields missing" },
        },
      },
    },
    "/users/{id}": {
      get: {
        operationId: "getUserById",
        tags: ["Users"],
        summary: "Get a user by ID",
        description: "Retrieves a single user by their unique ID.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "The user's unique integer ID",
            schema: { type: "integer", example: 42 },
          },
        ],
        responses: {
          "200": {
            description: "The user was found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
                example: { id: 42, name: "Alice", email: "alice@example.com" },
              },
            },
          },
          "404": { description: "User not found" },
        },
      },
    },
  },
};
