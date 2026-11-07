# Arurem — Product & Business Gap Analysis

Written from the code, not from an ambition doc. Everything here is grounded in
what the app does today (v2.1.0) and what it cannot do.

---

## 1. What this product actually is

**Arurem is a single-user, offline, browser-local ledger of physical gold
holdings.** No account, no server, no sync, no price feed, no counterparty.

The honest one-line positioning: *a privacy-first tally of how many grams of pure
gold you own and where it came from.* That is a real, unserved need — the
alternatives for this job are a spreadsheet, a notes app, or a paid vault
custodian's portal. It is also, at present, a **feature of a product rather than
a product**.

### The core proposition, stated precisely

> "I own gold in several places, from several sellers, at several purities. I
> want to know, without telling anyone: how much pure gold do I actually hold,
> and where is it?"

Everything the app does serves that sentence. Everything it does not do is what
stands between it and someone paying for it.

---

## 2. What is genuinely good

Not padding — these are the assets to protect in any redesign:

1. **The privacy posture is the moat, and it is real.** localStorage, no network
   calls, no analytics, no account. For gold — an asset people are culturally and
   legally quiet about — "your data never leaves this device" is not a checkbox,
   it is the reason to choose this over a cloud app. The PWA + font caching means
   it works with the radio off, which matters in exactly the places gold is held
   and traded.
2. **Fine-gold computation.** The app now computes purity-adjusted 24K-equivalent
   weight. Most consumer trackers just sum gross grams, which is wrong the moment
   you hold mixed karats. This is the app's one piece of real domain
   intelligence.
3. **Frictionless entry.** Three required fields, one sheet, no account. Time to
   first recorded asset is under 15 seconds.
4. **Backup as a first-class action.** Export/import of a readable JSON file means
   the user is not locked in — which paradoxically makes the product *easier* to
   trust and to recommend.

---

## 3. Structural vulnerabilities

Ranked by how badly they hurt, not by how hard they are to fix.

### V1 — Data loss is one cleared cache away. **Critical.**

`localStorage` is:
- wiped when the user clears browsing data,
- wiped when Safari evicts under storage pressure (7-day cap for non-installed
  sites on iOS),
- not shared across browsers or devices,
- not recoverable if the device is lost.

The app's only mitigation is a manual JSON export the user must remember to do.
**For an asset ledger this is a product-ending flaw.** A user who loses six
months of records will not come back, and will tell people why.

This is not a UX nit — it is the number one thing to fix, and it is fixable
without abandoning the privacy promise (see R1).

### V2 — There is no price, so there is no value. **Critical (product).**

A gold ledger that cannot answer "what is this worth?" is a scale, not a ledger.
The app tracks grams beautifully and value not at all. Every adjacent question —
*am I up or down, should I sell, is this dealer overcharging me* — is
unanswerable.

### V3 — The trust theatre undermines trust. **High.**

The UI says **"Inventory Status: Secure"**, **"Vault Secure Pulse"**,
**"Standard Audited Ledger"**, **"Verified ledger"**. None of these are true:
nothing is audited, nothing is verified, there is no vault, and there is no
security beyond the browser's own. For a *financial* tool, decorative reassurance
is worse than silence — a sophisticated user reads it as a warning sign, and a
naive user may make a real decision on the strength of a fake badge.

I removed the "Secure" status pill and reworded the surrounding chrome, but the
strategic point stands: the product should earn trust with behaviour (backup,
export, integrity checks), not with adjectives.

### V4 — No history, so no insight. **High.**

The schema stores a `Purchase` (a snapshot). It has no concept of a
*transaction*. Consequences:

- You cannot record a **sale**. Only purchases exist. The moment a user sells,
  the ledger becomes a lie.
- You cannot record a **transfer** between storage locations.
- You cannot correct a mistake without overwriting history.
- There is no time axis at all: no "holdings over time", no cost basis, no
  realised gain.

The current model is an inventory, not a ledger. The name promises a ledger.

### V5 — Single-asset, single-user ceiling. **Medium.**

Gold only, one person, one browser. Every expansion (silver, platinum, cash,
crypto) requires a schema migration; every sharing scenario (spouse, family
trust, business partner) requires an architecture the app does not have.

### V6 — No differentiation beyond privacy. **Medium.**

Privacy is necessary but not sufficient. A competitor with a cloud account and a
price feed can copy "private mode". Nothing else here is hard to copy.

