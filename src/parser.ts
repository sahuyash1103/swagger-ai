import type {
  EndpointData,
  EndpointParameter,
  EndpointBody,
  EndpointResponse,
  SkillConfig,
} from "./types.js";
import { shouldIncludeEndpoint } from "./filter.js";

export function parseSwagger(doc: any, config: SkillConfig): EndpointData[] {
  const endpoints: EndpointData[] = [];

  const paths = doc.paths || {};

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
      const operation = (pathItem as any)[method];
      if (!operation) continue;

      if (!shouldIncludeEndpoint(pathPattern, method, config.endpoints)) {
        continue;
      }

      endpoints.push(parseOperation(pathPattern, method, operation, doc));
    }
  }

  return endpoints;
}

function parseOperation(
  path: string,
  method: string,
  operation: any,
  globalDoc: any,
): EndpointData {
  const opId =
    operation.operationId ||
    `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_")}`;

  const params = operation.parameters || [];
  const parsedParams: EndpointParameter[] = params.map((p: any) =>
    parseParam(p, globalDoc),
  );

  const parsedBodies: EndpointBody[] = [];
  if (operation.requestBody && operation.requestBody.content) {
    for (const [contentType, content] of Object.entries(
      operation.requestBody.content,
    )) {
      const contentObj = content as any;
      parsedBodies.push({
        contentType,
        schemaDetails: simplifySchema(contentObj.schema || {}, globalDoc),
        description: operation.requestBody.description,
        example: contentObj.example ?? contentObj.schema?.example,
      });
    }
  }

  const parsedResponses: EndpointResponse[] = [];
  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      const respObj = response as any;
      let schema: any = undefined;

      // Extract the first JSON-like schema we find to keep it simple
      let example: any = undefined;
      if (respObj.content && respObj.content["application/json"]) {
        const jsonContent = respObj.content["application/json"];
        schema = simplifySchema(jsonContent.schema, globalDoc);
        example = jsonContent.example ?? jsonContent.schema?.example;
      }

      parsedResponses.push({
        statusCode,
        description: respObj.description || "",
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
    securityRequirements = sec.map((req: any) => Object.keys(req).join(", "));
  }

  return {
    path,
    method: method.toUpperCase(),
    operationId: opId,
    summary: operation.summary,
    description: operation.description,
    securityRequirements,
    parameters: parsedParams,
    requestBody: parsedBodies,
    responses: parsedResponses,
    semanticRoutingHints,
  };
}

function parseParam(p: any, doc: any): EndpointParameter {
  // Simple resolution if it's a ref - real spec should use a robust resolver
  let actualParam = p;
  if (p.$ref) {
    actualParam = resolveRef(p.$ref, doc) || p;
  }

  return {
    name: actualParam.name,
    in: actualParam.in,
    description: actualParam.description,
    required: !!actualParam.required,
    type: actualParam.schema
      ? actualParam.schema.type
      : actualParam.type || "string",
    example: actualParam.example ?? actualParam.schema?.example,
  };
}

/**
 * Strips down complex JSON schemas into a very simple, TypeScript-interface-like structure
 * to drastically reduce LLM token count while keeping semantic meaning.
 */
function simplifySchema(schema: any, doc: any, depth = 0): any {
  if (!schema || depth > 5) return undefined; // prevent infinite loops

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, doc);
    return simplifySchema(resolved, doc, depth + 1);
  }

  if (schema.type === "object" && schema.properties) {
    const simplified: Record<string, any> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      simplified[key] = simplifySchema(prop, doc, depth + 1);
    }
    return simplified;
  }

  if (schema.type === "array" && schema.items) {
    return [simplifySchema(schema.items, doc, depth + 1)];
  }

  // Literal value or primitive type
  if (schema.enum) {
    return schema.enum.join(" | ");
  }

  return schema.type || "any";
}

function resolveRef(ref: string, doc: any): any {
  // Simplistic ref resolution e.g., "#/components/schemas/User"
  if (!ref.startsWith("#/")) return null;
  const parts = ref.substring(2).split("/");
  let current = doc;
  for (const part of parts) {
    if (!current[part]) return null;
    current = current[part];
  }
  return current;
}
