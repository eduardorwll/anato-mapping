# ADR-0003: Deep Modules Enforced via `dependency-cruiser`

- **Status:** Accepted
- **Date:** 2026-11-20

## Context
Preventing shallow pass-through files and tangled cross-imports keeps the codebase easy to test and reuse in the future web Atlas.

## Decision
Organize TypeScript domain/UI logic as flat deep modules under `src/packages/<name>/`: root files are entry points, subfolders (`lib/`, `tests/`) are private, tests import only through entry points, and cycles are forbidden. Enforced via `.dependency-cruiser.cjs` in `npm run check`.
