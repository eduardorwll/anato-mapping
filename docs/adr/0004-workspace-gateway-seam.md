# ADR-0004: Dual-Adapter `WorkspaceGateway` Seam

- **Status:** Accepted
- **Date:** 2026-11-20

## Context
Curators work with both single Specimen Images and multi-view folders, and developers need browser dev/test ergonomics plus future web reuse.

## Decision
Isolate OS dialogs, folder scanning, image loading, and `.json` / category persistence behind one `WorkspaceGateway` interface with two real adapters: `TauriWorkspaceAdapter` (Rust IPC) and `BrowserWorkspaceAdapter` (File API).
