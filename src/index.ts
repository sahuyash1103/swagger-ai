import { parseSwagger } from "./parser.js";
import { generateContent } from "./generator.js";
import type { SkillConfig } from "./types.js";

export * from "./types.js";

/**
 * Parses a Swagger/OpenAPI document and generates token-optimized AI Skill markdown files.
 * Intended to be run at server startup or as a part of a build script.
 *
 * @param swaggerDoc The parsed JSON object of your Swagger/OpenAPI spec.
 * @param config Configuration options to shape the LLM output.
 */
export async function generateAiSkills(
  swaggerDoc: any,
  config: SkillConfig,
): Promise<void> {
  if (!swaggerDoc || typeof swaggerDoc !== "object") {
    throw new Error("Invalid swagger document provided");
  }

  const endpoints = parseSwagger(swaggerDoc, config);

  if (endpoints.length === 0) {
    console.warn(
      "[swagger-ai-skill] No endpoints matched the provided filters.",
    );
    return;
  }

  await generateContent(endpoints, config);
  console.log(
    `[swagger-ai-skill] Successfully generated AI skill documentation for ${endpoints.length} endpoints at ${config.outputDir || "./llm-skills"}`,
  );
}
