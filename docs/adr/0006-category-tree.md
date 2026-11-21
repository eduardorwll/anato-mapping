# ADR-0006: Modular Hierarchical Category Tree

- **Status:** Accepted
- **Date:** 2026-11-20

## Context
The Atlas starts with the skeletal system but will expand to all human body systems and curator-specific sub-classifications.

## Decision
Implement a parent/child Category Tree seeded with built-in root `Sistemas` and 12 Portuguese body systems (`Esquelético`, `Articular`, `Muscular`, `Nervoso`, `Cardiovascular`, `Respiratório`, `Digestório`, `Urinário`, `Reprodutor`, `Endócrino`, `Linfático`, `Tegumentar`). Users may create/rename/recolor/delete custom parent or child nodes anywhere in the tree. Custom nodes inherit parent colors unless overridden, prevent cycles, persist locally, and referenced custom subtrees are embedded in exported `.json` documents for cross-PC portability.
