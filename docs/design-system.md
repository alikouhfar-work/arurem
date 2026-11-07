# Arurem — Design System & Responsive UI/UX Blueprint

Audit date: 2026-11-07 · Baseline `v2.0.0` → Refactor `v2.1.0`

Screenshots: `docs/audit/baseline/` (before) and `docs/audit/after/` (after).
Contrast numbers below are computed, not estimated.

---

## 1. What the baseline actually measured

I ran the app against seeded data at 320 / 390 / 768 / 1440 px and audited it with
axe-core 4.10.2 (WCAG 2.0/2.1/2.2 A + AA). The findings, in user-impact order:

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | **Blocker** | Editing any entry that had been edited once was impossible. The save button stayed permanently disabled with no error. | Live repro: opening "Zurich Bullion AG" (had `updatedAt`) → `submitDisabled: true`, zero validation messages |
| 2 | **Blocker** | Every form input was nameless to assistive tech. `<label>` elements had no `htmlFor`; no input had an `aria-label`. | axe: `button-name` critical + 0 labelled controls in DOM dump |
| 3 | **Major** | A search with no matches claimed the ledger was empty ("Access Empty Sector / Start recording your assets") — i.e. "your data is gone". | Live repro at query `zzzz-nothing` |
| 4 | **Major** | 15 axe violations: 13 contrast failures, 2 unnamed buttons. | axe baseline run |
| 5 | **Major** | 13 text/icon combinations failed WCAG AA. Worst: `slate-400 #94A3B8` on white = **2.56:1** (needs 4.5), used for every date, memo, and label. | Computed: 2.56, 2.10, 1.48 |
| 6 | **Major** | Icon buttons rendered 34×34 and 40×40 px — under the 44 px touch minimum, on the two most destructive actions (delete/edit). | DOM geometry |
| 7 | **Minor** | Import was a `<input type=file>` nested **inside** a `<button>` — invalid HTML, and it replaces the entire ledger with one mis-click, styled identically to export. | `Header.tsx:87-100` (baseline) |
| 8 | **Minor** | Six different corner radii on adjacent elements (`rounded-2xl/3xl/[2rem]/[2.5rem]/[3rem]/[4rem]`). Reads as unpolished at any zoom. | Class inventory |
| 9 | **Minor** | Body copy at 18 px on mobile with 12 px labels carrying `0.2em` letter-spacing — the labels looked like decoration, not labels. | `text-base md:text-lg` on `body` |
| 10 | **Minor** | No dark mode despite a complete `.dark` token block sitting unused. | Token audit |
| 11 | **Minor** | The "updated" date rendered `purchase.createdAt`, so it silently duplicated the created date. | `PurchaseGridCard.tsx:37` (baseline) |

### The blocker, root-caused

`Purchase.createdAt` was typed `Date`, but storage round-tripped through
`JSON.stringify` / `JSON.parse`, which yields a **string**. On first load the app
was fine (in-memory `Date`). After a reload, every record held a string. The zod
schema demanded `z.date()`, so `zodResolver` failed validation for the whole form
before the user touched it — and the submit button was `disabled={!isValid}`.
The user saw a dead button and no explanation.

Fix: dates are ISO-8601 strings end to end. The storage boundary converts once
(`migrateRow`), the schema validates strings, and the form converts only at the
calendar widget. Covered by a regression test that round-trips through JSON.

---

## 2. Token architecture

Two files, one direction of dependency:

```
src/shared/styles/tokens.css   raw scales + semantic roles (light & dark)
src/shared/styles/globals.css  Tailwind @theme bridge → utility classes
```

Components consume **semantic roles only** (`background`, `primary`,
`muted-foreground`, `border`). Brand scales exist to *define* those roles and for
illustrative surfaces. No component contains a raw hex.

### Why the old palette failed

Gold `#D4AF37` on white is **2.10:1**. It was used for weights, karats, and
accents — all of which were effectively invisible to low-vision users. The fix is
not "darken the gold everywhere" (that turns a luxury brand muddy). It is a split:

| Token | Value | On white | On sand | On jade-900 | Permitted use |
|---|---|---|---|---|---|
| `gold-400` | `#D4AF37` | 2.10 | 2.00 | **5.81** | **Fills and rules only.** Never text on light. |
| `gold-600` | `#A17C22` | 2.95 | 2.80 | 4.14 | Charts, non-text accents |
| `gold-700` | `#8F6E1B` | **4.76** | 4.52 | 2.57 | **Gold text on light surfaces** |
| `gold-200` | `#EFDBA4` | 1.37 | 1.30 | **8.92** | **Gold text on dark jade** |
| `ink-500` | `#5F7169` | **5.18** | 4.92 | 2.57 | Smallest safe secondary text on light |
| `ink-400` | `#7D8D86` | 3.48 | 3.31 | 4.76 | Borders and icons **only** |
| `ink-300` | `#A9B6AF` | 2.10 | 2.00 | 8.22 | Decorative only |
| `jade-900` | `#0A3D2E` | **11.60** | 11.60 | — | Primary surface |
| `jade-700` | `#0F4F3D` | **9.52** | 9.05 | 1.28 | Primary text, focus ring |

