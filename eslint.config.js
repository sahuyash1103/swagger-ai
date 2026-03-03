// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Ignore built output, dependencies, and test/example plain JS files
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "test-output/**",
      "examples/**",
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript-aware rules for all src/ and test/ TypeScript files
  ...tseslint.configs.recommended,

  {
    rules: {
      // Allow `any` in controlled circumstances — the parser works with raw Swagger
      // objects that are inherently untyped, so suppress the blanket ban here.
      "@typescript-eslint/no-explicit-any": "warn",

      // Unused vars are errors (helps catch dead code early)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Prefer `const` over `let` where possible
      "prefer-const": "error",

      // Require === over == for strict equality
      eqeqeq: ["error", "always"],

      // No console.log in src (use console.warn for intended messages)
      // Turned off for this library since we intentionally log progress via console.log
      "no-console": "off",
    },
  },
);
