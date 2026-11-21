# ADR-0001: Tauri v2 (Rust) + React 19 + TypeScript + Tailwind v4

- **Status:** Accepted
- **Date:** 2026-11-20

## Context
UFPel anatomy curators need a lightweight offline desktop executable for Linux and Windows while the same CS team will later build the official web **Atlas Anatômico Digital**.

## Decision
Use **Tauri v2** with a **Rust** backend and a **React 19 + TypeScript + Tailwind v4** frontend.

## Consequences
- Native ~10 MB executable with zero cloud uploads while ethical approval is pending.
- 100% reuse of `atlas-canvas`, `category-tree`, `viewport-math`, and `annotation-schema` packages in the future web Atlas.
- Cross-platform Linux/Windows builds run cleanly on GitHub Actions.
