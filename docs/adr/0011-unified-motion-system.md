# ADR-0011: Unified Motion System & Retractable Three-Bar Rail

- **Status:** Accepted
- **Date:** 2026-11-21

## Context
Abrupt mount/unmount jumps feel harsh, while misplaced toggle buttons break spatial proximity (Fitts's Law). At the same time, continuous layout/blur animations degrade FPS on WebKitGTK under Linux Wayland.

## Decision
1. Anchor the retractable Navigator toggle **inside the top bar of the left Navigator rail** as a GPU-composited **morphing three-bar ("three slashes") button** (`☰` ↔ left-pointing retract cue `←`), compacting smoothly between a `44px` icon rail and `288px` expanded outliner with zero cursor travel.
2. Standardize motion tokens (`--ease-out-expo`, `--ease-in-out-smooth`, `--duration-micro`, `--duration-ui`, `--duration-panel`) across all surfaces: sliding mode/tool pills, single rotating chevrons, smooth grid-row disclosures, FloatingCard & popover reveals, interruptible `rAF` camera glides on discrete actions (`Focar`, `Ajustar`, `+`/`-`), and temporary `.theme-transitioning` cross-fades.
3. Keep direct canvas manipulation (`left`/`top` pin drag, wheel zoom, mouse pan) 100% transition-free and respect `prefers-reduced-motion`.
