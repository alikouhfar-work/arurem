# Arurem

**A private, offline-first ledger for physical gold.** Track what you own by
weight, purity, vendor, and acquisition date — entirely in your browser. No
account, no server, no telemetry.

![Version](https://img.shields.io/badge/version-2.1.0-0a3d2e)

---

## What it does

- **Purity-adjusted totals.** Reports fine (24K-equivalent) gold, not just gross
  grams — because 100 g of 18K is not 100 g of gold.
- **Per-entry records.** Vendor, gross weight, karat, acquisition date, memo.
- **Search, filter, sort.** By vendor, memo, karat, or weight; filter by purity;
  sort by date, weight, or vendor.
- **List and grid views.**
- **JSON backup and restore.** Readable, versioned, yours. Imports are validated
  row by row and report what was skipped.
- **Offline PWA.** Installs to the home screen and works with no connection.
- **Light and dark themes**, following your system preference.

Everything lives in `localStorage` on your device. Export a backup regularly —
clearing browser data will delete your ledger.

## Stack

| Concern | Choice |
|---|---|
| Framework | React 19 |
| Build | Vite 8 (Rolldown) |
| Language | TypeScript 6 (strict) |
| Styling | Tailwind CSS 4 + design tokens |
| Primitives | shadcn/ui (radix-luma) + Radix UI |
| Icons | Lucide (single library) |
| Forms | react-hook-form + Zod |
| Animation | Motion |
| Toasts | react-hot-toast, custom renderer |
| Tests | Vitest + Testing Library (jsdom) |
| PWA | vite-plugin-pwa (Workbox) |

## Getting started

```bash
bun install
bun run dev        # http://localhost:5173
```

## Scripts

```bash
bun run dev        # dev server
bun run build      # typecheck + production build (with service worker)
bun run preview    # serve the production build
bun run lint       # eslint (includes architecture + type-placement rules)
bun run test       # vitest
bun run typecheck  # tsc only
```

All four gates (typecheck, lint, test, build) are expected to pass before a
commit. CI should run the same four.

## Project structure

Feature-sliced. Dependencies point one way: `app → features → shared → types`.

```
src/
├── app/           composition root (LedgerPage, React root)
├── features/
│   ├── ledger/    components, hooks, model (schema, behaviour, storage, backup)
│   └── summary/   aggregate metrics UI
├── shared/        ui primitives, hooks, lib, styles, assets
└── types/         every type declaration in the app
```

Full rationale and the enforced dependency rules: [`docs/architecture.md`](docs/architecture.md).

## Design system

Semantic colour tokens with a documented contrast contract, fluid type, real dark
mode. **No raw hex in components.** See [`docs/design-system.md`](docs/design-system.md)
for the token table, the measured contrast ratios, and the responsive behaviour at
each breakpoint.

## Conventions

These are enforced, not just documented:

- **No `interface`** — object shapes are `type` aliases.
- **No `enum`** — `as const` objects plus a derived union.
- **All type declarations live in `src/types/`.** Implementation files import
  their contracts; they do not declare them inline.
- **Component files are `PascalCase.tsx`; everything else is `camelCase.ts`.**
  Hooks are `useLedger.ts`, model modules `purchase.schema.ts`, types
  `purchase.ts`. Test files mirror what they cover (`LedgerPage.test.tsx`).
  Checked by `bun run check:naming`, which runs inside `lint` and `test`.
- `shared/` may not import `features/` or `app/`.
- A feature may not import `app/`.

## Documentation

| Doc | Contents |
|---|---|
| [`docs/design-system.md`](docs/design-system.md) | Tokens, contrast measurements, responsive rules, interaction model, accessibility status |
| [`docs/architecture.md`](docs/architecture.md) | Directory tree, dependency rules, state model, test map, bundle budget |
| [`docs/product-gap-analysis.md`](docs/product-gap-analysis.md) | Positioning, structural vulnerabilities, prioritised feature roadmap, monetisation, competitive analysis |
| `docs/audit/` | Before/after screenshots at mobile, tablet, and desktop in both themes |

## Version history

### v2.1.0

- Rebuilt on a tokenised design system (light + dark, AA-verified)
- Fixed a data bug that made editing previously-edited entries impossible
- Split "no entries" from "no search results"
- Full folder restructure into feature slices; types centralised in `src/types/`
- Added a 67-test suite covering domain logic, storage migration, and UI flows
- Dark mode applies before first paint (no flash on refresh)
- Typography: variable Inter (1.1 MB → 48 KB of font payload), woff2 only
- Accessibility: 15 axe violations → 0

### v2.0.0

- PWA support, font caching, Docker Compose

### v1.0.0 (April 2026)

- Initial Vite + React + TypeScript scaffold

## License

MIT
