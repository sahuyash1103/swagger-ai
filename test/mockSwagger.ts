export const mockSwagger = {
  openapi: "3.0.0",
  info: {
    title: "Mock API",
    version: "1.0.0",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/users": {
      get: {
        operationId: "getUsers",
        summary: "Get all users",
        description: "Returns a list of users.",
        tags: ["User"],
        responses: {
          "200": {
            description: "A list of users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/User",
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "createUser",
        summary: "Create a user",
        tags: ["User"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/User",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "User created",
          },
          "400": {
            description: "Invalid input",
          },
        },
      },
    },
    "/users/{id}": {
      get: {
        operationId: "getUserById",
        summary: "Get a specific user",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "The user" },
        },
      },
    },
    "/hidden": {
      get: {
        operationId: "hiddenRoute",
        description: "Should be filtered out",
        responses: { "200": { description: "Ok" } },
      },
    },
  },
};
