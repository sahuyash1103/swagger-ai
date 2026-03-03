import type {
  EndpointData,
  EndpointParameter,
  EndpointBody,
  EndpointResponse,
  SkillConfig,
  SimplifiedSchema,
} from "./types.js";
import { shouldIncludeEndpoint } from "./filter.js";

export function parseSwagger(
  doc: Record<string, unknown>,
  config: SkillConfig,
): EndpointData[] {
  const endpoints: EndpointData[] = [];

  const paths = (doc.paths as Record<string, unknown>) || {};

  for (const [pathPattern, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;

    const methods = [
      "get",
      "post",
      "put",
      "delete",
      "patch",
      "options",
      "head",
    ];

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method];
      if (!operation) continue;

      if (!shouldIncludeEndpoint(pathPattern, method, config.endpoints)) {
        continue;
      }

      endpoints.push(
        parseOperation(
          pathPattern,
          method,
          operation as Record<string, unknown>,
          doc,
        ),
      );
    }
  }

  return endpoints;
}

function parseOperation(
  path: string,
  method: string,
  operation: Record<string, unknown>,
  globalDoc: Record<string, unknown>,
): EndpointData {
  const opId =
    (operation.operationId as string) ||
    `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_")}`;

  const params = (operation.parameters as Record<string, unknown>[]) || [];
  const parsedParams: EndpointParameter[] = params.map(
    (p: Record<string, unknown>) => parseParam(p, globalDoc),
  );

  const parsedBodies: EndpointBody[] = [];
  const requestBody = operation.requestBody as
    | Record<string, unknown>
    | undefined;
  if (requestBody && requestBody.content) {
    for (const [contentType, content] of Object.entries(
      requestBody.content as Record<string, unknown>,
    )) {
      const contentObj = content as Record<string, unknown>;
      parsedBodies.push({
        contentType,
        schemaDetails: simplifySchema(
          (contentObj.schema as Record<string, unknown>) || {},
          globalDoc,
        ),
        description: (operation.requestBody as Record<string, unknown>)
          .description as string,
        example:
          contentObj.example ??
          (contentObj.schema as Record<string, unknown> | undefined)?.example,
      });
    }
  }

  const parsedResponses: EndpointResponse[] = [];
  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(
      operation.responses as Record<string, unknown>,
    )) {
      const respObj = response as Record<string, unknown>;
      let schema: SimplifiedSchema = undefined;

      // Extract the first JSON-like schema we find to keep it simple
      let example: unknown = undefined;
      const respContent = respObj.content as
        | Record<string, unknown>
        | undefined;
      if (respContent && respContent["application/json"]) {
        const jsonContent = respContent["application/json"] as Record<
          string,
          unknown
        >;
        schema = simplifySchema(
          jsonContent.schema as Record<string, unknown>,
          globalDoc,
        );
        example =
          jsonContent.example ??
          (jsonContent.schema as Record<string, unknown> | undefined)?.example;
      }

      parsedResponses.push({
        statusCode,
        description: (respObj.description as string) || "",
        schemaDetails: schema,
        example,
      });
    }
  }

  // AI SEO: Derive Semantic Hints (simple mock based on tags for now)
  const semanticRoutingHints: string[] = [];
  if (operation.tags && Array.isArray(operation.tags)) {
    semanticRoutingHints.push(
      ...operation.tags.map(
        (t: string) => `Related to generic ${t} operations.`,
      ),
    );
  }

  // Security requirements: Try operation level first, then fallback to global. Simple extraction
  let securityRequirements: string[] = [];
  const sec = operation.security || globalDoc.security;
  if (sec && Array.isArray(sec)) {
    securityRequirements = (sec as Record<string, unknown>[]).map(
      (req: Record<string, unknown>) => Object.keys(req).join(", "),
    );
  }

  return {
    path,
    method: method.toUpperCase(),
    operationId: opId,
    summary: operation.summary as string,
    description: operation.description as string,
    securityRequirements,
    parameters: parsedParams,
    requestBody: parsedBodies,
    responses: parsedResponses,
    semanticRoutingHints,
  };
}

function parseParam(
  p: Record<string, unknown>,
  doc: Record<string, unknown>,
): EndpointParameter {
  // Simple resolution if it's a ref - real spec should use a robust resolver
  let actualParam = p;
  if (p.$ref) {
    actualParam =
      (resolveRef(p.$ref as string, doc) as Record<string, unknown>) || p;
  }

  return {
    name: actualParam.name as string,
    in: actualParam.in as "query" | "header" | "path" | "cookie",
    description: actualParam.description as string,
    required: !!actualParam.required,
    type: actualParam.schema
      ? ((actualParam.schema as Record<string, unknown>).type as string)
      : (actualParam.type as string) || "string",
    example:
      actualParam.example ??
      (actualParam.schema as Record<string, unknown> | undefined)?.example,
  };
}

/**
 * Strips down complex JSON schemas into a very simple, TypeScript-interface-like structure
 * to drastically reduce LLM token count while keeping semantic meaning.
 */
function simplifySchema(
  schema: Record<string, unknown> | undefined,
  doc: Record<string, unknown>,
  depth = 0,
): SimplifiedSchema {
  if (!schema || depth > 5) return undefined; // prevent infinite loops

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref as string, doc);
    return simplifySchema(resolved as Record<string, unknown>, doc, depth + 1);
  }

  if (schema.type === "object" && schema.properties) {
    const simplified: Record<string, SimplifiedSchema> = {};
    for (const [key, prop] of Object.entries(
      schema.properties as Record<string, Record<string, unknown>>,
    )) {
      simplified[key] = simplifySchema(prop, doc, depth + 1);
    }
    return simplified;
  }

  if (schema.type === "array" && schema.items) {
    return [
      simplifySchema(schema.items as Record<string, unknown>, doc, depth + 1),
    ];
  }

  // Literal value or primitive type
  if (schema.enum) {
    return (schema.enum as string[]).join(" | ");
  }

  return (schema.type as string) || "any";
}

function resolveRef(
  ref: string,
  doc: Record<string, unknown>,
): Record<string, unknown> | null {
  // Simplistic ref resolution e.g., "#/components/schemas/User"
  if (!ref.startsWith("#/")) return null;
  const parts = ref.substring(2).split("/");
  let current: Record<string, unknown> = doc;
  for (const part of parts) {
    if (!current[part]) return null;
    current = current[part] as Record<string, unknown>;
  }
  return current;
}