### V7 — PWA install is invisible. **Low-Medium.**

The app is a fully-functional offline PWA and never tells the user. Install is
the single highest-leverage retention action available (it protects storage from
eviction *and* puts the app on the home screen), and it happens by accident at
best.

---

## 4. Missing features, scored

| # | Feature | Why it matters | Effort | Priority |
|---|---|---|---|---|
| F1 | **Sales / disposals** (transactions, not just purchases) | Without it the ledger is wrong the first time anyone sells | M | **P0** |
| F2 | **Cost basis + current value** (price per gram at purchase + manual spot price) | The whole point of tracking an asset | M | **P0** |
| F3 | **Encrypted local backup + restore, with a reminder cadence** | V1 is existential | M | **P0** |
| F4 | **Storage location per holding** (vault, bank, home, custodian) | "Where is it" is half the core proposition, and is currently unmodelled | S | **P0** |
| F5 | **Install prompt + storage-persistence request** (`navigator.storage.persist()`) | Free retention and loss prevention | XS | **P0** |
| F6 | **Purity presets with actual fineness** (999.9, 916, 750, custom) | "22K" varies by jurisdiction; a real ledger needs fineness | S | P1 |
| F7 | **Holdings over time** (chart) | Turns records into insight | M | P1 |
| F8 | **Multi-metal** (silver, platinum) | Natural expansion | M | P1 |
| F9 | **CSV import** (from a dealer or a spreadsheet) | Removes the biggest onboarding cost | S | P1 |
| F10 | **Gains / realised P&L** | Requires F1 + F2 | M | P2 |
| F11 | **Shares / joint holdings** | Unlocks family and business use | L | P2 |
| F12 | **Encrypted export** (passphrase) | Needed before backups leave the device | S | P2 |
| F13 | **Photos of certificates / hallmarks** | Evidence, not just numbers | M | P2 |
| F14 | **Multi-currency** | Non-USD/IRR users | M | P3 |
| F15 | **Cloud sync (opt-in, E2E)** | The retention feature most users want, and the one that breaks the promise if done carelessly | L | P3 |

Effort: XS < ½ day · S < 2 days · M < 1 week · L multi-week.

---

## 5. Feature recommendations, spec level

### R1 — Make data loss structurally impossible (fixes V1)

Three layers, in order of value per hour:

1. **Request persistent storage** on first entry:
   `navigator.storage.persist()`. This exempts the origin from eviction in
   Chrome/Edge and is one line. Free.
2. **Automated rotating local backups.** Keep the last N snapshots in IndexedDB
   under a separate key, so a corrupt current write cannot destroy the previous
   state. Cheap, and it converts "one bad write" from catastrophic to annoying.
3. **Nudge export.** After the 5th entry and then monthly, a dismissible prompt:
   *"You have 12 entries that exist only in this browser. Download a backup?"*
   Track `lastExportedAt` in the store so it is not nagging, it is accurate.

Then, and only then, consider encrypted cloud backup as an *opt-in* (F12 + F15).

### R2 — Turn snapshots into transactions (fixes V4, enables F1/F10)

Migrate `Purchase` → `LedgerEntry` with a `kind` discriminant:

```
type EntryKind = 'acquisition' | 'disposal' | 'transfer' | 'adjustment'

type LedgerEntry = {
  id, kind, metal, vendor|counterparty, weight, fineness,
  locationId, pricePerGram?, currency?, occurredAt, createdAt, updatedAt, note?
}
```

Holdings become a *derived projection* over entries (`computeHoldings(entries)`),
not the source of truth. This is the single most important architectural change
available, and it must happen before users have enough data to make migration
painful. The reducer already isolates transitions, so this is a `model/` change
plus one migration, not a UI rewrite.

### R3 — Value without a market-data dependency (fixes V2)

Do not integrate a price API. It adds a network call, a failure mode, a
compliance surface, and a privacy leak — for a number the user can look up.

Instead:
- Optional **price per gram paid** on each acquisition (stored, never fetched).
- One **manual spot price** in settings, with the date it was set.
- Derive: total cost basis, current estimated value, unrealised gain.
- Label the estimate honestly: *"At 62.40 /g, set 3 Nov"* — never pretend it is live.

This gets 90% of the value with zero of the liability.

### R4 — Location as a first-class entity (fixes F4)

