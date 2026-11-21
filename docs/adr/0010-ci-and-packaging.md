# ADR-0010: Cross-Platform CI & Per-User Packaging

- **Status:** Accepted
- **Date:** 2026-11-20

## Context
Developers work on Linux (Arch/Ryoku) while colleagues use Windows laptops and UFPel lab PCs without admin privileges.

## Decision
Run GitHub Actions CI on `ubuntu-22.04` and `windows-latest`. Build Linux `.AppImage` and `.deb` on `ubuntu-22.04` for broad `glibc` compatibility, and Windows per-user NSIS `.exe` (`installMode: currentUser`) requiring no elevation.
