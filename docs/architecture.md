# Arurem — Architecture

Feature-sliced, with dependency direction enforced by lint rather than convention.

---

## 1. The tree

```
arurem/
├── src/
│   ├── app/                          # composition root — nothing else
│   │   ├── main.tsx                  # React root, Toaster, CSS import
│   │   └── LedgerPage.tsx           # the only component that composes features
│   │
│   ├── features/                     # vertical slices, one per user capability
│   │   ├── ledger/
│   │   │   ├── components/           # presentational only; props in, JSX out
│   │   │   │   ├── LedgerHeader.tsx
│   │   │   │   ├── LedgerToolbar.tsx
│   │   │   │   ├── LedgerEntry.tsx          (row + card)
│   │   │   │   ├── LedgerEntryList.tsx     (+ the two empty states)
│   │   │   │   ├── EntryForm.tsx
│   │   │   │   ├── EntrySheet.tsx
│   │   │   │   └── DeleteDialog.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLedger.ts       # reducer + persistence + selectors wiring
│   │   │   │   └── usePurchaseForm.ts # react-hook-form + zod binding
│   │   │   └── model/
│   │   │       ├── purchase.schema.ts # zod schemas (runtime values)
│   │   │       ├── purchase.ts        # behaviour: create, applyDraft, fineGoldGrams
│   │   │       ├── selectors.ts       # computeStats, filterPurchases, sortPurchases
│   │   │       ├── storage.ts         # the ONLY module that knows localStorage
│   │   │       └── backup.ts          # export / import / validation
│   │   ├── market/
│   │   │   └── components/
│   │   │       └── PriceTicker.tsx    # live spot strip: USD/g, IRT/g, as-of stamps
│   │   └── summary/
│   │       └── components/
│   │           └── LedgerSummary.tsx # hero metric + dual-currency valuation
│   │
│   ├── shared/                       # the bottom layer: no feature imports
│   │   ├── components/
│   │   │   └── AppShell.tsx          # page frame, skip link, brand mark
│   │   ├── hooks/
│   │   │   ├── useTheme.ts
│   │   │   ├── useMarketRates.ts      # 30s poll, visibility-gated, stale-preserving
│   │   │   └── useValueFlash.ts       # trend direction + animation nonce
│   │   ├── lib/
│   │   │   ├── format.ts              # Intl number/date formatting
│   │   │   ├── money.ts               # USD/toman formatting, locale separation
│   │   │   ├── spotFeed.ts            # the only module that knows a price provider
│   │   │   ├── valuation.ts           # grams → money, trend detection
│   │   │   ├── theme.ts               # resolveTheme, storage key
│   │   │   └── utils.ts               # cn()
│   │   ├── styles/
│   │   │   ├── tokens.css
│   │   │   └── globals.css
│   │   ├── assets/fonts/              # woff2 only, per-family CSS
│   │   └── ui/                        # shadcn primitives + app primitives
│   │       ├── AlertDialog.tsx  Calendar.tsx   Input.tsx     Sheet.tsx
│   │       ├── Button.tsx        Card.tsx       Textarea.tsx
│   │       ├── Dialog.tsx        Field.tsx      Popover.tsx      Select.tsx
│   │       ├── ThemeToggle.tsx  toast.tsx      toast-Card.tsx
│   │
│   ├── constants/
│   │   └── toolbar.ts                 # sort + view option lists (no JSX)
│   │
│   ├── types/                         # EVERY type declaration lives here
│   │   ├── market.ts                   # MarketQuote, MarketRates, GoldValuation, PriceTrend
│   │   ├── purchase.ts                # Purity, Purchase, PurchaseDraft, PurchaseFormValues
│   │   ├── ledger.ts                  # ViewMode, SortKey, LedgerState, LedgerAction, …
│   │   ├── storage.ts                 # StorageEnvelope, LoadResult
│   │   ├── backup.ts                  # ExportPayload, ImportResult
│   │   ├── components.ts              # every component's props
│   │   └── ui.ts                      # field/toast/theme contracts
│   │
│   ├── test/setup.ts
│   └── vite-env.d.ts
│
├── docs/
│   ├── design-system.md
│   ├── architecture.md
│   ├── product-gap-analysis.md
│   └── audit/{baseline,after}/*.png
└── public/icons/
```

### File naming

- **Components → `PascalCase.tsx`.** A file is a component if it exports one.
  `Toast.tsx` is the exception that proves the rule: it exports only functions
  (`showSuccess` / `showError` / `showInfo`), so it stays camelCase.
