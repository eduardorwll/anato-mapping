# ADR-0002: Linux Wayland & Cross-OS Compatibility Contract

- **Status:** Accepted
- **Date:** 2026-11-20

## Context
Tauri v2 uses WebKitGTK 4.1 on Linux, which can suffer blank windows or protocol Error 71 on strict Wayland compositors (Hyprland/Sway) and NVIDIA drivers via DMA-BUF. Asset-protocol scopes also vary across OS paths.

## Decision
1. At Linux startup in `src-tauri/src/wayland.rs` (single-threaded before Tauri init), set `WEBKIT_DISABLE_DMABUF_RENDERER=1` **only when unset**, preserving explicit user overrides (`WEBKIT_DISABLE_DMABUF_RENDERER=0`).
2. Keep native window decorations (`decorations: true`) so Hyprland/tiling WMs and Windows manage borders reliably.
3. Stream local Specimen Image bytes via `tauri::ipc::Response` (raw binary `ArrayBuffer`) instead of `asset://` scope workarounds, ensuring Unicode filenames and Windows/Linux paths work identically.
