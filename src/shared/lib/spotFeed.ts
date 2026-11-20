import type { FeedLeg, IrtGramLegs, IrtKarat } from '@/types/market';

/**
 * Live market feed.
 *
 * Two providers, both CORS-enabled and keyless, because a client-only PWA has
 * no server to proxy through:
 *
 *   USD   api.gold-api.com/price/XAU          USD per troy ounce, ~6s cache
 *   IRT   api.tgju.org/v1/widget/tmp          Tehran per-gram quotes, live
 *
 * The toman figures are NOT converted from the USD spot price. Iranian gold is
 * its own market: it carries an import premium that moves independently of
 * spot, so a converted figure is wrong by however much that premium happens to
 * be — several percent on a normal day. tgju publishes the price the bazaar
 * actually transacts at, per gram, per karat, so it is read directly.
 *
 * Karat logic follows tgju exactly:
 *
 *   24K  geram24 — طلای ۲۴ عیار, price of one gram of 24K
 *   18K  geram18 — طلای ۱۸ عیار / 750, price of one gram of 18K
 *
 * The other two purities Arurem stores (22K, Bullion) have no published gram
 * quote; they are derived from 24K by fineness in `valuation.ts`. That is not a
 * guess at the market — it is the same proportional relationship tgju's own
 * 18K/24K pair obeys to within rounding.
 *
 * Both karats are one request: tgju's `keys` parameter takes a list, so the two
 * figures always share a timestamp. The summary-table endpoint is kept as a
 * per-karat fallback for the day the widget route changes shape.
 */

export const TROY_OUNCE_GRAMS = 31.1034768;

const GOLD_ENDPOINT = 'https://api.gold-api.com/price/XAU';
const IRT_WIDGET_ENDPOINT = 'https://api.tgju.org/v1/widget/tmp?keys=geram18,geram24';
const IRT_TABLE_ENDPOINT = 'https://api.tgju.org/v1/market/indicator/summary-table-data';

const RIAL_PER_TOMAN = 10;
const REQUEST_TIMEOUT_MS = 8_000;

/** Iran has kept UTC+03:30 year-round since it dropped DST in 2022. */
const TEHRAN_OFFSET = '+03:30';

/** tgju's indicator slugs, keyed by the karat they price. */
export const IRT_KARAT_SLUGS: Record<IrtKarat, string> = {
  '24K': 'geram24',
  '18K': 'geram18',
};

/**
 * tgju embeds the day-over-day delta in a span of HTML. We only need numeric
 * cells, so the markup is stripped rather than parsed — the shape of that span
 * is not a contract worth depending on.
 */
const parseLooseNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/<[^>]*>/g, '').replace(/[,\s%]/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const fetchJson = async (url: string, label: string): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`${label} responded ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`${label} timed out`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * tgju stamps quotes as Tehran wall-clock (`2026-11-20 19:40:05`) with no zone.
 * The offset is attached explicitly instead of letting `new Date` read it as the
 * viewer's local time, which would misdate every quote from a browser abroad.
 */
const parseTehranStamp = (value: unknown, fallback: Date): string => {
  if (typeof value !== 'string') return fallback.toISOString();
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return fallback.toISOString();
  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${TEHRAN_OFFSET}`);
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
};

/** `value` = spot XAU in USD; `updatedAt` = provider's own timestamp. */
export const parseGoldLeg = (payload: unknown, now: Date): FeedLeg | null => {
  if (!isRecord(payload)) return null;

  const price = parseLooseNumber(payload.price);
  if (price === null || price <= 0) return null;

  // The field is optional in practice: some responses carry only `price`.
  const updatedAt =
    typeof payload.updatedAt === 'string' && !Number.isNaN(new Date(payload.updatedAt).getTime())
      ? new Date(payload.updatedAt).toISOString()
      : now.toISOString();

  return { value: price, updatedAt };
};