The contract is written into `tokens.css` as a comment block so the next person
does not re-derive it. Every pair above was computed with the WCAG relative
luminance formula, not eyeballed.

### Dark mode

Real, not inverted. Background `#0B1210` (green-black, so gold reads warm rather
than acidic), surfaces `#121B18`, primary flips to `gold-400` on `ink-900` text
(**8.58:1**). `prefers-color-scheme` is honoured on first visit; the toggle
persists to `localStorage` under `arurem.theme`.

#### No flash on refresh

The theme must be on `<html>` before the browser paints, so it is applied by a
render-blocking inline script in `<head>`, not by React:

1. A `<style>` block in `<head>` sets `html { background-color: #fbf9f4 }` and
   `html.dark { background-color: #0b1210 }`. This covers the window between
   HTML parse and the stylesheet arriving — Vite injects CSS from JS in dev, so
   without it the canvas is painted browser-default white first.
2. An inline synchronous `<script>` reads `arurem.theme`, resolves it against
   `prefers-color-scheme`, and toggles `.dark` plus `color-scheme` on
   `<html>`. It is wrapped in `try/catch` so blocked storage cannot stop boot.
3. `useTheme` then only *reconciles* React state with what the script did. Its
   effects run after paint, which is exactly why they cannot be the mechanism.

Verified by instrumenting `readystatechange` and asserting at
`readyState === 'interactive'` — i.e. before React mounts (`#root` empty) — that
the class, background, and `color-scheme` are already correct. Checked across all
seven stored-value × OS-preference combinations, in dev and in the production
build (normal and hard reload).

`src/app/theme-boot.test.ts` guards the duplication: it asserts the script is
inline and ahead of the module entry, uses the same storage key, matches the
light and dark backgrounds in `tokens.css`, resolves every combination
identically to `resolveTheme()`, sets `color-scheme`, and cannot throw.

> If you ever change a background colour or the storage key, update all three
> places (script, `tokens.css`, `shared/lib/theme.ts`). The test fails loudly if
> you forget one.

### Type scale

| Role | Family | Size | Notes |
|---|---|---|---|
| Display (fine gold total) | Outfit | `clamp(2.75rem, 7.5vw, 5.75rem)` | One fluid token replaces the old `text-6xl xl:text-8xl` cliff |
| Section heading | Outfit | 20–24 px | |
| Body | Inter Variable | 16 px / 1.5 | Down from 18 px on mobile — 18 px body pushed line lengths past 90ch |
| Secondary | Inter | 12–13 px | Only at `ink-500`+ |
| Numerals | JetBrains Mono | tabular | `.numeric` utility; every weight and percentage uses it |

`font-display: swap` and woff2-only. Dropping the woff fallbacks and switching
Inter to the variable cut font payload from **1.1 MB across 10 files** to
**~48 KB for the Latin subset**.

### Spacing & radius

4 px base scale, Tailwind default. Radius collapses from six values to three:
`rounded-lg` (8 px, controls), `rounded-xl`/`2xl` (12–16 px, cards and sheets),
`rounded-full` (avatars, pills). The `--radius` multiplier chain in `@theme`
keeps them related.

---

## 3. Responsive behaviour

Verified at 320 / 390 / 768 / 1440 px with `scrollWidth === clientWidth` asserted
at each. The baseline overflowed to **851 px** at every width below 851.

| Breakpoint | Layout |
|---|---|
| < 640 | Single column. Summary cards stack; the two secondary metrics sit side by side (Vendors / Mix). Toolbar wraps: full-width search, then filter + sort + view toggle on a second row. List view only in practice (grid is available but one-up). Sheet is full-width. |
| 640–1023 | Summary: 3-up (`sm:grid-cols-3`) with the hero spanning 2. Toolbar on one row. Grid view becomes 2-up. |
| ≥ 1024 | Content capped at `max-w-6xl` (1152 px) and centred; grid view 3-up. |

### Specific fixes

- **Toolbar overflow at 320 px** (found during this pass, not in the original
  audit): the filter/sort/toggle row was `flex` with `flex-1` children and a
  fixed-width toggle, forcing 359 px of content into 320 px. Now `flex-wrap` with
  `basis-[6.5rem]` on the selects.
- **Entry row at mobile**: actions previously sat in an absolutely-positioned
  corner and overlapped the vendor name. They are now a flex sibling in the row.
- **Sheet**: was `max-w-lg` with `p-12` — at 375 px the content area was 281 px
  wide for a 3-field form. Now `w-full sm:max-w-md`, `p-0` with per-section
  padding, and a sticky action bar pinned above `env(safe-area-inset-bottom)`.
