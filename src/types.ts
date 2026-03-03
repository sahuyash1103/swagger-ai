export interface EndpointFilter {
  /** Array of paths to include. Can be exact matches or regex strings. If empty, includes all except excluded. */
  include?: (string | RegExp)[];
  /** Array of paths to exclude. Excludes override inclusions. */
  exclude?: (string | RegExp)[];
  /** Specific HTTP methods to include (e.g., ['get', 'post']). If empty, includes all. */
  methods?: string[];
}

export type OutputMode = "single" | "multiple";

export interface SkillPrompts {
  /** Prompt injected at the beginning of the skill document. */
  systemContext?: string;
  /** Prompt injected for each endpoint. */
  endpointContext?: string;
}

export interface SkillConfig {
  /** The output directory for the generated markdown files. Defaults to './llm-skills'. */
  outputDir?: string;
  /** Choose 'single' for one large file, or 'multiple' for index-based routing. Defaults to 'multiple'. */
  outputMode?: OutputMode;
  /** Filters for which endpoints to include. */
  endpoints?: EndpointFilter;
  /** Custom prompts to guide the LLM. */
  prompts?: SkillPrompts;
  /** The base URL for the API. */
  baseUrl: string;
}

export interface EndpointParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required: boolean;
  type: string;
  example?: any;
}

export interface EndpointBody {
  contentType: string;
  schemaDetails: any; // A simplified representation of the schema
  description?: string;
  example?: any;
}

export interface EndpointResponse {
  statusCode: string;
  description: string;
  schemaDetails?: any;
  example?: any;
}

export interface EndpointData {
  path: string;
  method: string;
  /** Unique ID for multi-file routing */
  operationId: string;
  summary?: string;
  description?: string;
  /** Security requirements (e.g., Bearer, API Key) */
  securityRequirements?: string[];
  parameters: EndpointParameter[];
  requestBody?: EndpointBody[];
  responses: EndpointResponse[];
  /** Semantic hints to route the LLM to related endpoints */
  semanticRoutingHints?: string[];
}
