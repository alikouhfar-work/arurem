/**
 * Market data contracts.
 *
 * Three shapes, one direction:
 *   feed payload (upstream JSON, parsed in shared/lib/spotFeed.ts)
 *     → MarketQuote     normalised, cacheable
 *     → GoldValuation   grams → money, derived on render
 *
 * Two independent currencies, two independent providers. The toman side is the
 * Tehran market's own per-gram price, never a USD figure run through an
 * exchange rate; the USD side is spot, never a toman figure run backwards.
 *
 * Each leg is nullable on purpose. Losing one must not blank the other, and
 * every consumer renders a leg it cannot resolve as an em dash — never NaN, and
 * never a stale number wearing a fresh timestamp.
 */

import type { Purity } from './purchase';

/**
 * One leg of the quote, in the leg's canonical unit so no consumer has to know
 * how the provider formatted it: USD per troy ounce for spot gold, toman per
 * gram of that karat for the Tehran quotes.
 */
export type FeedLeg = {
  value: number;
  /** Upstream timestamp, ISO-8601. */
  updatedAt: string;
};

/**
 * The two karats tgju quotes per gram. The other purities Arurem stores are
 * derived from 24K by fineness — see `irtPerGramFor`.
 */
export type IrtGramLegs = {
  '24K': FeedLeg | null;
  '18K': FeedLeg | null;
};

/** The karats with a published quote, derived from the shape above. */
export type IrtKarat = keyof IrtGramLegs;

export type MarketQuote = {
  /** Spot gold, USD per troy ounce of fine gold. */
  goldUsdPerOunce: FeedLeg | null;
  /** Tehran's own per-gram quotes, in toman, per karat. */
  goldIrtPerGram: IrtGramLegs;
  /** When this client last completed a fetch, ISO-8601. */
  fetchedAt: string;
};

/**
 * `stale` is the important one: real numbers, but from an earlier fetch. The UI
 * shows them with an "as of" stamp rather than blanking out — a valuation that
 * flickers to a dash on every dropped request reads as broken.
 */
export type MarketRatesStatus = 'loading' | 'ready' | 'stale' | 'unavailable';

export type MarketRates = {
  quote: MarketQuote | null;
  status: MarketRatesStatus;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => void;
};

/** Gross grams held at one karat — what a per-karat valuation consumes. */
export type HoldingSlice = {
  purity: Purity;
  grossGrams: number;
};

export type GoldValuation = {
  grossGrams: number;
  fineGrams: number;
  /** Fine grams × spot, or null when the spot leg is unavailable. */
  usd: number | null;
  /** Σ gross grams × that karat's own quote; null if any quote a holding needs is missing. */
  irt: number | null;
  /** Spot, USD per fine gram. */
  usdPerGram: number | null;
  /**
   * Portfolio toman per *fine* gram. Meaningful only because it is derived from
   * this holding's karat mix — it must never be presented as a market price.
   */
  irtPerFineGram: number | null;
};

export type PriceTrend = 'up' | 'down' | 'flat';

/** What the flash affordance needs: direction plus a nonce to restart the CSS. */
export type ValueFlash = {
  trend: PriceTrend;
  /** Increments on every change so a repeated trend re-triggers the animation. */
  nonce: number;
};