- **Touch targets**: every interactive element is ≥ 44 px. `ThemeToggle`,
  new-entry, and close are 44 px; row actions are 32 px visual with a 44 px hit
  area via `Button size="icon-sm"` inside a padded row.

---

## 4. Interaction model

### Create / edit

```
Header "New entry"  ─┐
Empty state CTA     ─┼→  right sheet (desktop) / full sheet (mobile)
Row edit button     ─┘     ├ Vendor              (required)
                           ├ Gross weight (g)    (required, live fine-gold preview)
                           ├ Purity              (required, select)
                           ├ Date acquired       (required, calendar, future blocked)
                           └ Memo                (optional, char counter)
                        →  sticky [Cancel] [Add entry / Save changes]
```

Deliberate choices:

- **The submit button is never disabled for invalidity.** A disabled button with
  no explanation is a dead end. Submit always runs; on failure the first invalid
  field receives focus and its error is announced via `role="alert"`. The only
  disabled state is "No changes" when editing an untouched record — a state the
  label itself explains.
- **Validation on blur, then live.** Validating on every keystroke flashes
  "out of range" while someone types `1` on the way to `12`. Validating only on
  submit leaves them stuck. `mode: 'onTouched'` + `reValidateMode: 'onChange'`.
- **Live fine-gold preview.** Typing `100` g at 18K shows "≈ 75.000 g fine gold
  at 75.0%". This is the number the ledger exists to produce; showing it at entry
  time prevents the most common data-entry mistake (recording gross as fine).

### Delete

Two-step: row → confirm dialog that names the vendor and weight → delete → toast
with **Undo** (8 s). The undo restores at the original index, not the end.
Radix focuses *Cancel* by default.

### Search, filter, sort

- Debounce-free (dataset is local and small; filtering is `useMemo`'d).
- `/` focuses search from anywhere; `Esc` clears it.
- Purity filter and sort are real `<select>`s with accessible names.
- Result count is a `role="status"` live region: "3 of 12 entries".
- **Two distinct empty states.** "No entries yet" (onboarding CTA) vs "No matching
  entries — your entries are still here" (with Clear filters). This was finding #3.

### Feedback

| Event | Surface | Duration |
|---|---|---|
| Entry added / updated | Toast, success | 4 s |
| Entry deleted | Toast + Undo action | 8 s (until dismissed) |
| Import failed | Toast, error | until dismissed |
| Import OK with skipped rows | Toast + skipped count | 4 s |
| Storage write failed | Persistent inline banner | until dismissed |
| Filter applied | Inline `role=status` count | — |
| Nothing to export | Toast, info | 3 s |

Toasts are bottom-centre on mobile (thumb-adjacent), bottom-centre on desktop.

---

## 5. Accessibility status

`axe-core 4.10.2`, tags `wcag2a wcag2aa wcag21a wcag21aa wcag22aa`:

| Run | Violations |
|---|---|
| Baseline, 1280 px | **15** (2 critical, 13 serious) |
| After, 1440 px light | **0** |
| After, 1440 px dark | **0** |
| After, 390 px light | **0** |

Also verified by hand:

- Skip link to `#ledger`, visible on focus.
- Every icon-only control has an accessible name (`aria-label` or `sr-only`).
- Every form control has a programmatic label plus `aria-describedby` for hint and
  error, and `aria-invalid` when errored.
- Focus ring is one token (`--ring` jade-700, 7.4:1) at 2 px with 2 px offset,
  applied globally via `:focus-visible`.
- `prefers-reduced-motion` zeroes all animation and transition durations.
- Heading hierarchy: `h1` brand → `h2` section → `h3` entry. No skipped levels.
- Landmarks: `header`, `main` content region, `footer`, `section[aria-labelledby]`.
- Colour is never the sole signal: deleted items announce via toast text, purity is
  written out, errors carry text.

Not verified (needs a real device / screen reader pass): VoiceOver announcement
order through the sheet, and Safari iOS dynamic-toolbar behaviour on the sticky
action bar.

---

## 6. What I deliberately did not do

- **No gradients as decoration.** The one gradient is the primary metric card,
  where it separates "this is the headline number" from the secondary cards.
- **No emoji, no decorative icon on every heading.** Icons mark controls and the
  two summary tiles; that is all.
- **No nested cards.** One surface level: page canvas → card. Entries are rows,
  not cards inside a card.
- **List view is the mobile default**, not grid. A 1-up grid at 390 px wastes
  vertical space and hides the memo.

---

## 7. Open questions for you

1. **Fine gold vs gross weight.** The summary now leads with purity-adjusted fine
   gold (the defensible number) and shows gross underneath. If you think of your
   holdings in gross grams, say so and I will swap the hierarchy — one line in
   `ledger-summary.tsx`.
2. **Currency.** There is no price or value field anywhere. For a gold ledger
   that is the biggest functional gap (see the product report). Do you want
   purchase price per gram, a manual spot price, or neither?
3. **Dark mode default.** Currently follows the OS. For a "vault" product, a
   dark-first default may fit the brand better.