- **Everything else → `camelCase.ts`.** Hooks (`useLedger.ts`), model modules
  (`purchase.schema.ts`), libs (`format.ts`), and types (`purchase.ts`).
- Multi-word suffixes keep their dots: `purchase.schema.ts`, `.test.tsx`.
- Enforced by `scripts/checkFileNaming.ts` in the test run — a new
  `ledger-row.tsx` or `AppShell-helpers.ts` fails CI.

## 2. Dependency rules

```
app ──→ features ──→ shared ──→ types
 └──────→ shared          └────→ types
```

| Rule | Enforced by |
|---|---|
| `shared/` may not import `features/` or `app/` | `no-restricted-imports` on `src/shared/**` |
| A feature may not import `app/` | `no-restricted-imports` on `src/features/**` |
| Type declarations only in `src/types/**` | `no-restricted-syntax` on `TSTypeAliasDeclaration` |
| No `interface`, ever | `no-restricted-syntax` on `TSInterfaceDeclaration` |
| No `enum` (use `as const` + derived union) | `no-restricted-syntax` on `TSEnumDeclaration` |

The last three are new and deliberate: they are your convention, encoded so it
cannot rot. Verified — eslint reports *"Use a `type` alias instead of
`interface`"* and *"Declare types in src/types/ and import them here"* on a probe
file.

## 3. The type-import direction (why schemas are separate)

`src/types/purchase.ts` derives every type from the zod schemas:

```ts
export type Purchase = z.infer<typeof purchaseSchema>;
```

That is a compile-time-only import, so `types/` adds no runtime edge and stays at
the bottom of the graph. But a schema is a *value*. Putting schemas in `types/`
would make `types/` import from `features/`, inverting the graph. Hence:

```
model/purchase.schema.ts   values (zod)
        ↓ type-only
types/purchase.ts          types (z.infer)
        ↓ type-only
model/purchase.ts          behaviour (createPurchase, fineGoldGrams)
        ↓
components                 render
```

## 4. State

```
                 ┌───────────────┐
  UI event  ───→ │    reducer    │ ──→ new state ──→ useMemo selectors
 (create/update  │  (pure, 7     │                     ├ computeStats
  /delete/undo/  │   actions)    │                     └ filter → sort
  import)        └───────┬───────┘
                         │
                         ↓  effect (skips first run, skips identical payload)
                  model/storage.ts
                         ↓
                    localStorage
```

### Market data (separate from ledger state)

The ledger is the user's data; market data is not. It lives outside the reducer
because it is neither authored by the user nor persisted with the ledger — a
cached price in `localStorage` would be a stale number wearing a fresh timestamp
after the next reload.

```
useMarketRates (one instance, mounted in LedgerPage)
   ├─ 30s interval, paused when document.visibilityState !== 'visible'
   ├─ fetchMarketLegs()  ← spotFeed.ts, the only provider-aware module
   │     USD spot ─┐
   │     IRT karats ┴─ parallel, independent failure
   ├─ commit only if the quote actually changed (field-by-field compare)
   └─ failure ⇒ keep last quote, status 'stale' (never blank)
        ↓
   valuation.ts (pure) ──→ LedgerSummary + PriceTicker
```

`LedgerPage` owns the single subscription and passes the quote down. Mounting
the hook per card would open one interval each and let two cards display
different spot prices — which is the failure mode this shape exists to prevent.

There is still **no TanStack Query**, and the reasoning has only strengthened:
there is now one asynchronous data source, and it is a fire-and-forget poll whose
entire state machine is four statuses and one cached value. A query cache would
add fetishised abstraction (invalidation keys, garbage collection, retry
defaults) around a hook that is 90 lines and fully tested.

- **One reducer**, `ledgerReducer`, pure and unit-tested. `useLedger` is the only
  thing that touches storage. Components dispatch intent, never `setState` — so
  adding an activity log later is a reducer concern, not a UI rewrite.
- **Undo is a first-class action** (`restore` with index), not a UI trick.
- **Derived state is never stored.** `computeStats` runs in a `useMemo` over
  `purchases`; there is no denormalised total to drift. Valuations are likewise
  derived on render from `(fineGrams, quote)` — never cached, so a price change
  and a weight change cannot produce a total that belongs to neither.
