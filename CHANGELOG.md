# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-03-03

### Added

- **TOON (Token-Oriented Object Notation)** support: A highly compact, YAML-like output format designed for maximum token efficiency in LLM contexts.
- New `format` option in `SkillConfig` to toggle between `markdown` (default) and `toon`.
- Automatic `.toon` file extension handling for single and multiple file output modes.
- `prepublishOnly` lifecycle hook to ensure builds and tests pass before publishing.

### Changed

- Improved type safety across the library:
  - Replaced `any` with `unknown` and `Record<string, unknown>` for better developer experience and reliability.
  - Introduced `SimplifiedSchema` recursive type for schema details.
- Updated `package.json` with comprehensive metadata (keywords, repository, description).
- Enhanced `llms.txt` generation to support new file extensions.

### Fixed

- Resolved all ESLint `no-explicit-any` warnings.
- Fixed several TypeScript structural errors related to strict object indexing.