Locations (Vault A, Bank locker, Home safe, Custodian) with holdings assigned.
This is what makes the app answer the *second half* of the core question, and it
is the feature most likely to make someone choose this over a spreadsheet.

### R5 — Sell the install (fixes V7)

On the 2nd visit with ≥1 entry, show a single inline card: *"Install Arurem — it
keeps working offline and protects your data from browser cleanup."* One button,
dismissible forever. It is honest, it helps the user, and it improves retention.

### R6 — Delete the trust theatre (fixes V3)

Replace "Inventory Status: Secure" with something true, e.g. **"Stored on this
device · last backup 3 Nov"**. Replace "Verified ledger" with **"Purity-adjusted
total"**. Every claim in the UI should be verifiable by the user in one click.

---

## 6. Monetisation

The privacy promise constrains this severely, and that is fine — it is also the
positioning.

| Model | Fit | Notes |
|---|---|---|
| **One-time purchase** (desktop/mobile app, e.g. €29) | **Strong** | Aligns perfectly: no account, no telemetry, no subscription nagging a user who opens the app twice a year. This is the honest model for a local-first tool. |
| **Freemium: local free / encrypted sync paid** (€2–4/mo) | **Medium** | The paid tier must deliver a *user-owned* encrypted sync (their iCloud/Dropbox). Requires careful crypto and destroys "we never touch your data" if done casually. |
| **Family / multi-vault licence** (€49) | Medium | Pairs with F11. Needs sharing architecture first. |
| **Affiliate (dealers, vaults)** | **Avoid** | Directly corrupts the trust position. A ledger that earns commission on your purchases is not an independent ledger. |
| **Ads / data** | **Never** | Contradicts the entire product. |

Recommended: **one-time purchase for the full app**, with the free version capped
at e.g. 10 entries and no backup-completion features. Highest trust, lowest
support load, no infrastructure.

---

## 7. Competitive position

| Alternative | Beats Arurem on | Arurem beats it on |
|---|---|---|
| Spreadsheet | Flexibility, formulas, familiarity | Structure, mobile UX, no formula errors, purity maths built in |
| Notes app | Zero setup | Everything |
| Cloud portfolio trackers (Kubera, Sharesight, etc.) | Prices, history, reporting, multi-asset | **Privacy** (they want your account or your data), offline, no signup |
| Dealer / vault portals | Custody integration | Independence — a custodian's portal only sees what they hold |
| Dedicated gold apps (Gold Wallet, etc.) | Market data, buy/sell flows | Privacy, no account, no upsell |

**The wedge is narrow and real:** the person who owns physical gold, holds it in
more than one place, does not want a cloud account, and is currently using a
spreadsheet. There are more of these people than the SaaS market assumes — they
are simply invisible to it, because they do not sign up for things.

**The differentiation is not a feature. It is the absence of one:** no account, no
server, no telemetry. That is defensible precisely because venture-backed
competitors structurally cannot copy it.

---

## 8. What I would do next, in order

1. **`navigator.storage.persist()` + monthly export nudge** — half a day, removes
   the existential risk. Do this before anything else.
2. **Location field on entries** — small schema change, closes half the core
   promise.
3. **Transaction model (`kind: acquisition | disposal`)** — the architectural
   change that determines whether this becomes a real ledger. Do it while the
   user base is small.
4. **Cost basis + manual spot price** — turns grams into value.
5. **Install prompt card** — free retention.
6. **Delete the trust theatre** — free credibility.

Items 1, 2, 5, and 6 are collectively about two days of work and materially
change what the product is.

---

## 9. Open product questions

These are the decisions I cannot make from the code:

1. **Is this a product or a personal tool?** If personal, stop at item 2 and stop
   shipping. If a product, items 3–4 are mandatory and the one-time-purchase
   model needs validating with 10 real gold holders first.
2. **Does "private" mean "no cloud ever", or "no account, but encrypted backup
   allowed"?** This single answer determines the entire monetisation and
   retention strategy.
3. **Is disposals in scope?** If users never sell, the inventory model is fine
   forever. If they do, the ledger model is not optional.
4. **Iran-market specifics?** The seeded vendors (Bazaar exchange, Tehran
   treasury) and the RTL-capable audience suggest a specific market. If so,
   Persian language, RTL layout, and IRR/gram pricing jump up the priority list —
   those are not on the roadmap above and probably should be.
