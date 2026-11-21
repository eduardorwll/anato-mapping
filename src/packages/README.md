# Deep Modules (`src/packages/`)

Every immediate folder under `src/packages/<name>/` is a **deep module**: rich behavior behind a narrow public surface.

```text
src/packages/<name>/
  index.ts        # Public entry point (import this from outside)
  formats.ts      # Optional additional entry point (prefer small entry points over barrels)
  lib/            # Private implementation (hidden from other packages, app code, and tests)
  tests/          # Co-located tests (import ONLY through entry points, never ../lib/*)
```

## Rules (enforced by `npm run lint:boundaries`)

1. **Entry-point boundary from app:** App code may import only a package's root entry points, never anything inside a subfolder.
2. **Entry-point boundary across packages:** Files inside a package may import each other freely, but may import other packages only through their root entry points.
3. **Tests through entry points:** Files in `<pkg>/tests/` exercise the package through its root entry points (and their own `tests/` fixtures), never any package's `lib/` internals.
4. **No cycles:** Circular dependencies are forbidden everywhere.

**Avoid barrel files:** Do not create giant `index.ts` files that re-export every internal symbol. Expose cohesive, small root entry points instead.

Run boundary checks:

```bash
npm run lint:boundaries
```
