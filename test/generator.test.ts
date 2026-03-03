import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { generateAiSkills } from "../src/index.js";
import { mockSwagger } from "./mockSwagger.js";

describe("Skill Generator", () => {
  const outDir = "./test-output";

  beforeEach(() => {
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("generates multiple files and index by default", async () => {
    await generateAiSkills(mockSwagger, {
      baseUrl: "http://api.mysite.com",
      outputDir: outDir,
      prompts: {
        systemContext: "You are an advanced agent.",
      },
    });

    expect(fs.existsSync(path.join(outDir, "index.md"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "llms.txt"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "getUsers.md"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "createUser.md"))).toBe(true);

    const indexContent = fs.readFileSync(
      path.join(outDir, "index.md"),
      "utf-8",
    );
    expect(indexContent).toContain("You are an advanced agent");
    expect(indexContent).toContain("[GET /users](./getUsers.md)");

    const llmsTxt = fs.readFileSync(path.join(outDir, "llms.txt"), "utf-8");
    expect(llmsTxt).toContain("Title: AI API Capabilities Index");
    expect(llmsTxt).toContain("[Docs]: ./getUsers.md");
    // Check semantic routing hints
    expect(llmsTxt).toContain("[Hints]: Related to generic User operations.");
  });

  it("generates a single file when outputMode is single", async () => {
    await generateAiSkills(mockSwagger, {
      baseUrl: "http://api.mysite.com",
      outputDir: outDir,
      outputMode: "single",
    });

    expect(fs.existsSync(path.join(outDir, "api-skills.md"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "getUsers.md"))).toBe(false);

    const content = fs.readFileSync(
      path.join(outDir, "api-skills.md"),
      "utf-8",
    );
    expect(content).toContain("## GET `/users`");
    expect(content).toContain("**Summary**: Get all users");
  });

  it("injects endpoint context and formats curl commands", async () => {
    await generateAiSkills(mockSwagger, {
      baseUrl: "http://api.mysite.com",
      outputDir: outDir,
      endpoints: { include: ["/users"] }, // Filter test
      prompts: {
        endpointContext: "Do exactly what this says.",
      },
    });

    const getUserContent = fs.readFileSync(
      path.join(outDir, "getUsers.md"),
      "utf-8",
    );

    // Auth Requirements
    expect(getUserContent).toContain("**Authentication Required**: bearerAuth");

    // Prompts
    expect(getUserContent).toContain(
      "> **AI Instruction**: Do exactly what this says.",
    );

    // cURL formatting
    expect(getUserContent).toContain(
      'curl -X GET "http://api.mysite.com/users"',
    );
    expect(getUserContent).toContain('-H "Authorization: Bearer <YOUR_TOKEN>"');
  });

  it("generates TOON format when requested", async () => {
    await generateAiSkills(mockSwagger, {
      baseUrl: "http://api.mysite.com",
      outputDir: outDir,
      format: "toon",
    });

    expect(fs.existsSync(path.join(outDir, "getUsers.toon"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "llms.txt"))).toBe(true);

    const toonContent = fs.readFileSync(
      path.join(outDir, "getUsers.toon"),
      "utf-8",
    );
    expect(toonContent).toContain("Endpoint: GET /users");
    expect(toonContent).toContain("Summary: Get all users");
    expect(toonContent).not.toContain("## GET"); // Should not have markdown headers

    const llmsTxt = fs.readFileSync(path.join(outDir, "llms.txt"), "utf-8");
    expect(llmsTxt).toContain("[Docs]: ./getUsers.toon");
  });
});
