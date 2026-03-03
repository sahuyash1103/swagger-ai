import * as fs from "fs";
import * as path from "path";
import { encode as toonEncode } from "@toon-format/toon";
import type { EndpointData, SkillConfig } from "./types.js";

/**
 * Main generator entrypoint
 */
export async function generateContent(
  endpoints: EndpointData[],
  config: SkillConfig,
): Promise<void> {
  const outDir = config.outputDir || "./llm-skills";

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const mode = config.outputMode || "multiple";

  if (mode === "single") {
    await generateSingleFile(endpoints, config, outDir);
  } else {
    await generateMultipleFiles(endpoints, config, outDir);
  }
}

async function generateSingleFile(
  endpoints: EndpointData[],
  config: SkillConfig,
  outDir: string,
): Promise<void> {
  let content = `# AI API Skills: ${config.baseUrl}\n\n`;
  if (config.prompts?.systemContext) {
    content += `> **System Context:** ${config.prompts.systemContext}\n\n`;
  }

  for (const ep of endpoints) {
    content +=
      config.format === "toon"
        ? generateEndpointToon(ep, config)
        : generateEndpointMarkdown(ep, config);
    content += `\n---\n\n`;
  }

  const fileName =
    config.format === "toon" ? "api-skills.toon" : "api-skills.md";
  fs.writeFileSync(path.join(outDir, fileName), content);
}

async function generateMultipleFiles(
  endpoints: EndpointData[],
  config: SkillConfig,
  outDir: string,
): Promise<void> {
  const ext = config.format === "toon" ? "toon" : "md";

  // 1. Generate individual endpoint files
  for (const ep of endpoints) {
    const content =
      config.format === "toon"
        ? generateEndpointToon(ep, config)
        : generateEndpointMarkdown(ep, config);
    fs.writeFileSync(path.join(outDir, `${ep.operationId}.${ext}`), content);
  }

  // 2. Generate standard index.md
  let indexContent = `# API Skills Index\n\n`;
  if (config.prompts?.systemContext) {
    indexContent += `> **System Context:** ${config.prompts.systemContext}\n\n`;
  }

  for (const ep of endpoints) {
    indexContent += `- [${ep.method} ${ep.path}](./${ep.operationId}.${ext}) - ${ep.summary || ep.operationId}\n`;
  }

  fs.writeFileSync(path.join(outDir, "index.md"), indexContent);

  // 3. Generate llms.txt (AI SEO Sitemap)
  let llmsTxt = `Title: AI API Capabilities Index\nBase URL: ${config.baseUrl}\n\n`;
  llmsTxt += `This file provides semantic routing. Read the specific files to execute actions.\n\n`;

  for (const ep of endpoints) {
    llmsTxt += `[Endpoint]: ${ep.method} ${ep.path}\n`;
    llmsTxt += `[Action]: ${ep.summary || ep.operationId}\n`;
    if (ep.semanticRoutingHints && ep.semanticRoutingHints.length > 0) {
      llmsTxt += `[Hints]: ${ep.semanticRoutingHints.join(" ")}\n`;
    }
    llmsTxt += `[Docs]: ./${ep.operationId}.${ext}\n\n`;
  }

  fs.writeFileSync(path.join(outDir, "llms.txt"), llmsTxt);
}

