import { FINENESS } from '@/constants/fineness';
import { TROY_OUNCE_GRAMS } from './spotFeed';
import type { GoldValuation, HoldingSlice, MarketQuote, PriceTrend } from '@/types/market';
import type { Purity } from '@/types/purchase';

/**
 * Grams → money. Pure; no fetch, no React, no formatting.
 *
 * The two currencies are derived from two different sources on purpose:
 *
 *   USD  spot per fine gram              (global market)
 *   IRT  the Tehran quote for each karat (Iranian market)
 *
 * They are deliberately *not* linked by an exchange rate. Iran's gold price
 * carries an import premium over spot that breathes on its own, so converting
 * one into the other produces a figure that matches neither market — which is
 * exactly the bug this module now exists to avoid.
 */

export const usdPerGram = (quote: MarketQuote | null): number | null => {
  const leg = quote?.goldUsdPerOunce;
  if (!leg || !Number.isFinite(leg.value) || leg.value <= 0) return null;
  return leg.value / TROY_OUNCE_GRAMS;
};

/**
 * Toman per gram at a given karat, read from the published quote where one
 * exists and scaled from 24K where it does not. tgju publishes 18K and 24K; 22K
 * and Bullion are pure-fineness derivatives of 24K, the same proportional
 * relationship the market's own 18K/24K pair obeys to within a few hundred
 * toman per gram.
 */
export const irtPerGramFor = (purity: Purity, quote: MarketQuote | null): number | null => {
  const legs = quote?.goldIrtPerGram;
  if (!legs) return null;

  if (purity === '18K') return usable(legs['18K']?.value);
  if (purity === '24K') return usable(legs['24K']?.value);

  const base = usable(legs['24K']?.value);
  if (base === null) return null;
  return base * FINENESS[purity];
};

const usable = (value: number | undefined): number | null =>
  value === undefined || !Number.isFinite(value) || value <= 0 ? null : value;

/**
 * Value a holding made of several karats.
 *
 * Each slice is priced at its own karat's quote, never at a single blended
 * per-gram figure: 10 g of 18K and 10 g of 24K are not worth the same, and
 * averaging their price before multiplying gets the total wrong even though
 * every intermediate number looks reasonable.
 *
 * A slice whose quote is missing makes the whole toman total null. Summing the
 * slices that happen to resolve would silently understate the holding.
 */
export const valuateHoldings = (
  slices: readonly HoldingSlice[],
  quote: MarketQuote | null,
): GoldValuation => {
  const gross = slices.reduce((sum, slice) => sum + safeGrams(slice.grossGrams), 0);
  const fine = slices.reduce(
    (sum, slice) => sum + safeGrams(slice.grossGrams) * FINENESS[slice.purity],
    0,
  );

  const perGramUsd = usdPerGram(quote);

  let irt: number | null = 0;
  for (const slice of slices) {
    const grams = safeGrams(slice.grossGrams);
    if (grams === 0) continue;
    const perGram = irtPerGramFor(slice.purity, quote);
    if (perGram === null) {
      irt = null;
      break;
    }
    irt += grams * perGram;
  }

  return {
    grossGrams: gross,
    fineGrams: fine,
    usd: perGramUsd === null ? null : perGramUsd * fine,
    irt,
    usdPerGram: perGramUsd,
    irtPerFineGram: irt === null || fine === 0 ? null : irt / fine,
  };
};

/** A single-purity shortcut, kept for callers that hold only one karat. */
export const valuateGrams = (
  grams: number,
  purity: Purity,
  quote: MarketQuote | null,
): GoldValuation => valuateHoldings([{ purity, grossGrams: grams }], quote);

/**
 * Pure gold restated as grams of one karat: "what this would weigh in 18K".
 *
 * Divides by fineness, never multiplies — a 24K holding is *more* 18K grams
 * than it is 24K grams, because 18K grams are only three-quarters gold. This is
 * the number Iranian sellers quote in, and the reason a 100 g 24K bar reads as
 * 133.32 g at 18K.
 */
export const equivalentGrams = (fineGrams: number, purity: Purity): number | null => {
  if (!Number.isFinite(fineGrams) || fineGrams < 0) return null;
  const fineness = FINENESS[purity];
  return fineness > 0 ? fineGrams / fineness : null;
};

const safeGrams = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

/**
 * Direction between two per-gram prices.
 *
 * The threshold is not zero on purpose. A live Tehran quote moves by thousands
 * of toman within a minute while spot moves in the fourth figure; flashing
 * green/red on drift that no desk would transact at would make the card strobe
 * without telling the user anything. Half a basis point is below what any retail
 * gold desk quotes, so anything smaller reads as "flat".
 */
const FLAT_THRESHOLD = 0.00005;

export const trendBetween = (previous: number | null, next: number | null): PriceTrend => {
  if (previous === null || next === null) return 'flat';
  if (!Number.isFinite(previous) || !Number.isFinite(next) || previous <= 0) return 'flat';

  const delta = (next - previous) / previous;
  if (Math.abs(delta) < FLAT_THRESHOLD) return 'flat';
  return delta > 0 ? 'up' : 'down';
};