- **No TanStack Query.** It is a client-only app with one synchronous local data
  source and one fire-and-forget poll. Adding a server-state library here would be
  ceremony. The seams that matter — `model/storage.ts` and `lib/spotFeed.ts` —
  are already the two boundaries: swapping in IndexedDB or a paid market feed is
  one file each.

## 5. Testing

112 tests / 13 files, `vitest` + Testing Library + jsdom.

| File | What it protects |
|---|---|
| `purchase.test.ts` | Schema rules; **the JSON round-trip regression** that froze the edit form; fine-gold maths |
| `selectors.test.ts` | Aggregation (fine vs gross, vendor ranking, purity sums), search, sort, no-mutation |
| `storage.test.ts` | Envelope round-trip, corrupt-JSON recovery, v1 migration, row repair, quota error |
| `backup.test.ts` | Export shape, envelope *and* bare-array import, per-row skipping, repair |
| `useLedger.test.ts` | All 7 reducer actions, undo index, idempotent restore, persistence failure |
| `LedgerPage.test.tsx` | 12 integration tests: create, edit-with-updatedAt, delete+undo, persistence across remount, empty vs no-results, purity filter, accessible names |
| `spotFeed.test.ts` | Both provider payloads (incl. embedded HTML spans), rial→toman conversion exactly once, Tehran offsets on both widget and table routes, per-karat null propagation, rejection of unusable prices |
| `valuation.test.ts` | Per-karat pricing (no blending), 22K/Bullion derived from 24K, independent USD and IRT legs, null propagation, flash threshold |
| `money.test.ts` | USD cents vs toman whole numbers, Latin digits in fa-IR, em dash instead of NaN |
| `LedgerToolbar.test.tsx` | Geometry contract: every control resolves the *same* class tokens; accessible names; aria-pressed |
| `LedgerPageValuation.test.tsx` | Live valuation end to end with `fetch` stubbed: both currencies, fine-vs-gross, stale retention, no NaN, retry |

The integration tests are regression locks: they fail if the old behaviour
returns. The `updatedAt` edit test would have caught the blocker before release.

## 6. Bundle

| Chunk | Size (gzip) | Δ from v2.1.0 |
|---|---|---|
| react-vendor | 69.13 kB | — |
| vendor | 57.80 kB | — |
| motion | 39.22 kB | — |
| date-utils | 19.77 kB | — |
| index (app) | 19.31 kB | **+2.71 kB** |
| icons | 2.84 kB | — |
| CSS | 12.72 kB | −0.48 kB |
| **Fonts** | **~48 kB (Latin, variable)** | — |

Font payload went from 1.1 MB / 10 files → ~48 kB for the Latin subset by
dropping woff fallbacks and adopting the variable Inter.

Live pricing cost **2.71 kB gzip** on the app chunk: two feed parsers, the
currency formatter, the valuation maths, the polling hook, and the ticker
component. It added **no dependency** — the feed is `fetch`, the formatting is
`Intl`, and the flash is CSS. The CSS chunk actually shrank, because the control
tokens replaced per-component utility strings that were being emitted repeatedly.

## 7. Known gaps

- **No error boundary.** A render error still white-screens. `AppShell` is the
  natural place for one.
- **22K and Bullion are derived, not quoted.** Tehran publishes 18K and 24K per
  gram; the other purities are scaled from 24K by fineness. The relationship
  matches the market's own 18K/24K pair to within a few hundred toman per gram,
  but it is a derivation, not a published price.
- **The IRT widget route is undocumented.** `v1/widget/tmp` is what tgju's own
  site calls; the per-karat `summary-table-data` endpoint is kept as a fallback
  specifically because the widget route may change shape without notice.
- **No cost basis.** The app values holdings but does not record what was paid,
  so gain/loss is unanswerable. Needs a `pricePerGram` field on `Purchase` — a
  schema change plus a storage migration, not a feed.
- **Market data is not offline-first.** The PWA precaches the app shell and
  fonts, but a cold start with no network shows em dashes until the first fetch.
  The last good quote is intentionally *not* persisted: a cached price reloaded
  is a stale number wearing a fresh timestamp. If offline valuation matters, cache
  the quote with its `fetchedAt` and render it as explicitly stale.
- **No routing.** Single screen; the page component would become `/ledger` if a
  route is added.
- **`motion` is 39 kB gzip** for four entrance animations. Replaceable with CSS
  transitions if the budget tightens.
- **No e2e.** The integration suite runs in jsdom; localStorage and IndexedDB
  quirks in real Safari are untested. The live-feed path is exercised only with
  `fetch` stubbed.
