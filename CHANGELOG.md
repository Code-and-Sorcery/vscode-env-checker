# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-31

### Added

- Custom editor for `.env` and `.env.*` files with a formatted comparison view
- Table view of keys, values, and documentation from `#` comments (including blocks above each key)
- Compare two env files in the same folder (defaults: `.env` vs `.env.example` when available)
- Highlight variables present in only one file (`baseOnly`, `compareOnly`) or in both
- Commands: open formatted view, compare with example/related files, compare arbitrary files, reopen as plain text
- Explorer and editor title context actions for `.env` files
- Setting `envChecker.relatedFileNames` to tune which related filenames are scanned in the folder
- Dotenv language contribution for common `.env*` extensions
- French UI strings via `package.nls.fr.json`

[Unreleased]: https://github.com/Code-and-Sorcery/vscode-env-checker/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Code-and-Sorcery/vscode-env-checker/releases/tag/v0.1.0
