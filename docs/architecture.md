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
│   │   │   │   ├── DeleteDialog.tsx
│   │   │   │   ├── WalletStrip.tsx          filter chips above the ledger
│   │   │   │   ├── WalletManager.tsx        full list: create/rename/delete
│   │   │   │   ├── WalletSheet.tsx          create/edit wallet form
│   │   │   │   └── WalletDeleteDialog.tsx   "entries stay" confirmation
│   │   │   ├── hooks/
│   │   │   │   ├── useLedger.ts       # reducer + persistence + selectors wiring
│   │   │   │   ├── usePurchaseForm.ts # react-hook-form + zod binding
│   │   │   │   └── useWalletForm.ts   # the same, plus name uniqueness
│   │   │   └── model/
│   │   │       ├── purchase.schema.ts # zod schemas (runtime values)
│   │   │       ├── purchase.ts        # behaviour: create, applyDraft, fineGoldGrams
│   │   │       ├── wallet.schema.ts   # wallet schema + uniqueness refine
│   │   │       ├── wallet.ts          # create, summarise, count unassigned
│   │   │       ├── selectors.ts       # computeStats, filterPurchases, sortPurchases
│   │   │       ├── storage.ts         # the ONLY module that knows localStorage
│   │   │       ├── snapshots.ts       # rotating local snapshot ring (external store)
│   │   │       ├── safetyMeta.ts      # lastExportedAt / nudge dismissal
│   │   │       ├── exportNudge.ts     # when to ask for a backup, and why
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
│   │   │   ├── useMarketRates.ts      # 5m poll, visibility-gated, stale-preserving
│   │   │   └── useValueFlash.ts       # trend direction + animation nonce
│   │   ├── lib/
│   │   │   ├── format.ts              # Intl number/date formatting
│   │   │   ├── money.ts               # USD/toman formatting, locale separation
│   │   │   ├── spotFeed.ts            # the only module that knows a price provider
│   │   │   ├── storagePersistence.ts  # navigator.storage.persist() wrapper
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
│   │   ├── wallet.ts                  # Wallet, WalletDraft, WalletSummary
│   │   ├── ledger.ts                  # ViewMode, SortKey, WalletFilter, LedgerState, …
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
 (create/update  │  (pure, 11    │                     ├ computeStats
  /delete/undo/  │   actions)    │                     ├ computeWalletSummaries
  wallet CRUD/   └───────┬───────┘                     └ filter → sort
  /import/
  dismiss-recovery)
                         │ effect (skips first run, skips identical payload)
                  model/storage.ts
                         ↓
                    localStorage  (arurem.ledger.v2, envelope version 3)
                         ↓
                  model/snapshots.ts ──→ arurem.snapshots.v1 (ring of 5)
```

### Wallets (a label on an entry, not a container)

```
Purchase.walletId ──→ Wallet.id          one optional field, one direction

delete a wallet
   ├─ wallets      → the wallet is removed
   ├─ purchases    → walletId set to undefined, EVERY other field untouched
   └─ Undo         → restore-wallet carries the ids it held and relinks them
                     · an entry reassigned elsewhere in the meantime is NOT stolen
                     · a link to a wallet not in the payload is dropped on read,
                       so a stale backup cannot resurrect a phantom wallet

save order: the entry points at a wallet; a wallet never holds a list of entries.
That is why "at most one wallet per entry" needs no invariant check.
```

`computeWalletSummaries` and `countUnassigned` derive per-wallet totals and the
unassigned count from `(purchases, wallets)` on render — nothing is stored, so a
wallet's total cannot drift from the entries it claims.

### Data safety (adjacent to the ledger, never inside it)

```
useDataSafety(purchases)                  observes only
   ├─ storagePersistence.ts → navigator.storage.persist()  (once, non-empty)
   ├─ snapshots.ts          → captureSnapshot on every commit
   │                           · 10-minute floor, identical payloads skipped
   │                           · an external store, so the UI subscribes
   │                             via useSyncExternalStore rather than mirroring
   ├─ safetyMeta.ts         → arurem.safety.v1 (lastExportedAt, dismissal)
   └─ exportNudge.ts        → pure decision: never-exported / overdue / silent
        ↓
   ExportNudge · RecoveryBanner · LedgerFooter

loadPurchases()
   └─ unreadable payload? → recovery: readLatestSnapshot()
        ↓ never applied automatically — RecoveryBanner asks first
