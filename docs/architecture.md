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
│   │   └── summary/
│   │       └── components/
│   │           └── LedgerSummary.tsx # hero metric, vendor count, purity mix
│   │
│   ├── shared/                       # the bottom layer: no feature imports
│   │   ├── components/
│   │   │   └── AppShell.tsx          # page frame, skip link, brand mark
│   │   ├── hooks/
│   │   │   └── useTheme.ts
│   │   ├── lib/
│   │   │   ├── format.ts              # Intl number/date formatting
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
│   ├── types/                         # EVERY type declaration lives here
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

- **One reducer**, `ledgerReducer`, pure and unit-tested. `useLedger` is the only
  thing that touches storage. Components dispatch intent, never `setState` — so
  adding an activity log later is a reducer concern, not a UI rewrite.
- **Undo is a first-class action** (`restore` with index), not a UI trick.
- **Derived state is never stored.** `computeStats` runs in a `useMemo` over
  `purchases`; there is no denormalised total to drift.
- **No TanStack Query.** It is a client-only app with one synchronous local data
  source. Adding a server-state library here would be ceremony. The seam that
  matters — `model/storage.ts` — is already the single boundary: swapping in
  IndexedDB or a synced backend is one file plus an async `loadPurchases`.

## 5. Testing

67 tests / 7 files, `vitest` + Testing Library + jsdom.

| File | What it protects |
|---|---|
| `purchase.test.ts` | Schema rules; **the JSON round-trip regression** that froze the edit form; fine-gold maths |
| `selectors.test.ts` | Aggregation (fine vs gross, vendor ranking, purity sums), search, sort, no-mutation |
| `storage.test.ts` | Envelope round-trip, corrupt-JSON recovery, v1 migration, row repair, quota error |
| `backup.test.ts` | Export shape, envelope *and* bare-array import, per-row skipping, repair |
| `useLedger.test.ts` | All 7 reducer actions, undo index, idempotent restore, persistence failure |
| `LedgerPage.test.tsx` | 12 integration tests: create, edit-with-updatedAt, delete+undo, persistence across remount, empty vs no-results, purity filter, accessible names |

The integration tests are regression locks: they fail if the old behaviour
returns. The `updatedAt` edit test would have caught the blocker before release.

## 6. Bundle

| Chunk | Size (gzip) |
|---|---|
| react-vendor | 69.1 kB |
| vendor | 57.8 kB |
| motion | 39.2 kB |
| date-utils | 19.8 kB |
| index (app) | 16.6 kB |
| icons | 2.8 kB |
| CSS | 13.2 kB |
| **Fonts** | **~48 kB (Latin, variable)** |

Font payload went from 1.1 MB / 10 files → ~48 kB for the Latin subset by
dropping woff fallbacks and adopting the variable Inter.

## 7. Known gaps

- **No error boundary.** A render error still white-screens. `AppShell` is the
  natural place for one.
- **No routing.** Single screen; the page component would become `/ledger` if a
  route is added.
- **`motion` is 39 kB gzip** for four entrance animations. Replaceable with CSS
  transitions if the budget tightens.
- **No e2e.** The integration suite runs in jsdom; localStorage and IndexedDB
  quirks in real Safari are untested.
