import { fetchMarketLegs } from '@/shared/lib/spotFeed';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FeedLeg,
  IrtGramLegs,
  MarketQuote,
  MarketRates,
  MarketRatesStatus,
} from '@/types/market';

/**
 * Live rates, polled.
 *
 * Polling rather than a WebSocket: neither provider offers one, and a socket to
 * a third party would mean a second protocol, a reconnect state machine, and an
 * open connection on a PWA that may sit backgrounded for days. A 30s interval
 * against feeds that themselves cache costs nothing and cannot leak.
 *
 * Three rules this hook exists to enforce:
 *
 *  1. **Never discard good data.** A failed refresh keeps the last quote and
 *     flips status to `stale`. A valuation that blanks out because one request
 *     timed out is worse than one labelled "as of 14:02".
 *  2. **Never poll a hidden tab.** Browsers throttle background timers and the
 *     tab may be suspended for hours; fetching on return is both accurate and
 *     cheap. Returning to the tab forces a fetch rather than waiting out the
 *     interval.
 *  3. **Never re-render for an identical quote.** The new quote is compared
 *     field by field before it is committed.
 */

const REFRESH_MS = 30_000;

const sameLeg = (a: FeedLeg | null, b: FeedLeg | null): boolean =>
  a === b || (a !== null && b !== null && a.value === b.value && a.updatedAt === b.updatedAt);

const sameIrtLegs = (a: IrtGramLegs, b: IrtGramLegs): boolean =>
  sameLeg(a['24K'], b['24K']) && sameLeg(a['18K'], b['18K']);

const sameQuote = (a: MarketQuote | null, b: MarketQuote | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    sameLeg(a.goldUsdPerOunce, b.goldUsdPerOunce) &&
    sameIrtLegs(a.goldIrtPerGram, b.goldIrtPerGram));

export const useMarketRates = (): MarketRates => {
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [status, setStatus] = useState<MarketRatesStatus>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs, not state: these are read inside async callbacks to decide *whether*
  // to commit a render, so they must not themselves trigger one.
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const latest = useRef<MarketQuote | null>(null);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (mounted.current) setIsRefreshing(true);

    try {
      const { gold, irt } = await fetchMarketLegs();
      if (!mounted.current) return;

      // Every leg down is a genuine outage; one leg alone is a partial answer,
      // which is still worth showing.
      if (gold === null && irt['24K'] === null && irt['18K'] === null) {
        setError('Market data is unreachable right now.');
        setStatus(latest.current ? 'stale' : 'unavailable');
        return;
      }

      const next: MarketQuote = {
        goldUsdPerOunce: gold,
        goldIrtPerGram: irt,
        fetchedAt: new Date().toISOString(),
      };

      if (!sameQuote(latest.current, next)) {
        latest.current = next;
        setQuote(next);
      }

      setError(null);
      setStatus('ready');
    } catch (caught) {
      if (!mounted.current) return;
      setError(caught instanceof Error ? caught.message : 'Could not reach the market feed.');
      setStatus(latest.current ? 'stale' : 'unavailable');
    } finally {
      inFlight.current = false;
      if (mounted.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // The first fetch is deliberately NOT visibility-gated. A page opened in a
    // background tab or restored from a session is hidden at mount; skipping
    // the request there would leave the dashboard reading "Fetching…" until the
    // user happened to focus the tab. One GET on boot is cheap; a stale-looking
    // first impression is not. Only the *interval* is gated.
    const boot = () => void load();
    boot();

    const tick = () => {
      if (document.visibilityState === 'visible') void load();
    };

    const timer = window.setInterval(tick, REFRESH_MS);

    // Returning to the tab is the one moment the price is most likely to be
    // wrong, so it forces a fetch instead of waiting out the interval.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return { quote, status, isRefreshing, error, refresh };
};
