# ADR-0009: Modular Dual-Theme Color Scheme (`dark` Graphite / `light` Off-White)

- **Status:** Accepted
- **Date:** 2026-11-20

## Context
Users work across varying lighting conditions and specimen backgrounds (black Canva PNGs, transparent cutouts, bright photos).

## Decision
Implement a 3-layer CSS token architecture (`primitives → semantic themes → component tokens`) toggled via `data-theme="dark" | "light"` using a symbolic sliding Sun/Moon switch. Dark mode uses matte graphite (`#16181A`), Light mode uses alabaster off-white (`#F6F7F5`), interest/interactive accents use emerald-green tones (`#34B383` dark / `#1F7A5A` light), and all 12 body systems have distinct dual-luminance-calibrated hues.
