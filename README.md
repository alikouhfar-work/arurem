# Arurem

**A private, offline-first ledger for physical gold.** Track what you own by
weight, purity, vendor, and acquisition date — entirely in your browser. No
account, no server, no telemetry, and live pricing in USD and Iranian toman.

![Version](https://img.shields.io/badge/version-2.2.0-0a3d2e)

---

## What it does

- **Purity-adjusted totals, led in 18K.** The headline weight is your holding
  restated in 18K — the karat Iranian buyers and sellers quote in — with the fine
  (24K) figure named in the description and gross weight underneath.
- **Live valuation in two currencies.** Your holding priced in USD and Iranian
  toman, recomputed as the price moves — USD from spot gold, toman from Tehran's
  own per-karat gram quotes. Each currency is labelled and formatted
  independently — toman as whole numbers, USD to the cent.
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

### The one network call

Prices come from two public, keyless endpoints: spot gold in USD, and Tehran's
own per-gram quotes for **18K and 24K** in toman. **Nothing about you or your
ledger is ever sent** — the requests carry no payload, no identifiers, and no
amount of gold. They are plain GETs for a public price, and the app works without
them: your data is local and complete regardless.

The two currencies are priced independently on purpose. Iranian gold carries an
import premium over spot that moves on its own, so converting one figure through
an exchange rate would produce a number matching neither market. USD is spot;
toman is the bazaar's actual quote, read from tgju's `geram18` and `geram24`
indicators — the same figures tgju.org prints.

**Toman vs rial.** tgju.org publishes **rial**; Arurem works in **toman**
(1/10 of a rial), which is how Iranians actually discuss prices. Every toman
figure is therefore paired with its rial value on screen, so you can check it
against tgju.org directly — `32,381,900 IRT/g` sits directly above
`323,819,000 ریال`.

If you would rather make no requests at all, the ledger still records, filters,
sorts, and exports exactly as before — the valuation simply shows a dash.

Two honest caveats:

- **Offline cold start shows dashes.** The PWA precaches the app, not the quote.
  With no network at all, the valuation is blank until the first successful fetch.
  The last price is deliberately *not* saved: a cached number reloaded hours later
  would look live and be wrong.
- **22K and Bullion are derived**, not published. Tehran quotes 18K and 24K per
  gram; the other two purities are scaled from 24K by fineness, which is the same
  ratio the market's own 18K/24K pair obeys to within rounding. If tgju ever
  publishes a direct 22K quote, it should be read instead.

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

### v2.2.0

- **Live dual-currency valuation.** Holdings priced in USD and IRT from live
  feeds, with per-leg staleness labels and a stale-preserving failure mode
  (a dropped request never blanks a number that was previously right)
- **18K-led hero weight.** The headline restates the holding in 18K, with the
  fine (24K) figure named in the description and gross weight underneath
- **Trend flash.** Green/red tint on a price change, driven by a keyed animation
  so consecutive same-direction ticks replay; suppressed under reduced motion
- **Toolbar alignment fixed.** Five control tokens (height, radius, gutter,
  border, inner radius) replace per-component values — the row previously mixed
  44px and 36px controls with four different corner radii
- **Zero layout shift.** Measured with a `layout-shift` observer; the one reflow
  CLS missed (hero card growing 17.7px on first quote) was found and fixed
- 112 tests (up from 68), including the feed parsers, the valuation maths, and a
  geometry contract that fails if a control reintroduces a bespoke height

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