function generateEndpointMarkdown(
  ep: EndpointData,
  config: SkillConfig,
): string {
  let md = `## ${ep.method} \`${ep.path}\`\n\n`;

  if (ep.summary) md += `**Summary**: ${ep.summary}\n\n`;
  if (ep.description) md += `**Description**: ${ep.description}\n\n`;

  if (config.prompts?.endpointContext) {
    md += `> **AI Instruction**: ${config.prompts.endpointContext}\n\n`;
  }

  if (ep.securityRequirements && ep.securityRequirements.length > 0) {
    md += `**Authentication Required**: ${ep.securityRequirements.join(", ")}\n\n`;
  }

  // Generate Curl template for immediate LLM use without guessing
  md += `### Ready-to-use cURL\n`;
  md += "```bash\n";
  let curl = `curl -X ${ep.method} "${config.baseUrl}${ep.path}"`;
  if (ep.securityRequirements && ep.securityRequirements.length > 0) {
    curl += ` \\\n  -H "Authorization: Bearer <YOUR_TOKEN>"`; // Generic fallback
  }
  if (ep.requestBody && ep.requestBody.length > 0) {
    const req = ep.requestBody[0];
    if (req?.contentType) {
      curl += ` \\\n  -H "Content-Type: ${req.contentType}"`;
    }
    curl += ` \\\n  -d '{}'`; // Instruct the LLM to fill this
  }
  md += curl + "\n```\n\n";

  // Parameters
  if (ep.parameters.length > 0) {
    md += `### Parameters\n`;
    for (const p of ep.parameters) {
      let line = `- **\`${p.name}\`** (${p.in}, ${p.type})${p.required ? " *Required*" : ""}: ${p.description || ""}`;
      if (p.example !== undefined) {
        line += ` — *Example:* \`${JSON.stringify(p.example)}\``;
      }
      md += line + "\n";
    }
    md += "\n";
  }

  // Request Body
  if (ep.requestBody && ep.requestBody.length > 0) {
    md += `### Request Body\n`;
    for (const body of ep.requestBody) {
      if (body.contentType) md += `- Content-Type: \`${body.contentType}\`\n`;
      if (body.description) md += `- Description: ${body.description}\n`;
      if (body.schemaDetails) {
        md += `\n**Expected Shape:**\n\`\`\`json\n${JSON.stringify(body.schemaDetails, null, 2).substring(0, 1000)}\n\`\`\`\n\n`;
      }
      if (body.example !== undefined) {
        md += `**Example:**\n\`\`\`json\n${JSON.stringify(body.example, null, 2).substring(0, 500)}\n\`\`\`\n\n`;
      }
    }
  }

  // Responses
  if (ep.responses && ep.responses.length > 0) {
    md += `### Expected Responses\n`;
    for (const res of ep.responses) {
      md += `- **${res.statusCode}**: ${res.description}\n`;
      if (res.example !== undefined) {
        md += `  - *Example:* \`${JSON.stringify(res.example)}\`\n`;
      }
    }
    md += "\n";
  }

  return md;
}

/**
 * Generates TOON (Token-Oriented Object Notation) for an endpoint.
 * Highly optimized for token efficiency by using a YAML-like structure
 * and stripping away Markdown verbosity.
 */
function generateEndpointToon(ep: EndpointData, config: SkillConfig): string {
  let toon = `Endpoint: ${ep.method} ${ep.path}\n`;
  if (ep.summary) toon += `Summary: ${ep.summary}\n`;

  if (config.prompts?.endpointContext) {
    toon += `Instruction: ${config.prompts.endpointContext}\n`;
  }

  if (ep.securityRequirements && ep.securityRequirements.length > 0) {
    toon += `Auth: ${ep.securityRequirements.join(",")}\n`;
  }

  // Curl - still keeping it but maybe more compact
  const reqBody = ep.requestBody?.[0];
  let curl = `curl -X ${ep.method} "${config.baseUrl}${ep.path}"`;
  if (ep.securityRequirements?.length)
    curl += ` -H "Authorization: Bearer <TOKEN>"`;
  if (reqBody?.contentType)
    curl += ` -H "Content-Type: ${reqBody.contentType}"`;
  if (reqBody) curl += ` -d '{}'`;
  toon += `Curl: ${curl}\n`;

  if (ep.parameters.length > 0) {
    toon += `Params:\n`;
    for (const p of ep.parameters) {
      toon += `  - ${p.name} (${p.in},${p.type})${p.required ? "*" : ""}: ${p.description || ""}`;
      if (p.example !== undefined) toon += ` Ex: ${toonEncode(p.example)}`;
      toon += "\n";
    }
  }

  if (ep.requestBody && ep.requestBody.length > 0) {
    toon += `Body:\n`;
    for (const body of ep.requestBody) {
      if (body.contentType) toon += `  Type: ${body.contentType}\n`;
      if (body.schemaDetails) {
        toon += `  Shape: ${toonEncode(body.schemaDetails)}\n`;
      }
    }
  }

  if (ep.responses && ep.responses.length > 0) {
    toon += `Responses:\n`;
    for (const res of ep.responses) {
      toon += `  - ${res.statusCode}: ${res.description}`;
      if (res.example !== undefined) toon += ` Ex: ${toonEncode(res.example)}`;
      toon += "\n";
    }
  }

  return toon;
}
