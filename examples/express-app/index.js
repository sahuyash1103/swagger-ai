/**
 * swagger-ai express-app example
 *
 * This file demonstrates how to integrate swagger-ai into an Express server.
 * It generates AI skill documentation from your Swagger spec ONCE at startup,
 * then serves those files as static assets so LLMs can discover and read them.
 *
 * Run:
 *   npm install && npm start
 *
 * Then visit http://localhost:3000/llm-skills/llms.txt in your browser
 * (or point an LLM agent at http://localhost:3000/llm-skills/ to start discovery)
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { generateAiSkills } from "swagger-ai";
import { swaggerDoc } from "./swagger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────────
//  1. Generate AI skill docs at server startup
// ──────────────────────────────────────────────
await generateAiSkills(swaggerDoc, {
  baseUrl: `http://localhost:${PORT}`,
  outputDir: "./llm-skills",

  // Only expose public-facing endpoints to AI
  endpoints: {
    exclude: [/^\/internal/],
  },

  // Multi-file mode produces:
  //   llm-skills/
  //     llms.txt          ← AI SEO sitemap — serve this at /llms.txt
  //     index.md          ← Human-readable overview
  //     listUsers.md
  //     createUser.md
  //     getUserById.md
  outputMode: "multiple",

  // Inject system-level instructions for the AI agent consuming these docs
  prompts: {
    systemContext:
      "You are interacting with a REST API. Read the endpoint docs carefully before acting. Never guess parameters — use the provided shapes and examples.",
    endpointContext:
      "Fill in the cURL template exactly. Replace placeholder values with real data from the user's context.",
  },
});

// ──────────────────────────────────────────────
//  2. Serve the generated skill docs as static
//     files so AI agents can fetch them via HTTP
// ──────────────────────────────────────────────
app.use(
  "/llm-skills",
  express.static(path.join(__dirname, "llm-skills"), {
    extensions: ["md", "txt"],
  }),
);

// Convenience: redirect /llms.txt to the AI sitemap
app.get("/llms.txt", (_req, res) => {
  res.redirect("/llm-skills/llms.txt");
});

// ──────────────────────────────────────────────
//  3. Your normal API routes
// ──────────────────────────────────────────────
app.use(express.json());

app.get("/users", (_req, res) => {
  res.json([
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ]);
});

app.post("/users", (req, res) => {
  const newUser = { id: 3, ...req.body };
  res.status(201).json(newUser);
});

app.get("/users/:id", (req, res) => {
  res.json({ id: Number(req.params.id), name: "Alice", email: "alice@example.com" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`🤖 AI skill index → http://localhost:${PORT}/llms.txt`);
  console.log(`📚 Skill docs     → http://localhost:${PORT}/llm-skills/\n`);
});