/**
 * tgju's widget payload: one entry per requested indicator, `p` in rial per
 * gram. Absent or unusable karats come back null rather than zero so a missing
 * quote can never price a holding at nothing.
 */
export const parseIrtWidgetLegs = (payload: unknown, now: Date): IrtGramLegs => {
  const legs: IrtGramLegs = { '24K': null, '18K': null };
  const indicators = isRecord(payload) && isRecord(payload.response) ? payload.response.indicators : null;
  if (!Array.isArray(indicators)) return legs;

  for (const karat of Object.keys(IRT_KARAT_SLUGS) as IrtKarat[]) {
    const slug = IRT_KARAT_SLUGS[karat];
    const indicator = indicators.find(
      (entry): entry is Record<string, unknown> => isRecord(entry) && entry.name === slug,
    );

    const rial = indicator ? parseLooseNumber(indicator.p) : null;
    if (indicator === undefined || rial === null || rial <= 0) continue;

    legs[karat] = {
      value: rial / RIAL_PER_TOMAN,
      updatedAt: parseTehranStamp(indicator.updated_at, now),
    };
  }

  return legs;
};

/**
 * Fallback: newest row of tgju's per-karat history table. Column 3 is the last
 * traded price in rial, column 6 the Gregorian date. Date-only, so it is
 * anchored at Tehran noon to keep a timezone shift from moving it a day.
 */
export const parseIrtTableLeg = (payload: unknown, now: Date): FeedLeg | null => {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return null;

  const newest = payload.data[0];
  if (!Array.isArray(newest) || newest.length < 7) return null;

  const rial = parseLooseNumber(newest[3]);
  if (rial === null || rial <= 0) return null;

  const dateCell = newest[6];
  const updatedAt =
    typeof dateCell === 'string' && /^\d{4}\/\d{2}\/\d{2}$/.test(dateCell)
      ? new Date(`${dateCell.replace(/\//g, '-')}T12:00:00${TEHRAN_OFFSET}`).toISOString()
      : now.toISOString();

  return { value: rial / RIAL_PER_TOMAN, updatedAt };
};

const EMPTY_LEGS = (): IrtGramLegs => ({ '24K': null, '18K': null });

/**
 * Both providers are fetched in parallel and failures are swallowed per leg. A
 * combined throw here would mean a flaky Iranian endpoint takes down a USD spot
 * price that had already arrived successfully.
 */
export const fetchMarketLegs = async (
  signal?: AbortSignal,
): Promise<{ gold: FeedLeg | null; irt: IrtGramLegs }> => {
  const now = new Date();
  const [gold, widget] = await Promise.allSettled([
    fetchJson(GOLD_ENDPOINT, 'Gold feed'),
    fetchJson(IRT_WIDGET_ENDPOINT, 'Tehran gold feed'),
  ]);

  if (signal?.aborted) return { gold: null, irt: EMPTY_LEGS() };

  const irt = widget.status === 'fulfilled' ? parseIrtWidgetLegs(widget.value, now) : EMPTY_LEGS();

  // Fill only the karats the widget did not deliver; a healthy widget response
  // never triggers these requests.
  const missing = (Object.keys(IRT_KARAT_SLUGS) as IrtKarat[]).filter(
    (karat) => irt[karat] === null,
  );

  if (missing.length > 0) {
    const fallbacks = await Promise.allSettled(
      missing.map((karat) => fetchJson(`${IRT_TABLE_ENDPOINT}/${IRT_KARAT_SLUGS[karat]}`, 'Tehran gold feed')),
    );

    missing.forEach((karat, index) => {
      const result = fallbacks[index];
      if (result.status === 'fulfilled') {
        irt[karat] = parseIrtTableLeg(result.value, now);
      }
    });
  }

  if (signal?.aborted) return { gold: null, irt: EMPTY_LEGS() };

  return {
    gold: gold.status === 'fulfilled' ? parseGoldLeg(gold.value, now) : null,
    irt,
  };
};
