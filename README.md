# Swagger AI Skill Generator (`swagger-ai`)

Turn your standard backend APIs into **LLM-optimized Skills**.

This library parses your Swagger/OpenAPI schemas and generates AI-friendly documentation (Markdown) and semantic routing maps (`llms.txt`). It answers the "What, When, How, Where, and Why" for your endpoints in a format that AI agents understand perfectly, minimizing token usage and preventing hallucinations.

**Perfect for:**

- AI Agents that need to seamlessly interact with your backend.
- Creating "AI SEO" for your API so autonomous models can discover and use your features.
- Generating ready-to-use `curl` commands directly from your specs.

## Installation

```bash
npm install swagger-ai
```

## Features

- **Token Optimization**: Strips down massive, deeply nested JSON schemas into simplified TypeScript-like interfaces. Support for **TOON (Token-Oriented Object Notation)** for even better token efficiency.
- **AI SEO (`llms.txt`)**: Automatically generates an `llms.txt` file which acts as a "robots.txt" or "sitemap" for AI models, providing high-level semantic routing.
- **cURL Generation**: Automatically constructs precise `curl` commands so the LLM doesn't have to guess how to format headers, auth, or paths.
- **Prompt Injection**: Allows you to strictly guide the LLM's behavior per endpoint (e.g., "Always double-check the ID format before calling this").
- **Framework Agnostic**: Works perfectly alongside Express, NestJS, fastify, Bun, or Deno—just pass the parsed Swagger JSON object before your server starts.

## Usage Guide

Add `swagger-ai` to your application startup scripts. It's designed as a one-time build step or a pre-serve hook.

### Example: Express

```typescript
import express from 'express';
import swaggerJsDoc from 'swagger-jsdoc';
import { generateAiSkills } from 'swagger-ai';

const app = express();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'My API', version: '1.0.0' },
  },
  apis: ['./routes/*.ts'], 
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

// GENERATE AI SKILLS BEFORE STARTING SERVER
async function bootstrap() {
  await generateAiSkills(swaggerSpec, {
    baseUrl: 'http://localhost:3000',
    outputDir: './public/.well-known/llms', // Serve this statically!
    outputMode: 'multiple', // creates an index and individual endpoint files
    prompts: {
      systemContext: "You are an AI assistant. Use these skills to interact with the database.",
      endpointContext: "Do not hallucinate parameters. Use the provided curl command."
    }
  });

  app.use('/.well-known/llms', express.static('public/.well-known/llms'));

  app.listen(3000, () => {
    console.log('Server and AI Skills running on port 3000');
  });
}

bootstrap();
```

### Example: NestJS

In your `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { generateAiSkills } from 'swagger-ai';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .build();
    
  // 1. Generate the standard Swagger Document
  const document = SwaggerModule.createDocument(app, config);
  
  // 2. Setup standard Swagger UI (Optional)
  SwaggerModule.setup('api', app, document);

  // 3. Generate AI Skills
  await generateAiSkills(document, {
    baseUrl: 'https://api.myproduction.com',
    outputDir: './ai-skills',
    endpoints: {
      // Exclude admin or dangerous routes from the AI
      exclude: [/\/admin.*/, '/users/delete'] 
    }
  });

  await app.listen(3000);
}
bootstrap();
```

## Configuration Options

The `generateAiSkills` function takes two arguments: the `swaggerDoc` object, and a `SkillConfig` object.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `baseUrl` | `string` | **Required** | The base URL the LLM should use in the generated curl commands. |
| `outputDir` | `string` | `'./llm-skills'` | Where the markdown files will be generated. |
| `outputMode` | `'single' \| 'multiple'` | `'multiple'` | `single` generates one massive file. `multiple` creates an `index.md`, `llms.txt`, and separate files per endpoint. |
| `format` | `'markdown' \| 'toon'` | `'markdown'` | `markdown` produces standard descriptive Markdown. `toon` produces a highly compact YAML-like format optimized for LLM token efficiency. |
| `endpoints.include` | `(string\|RegExp)[]` | `[]` (all) | Only generate skills for these paths. |
| `endpoints.exclude` | `(string\|RegExp)[]` | `[]` (none) | Do not generate skills for these paths. |
| `endpoints.methods` | `string[]` | `[]` (all) | Only include specific methods (e.g., `['get', 'post']`). |
| `prompts.systemContext` | `string` | `undefined` | Injected at the top of the index or single file to give the LLM global rules. |
| `prompts.endpointContext` | `string` | `undefined` | Injected into every endpoint definition to enforce strict usage rules. |

## Maximizing AI SEO

1. **Host `llms.txt` Publicly**: Serve the generated `llms.txt` file at `https://yourdomain.com/llms.txt` or `https://yourdomain.com/.well-known/llms.txt`. Standard autonomous web agents will look for this file first.
2. **Use Good Descriptions**: The parser relies heavily on your Swagger `summary` and `description` fields. Ensure these are written in natural language explaining *what* the endpoint achieves, not just what it returns.
3. **Use Tags for Routing**: The generator uses your Swagger `tags` to build Semantic Routing Hints. An endpoint tagged with `Products` will help the LLM know to look there if the user asks about merchandise.
