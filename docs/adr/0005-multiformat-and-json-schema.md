# ADR-0005: Multi-Format Images & OS-Agnostic JSON `v1.0.0`

- **Status:** Accepted
- **Date:** 2026-11-20

## Context
Laboratory images may arrive as PNG cutouts, camera JPEGs, WebP/AVIF exports, BMP/GIF, or SVGs. JSON files are shared via Google Drive across Windows and Linux.

## Decision
Maintain a canonical `SUPPORTED_IMAGE_EXTENSIONS` list (`png`, `jpg`, `jpeg`, `webp`, `avif`, `bmp`, `gif`, `svg`) in both Rust and TypeScript. Export UTF-8 (no BOM), LF (`\n`) JSON storing `fileName` only (never absolute OS paths), percentage coordinates `(x, y)` in `[0.00, 100.00]`, and normalize minimal/legacy JSONs gracefully on import.