```

Three separate keys, deliberately. `arurem.ledger.v2` is the user's data — both
entries and wallets, in one envelope at version 3 (the key name keeps its `v2` so
existing payloads are found; the `version` field inside is what migrates),
`arurem.snapshots.v1` is its history, and `arurem.safety.v1` is bookkeeping about
the user's backup habits. A corrupt ledger cannot take the snapshots with it, and
a failed bookkeeping write cannot block an export. Wallets share the ledger key
on purpose: an entry's `walletId` is meaningless without the wallet it points at,
so one write keeps the two consistent and no restore can bring back half of the
pair.

### Market data (separate from ledger state)

The ledger is the user's data; market data is not. It lives outside the reducer
because it is neither authored by the user nor persisted with the ledger — a
cached price in `localStorage` would be a stale number wearing a fresh timestamp
after the next reload.

```
useMarketRates (one instance, mounted in LedgerPage)
   ├─ 5-minute interval, paused when document.visibilityState !== 'visible'
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

242 tests / 21 files, `vitest` + Testing Library + jsdom.

| File | What it protects |
|---|---|
| `purchase.test.ts` | Schema rules; **the JSON round-trip regression** that froze the edit form; fine-gold maths |
| `wallet.test.ts` | Wallet schema and behaviour; **duplicate-name rejection**; per-wallet gross/fine totals; unassigned counting incl. stale links |
| `selectors.test.ts` | Aggregation (fine vs gross, vendor ranking, purity sums), search, sort, no-mutation |
| `storage.test.ts` | Envelope round-trip, corrupt-JSON recovery, v1 migration, row repair, quota error, **v2→v3 upgrade**, wallet repair, dangling-link drop |
| `backup.test.ts` | Export shape, envelope *and* bare-array import, per-row skipping, repair, **wallets restored with their links**, dangling links dropped, sentinel never imported |
| `useLedger.test.ts` | All 11 reducer actions, undo index, idempotent restore, persistence failure, **delete-wallet unlinks but never deletes**, undo-relink, no-steal-on-restore |
| `LedgerPage.test.tsx` | 12 integration tests: create, edit-with-updatedAt, delete+undo, persistence across remount, empty vs no-results, purity filter, accessible names |
| `LedgerPageWallets.test.tsx` | 13 integration tests: create/rename/delete wallet, duplicate rejection, assign and move an entry (never duplicating), clear to "No wallet", filter by wallet and by unassigned, **delete keeps entries**, undo relinks, persistence across remount, empty wallets still listed, list shrink contract |
| `spotFeed.test.ts` | Both provider payloads (incl. embedded HTML spans), rial→toman conversion exactly once, Tehran offsets on both widget and table routes, per-karat null propagation, rejection of unusable prices |
| `valuation.test.ts` | Per-karat pricing (no blending), 22K/Bullion derived from 24K, independent USD and IRT legs, null propagation, flash threshold |
| `money.test.ts` | USD cents vs toman whole numbers, Latin digits in fa-IR, em dash instead of NaN |
| `LedgerToolbar.test.tsx` | Geometry contract: every control resolves the *same* class tokens; accessible names; aria-pressed |
| `LedgerPageValuation.test.tsx` | Live valuation end to end with `fetch` stubbed: both currencies, fine-vs-gross, stale retention, no NaN, retry |
| `snapshots.test.ts` | Ring rotation at the retention limit, interval floor, duplicate suppression, corrupt-ring survival, write failure never throws |
| `exportNudge.test.ts` | Threshold, interval, dismissal expiry, unparseable stamps treated as overdue, empty ledger never nudged |
| `safetyMeta.test.ts` | Round-trip, corrupt JSON, invalid stamps, failed write swallowed |
| `storagePersistence.test.ts` | granted / denied / unsupported / absent, on both `persist()` and `persisted()` |
| `LedgerPageSafety.test.tsx` | The nudge appearing, dismissing, and clearing on export; a corrupt payload offering — and restoring from — a snapshot; truthful footer; **no network call in any of it** |

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
- **Snapshots share an origin with the ledger.** The ring protects against a bad
  write, a quota truncation, and a corrupt serialisation — not against clearing
  site data or losing the device. Nothing browser-local can. That residual risk is
  precisely what the export nudge exists to reduce, and what opt-in encrypted
  backup (F12/F15) would remove.
- **No install prompt.** `navigator.storage.persist()` is requested, but the app
  still never invites the user to install it — the single highest-leverage
  retention action available. F5's second half.
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
