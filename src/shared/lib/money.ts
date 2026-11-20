/**
 * Money formatting. One module, so the two currencies can never drift into
 * different decimal conventions.
 *
 * Rules that are deliberate, not incidental:
 *
 *  - USD uses `Intl` currency style: "$3,575.65". Cents matter for a per-gram
 *    price; they are noise for a portfolio total, so large totals drop them.
 *  - IRT (Iranian toman) uses `fa-IR` *with Latin digits* and zero decimals.
 *    Toman has no minor unit in practice — the rial is 1/10 of it — so showing
 *    decimals would imply a precision the market does not quote. Latin digits
 *    keep the column readable next to the USD figure and keep the `en` UI
 *    consistent; the grouping separator is locale-correct.
 *  - A non-finite or missing value renders an em dash, never "NaN". A price
 *    that could not be fetched must look absent, not broken.
 */

const EM_DASH = '—';

const tomanWhole = new Intl.NumberFormat('fa-IR-u-nu-latn', {
  maximumFractionDigits: 0,
});

const tomanCompact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const usdExact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const isUsable = (value: number): boolean => Number.isFinite(value);

/**
 * Rial is exactly ten toman, and tgju.org publishes in rial. Exposing the rial
 * figure next to the toman one is what lets a user reconcile our number against
 * the source in one glance: tgju shows 242,867,000, we show 24,286,700 toman
 * and 242,867,000 rial. Without that pairing the ten-times gap reads as an
 * error rather than a unit difference.
 */
const RIAL_PER_TOMAN = 10;

/** "$3,575.65" — per-gram prices, spot rates. Missing data renders an em dash. */
export const formatUsd = (value: number | null): string =>
  value !== null && isUsable(value) ? usdExact.format(value) : EM_DASH;

/** "$12,044" — totals in the cents-noise regime. */
export const formatUsdWhole = (value: number | null): string =>
  value !== null && isUsable(value) ? usdWhole.format(value) : EM_DASH;

/** "$12.04K" / "$1.2M" — tight tiles where the full figure will not fit. */
export const formatUsdCompact = (value: number | null): string => {
  if (value === null || !isUsable(value)) return EM_DASH;
  return Math.abs(value) >= 100_000 ? usdCompact.format(value) : usdWhole.format(value);
};

/** "3,206,745,120" — toman, no symbol. The caller supplies the unit label. */
export const formatToman = (value: number | null): string =>
  value !== null && isUsable(value) ? tomanWhole.format(value) : EM_DASH;

/** "3.21B" — compact toman for narrow tiles. Below the compact threshold the
 *  exact figure fits, so it is shown unrounded rather than as "1.24K". */
export const formatTomanCompact = (value: number | null): string => {
  if (value === null || !isUsable(value)) return EM_DASH;
  return Math.abs(value) >= 100_000 ? tomanCompact.format(value) : tomanWhole.format(value);
};

/** "242,867,000" — the same price in rial, which is the unit tgju.org prints. */
export const formatRial = (toman: number | null): string =>
  toman !== null && isUsable(toman) ? tomanWhole.format(toman * RIAL_PER_TOMAN) : EM_DASH;

/** "24,286,700" → "242,867,000 ریال" — for the reconciliation line. */
export const tomanToRial = (toman: number | null): number | null =>
  toman !== null && isUsable(toman) ? toman * RIAL_PER_TOMAN : null;
