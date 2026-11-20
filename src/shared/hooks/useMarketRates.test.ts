import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POLL_INTERVAL_MS, useMarketRates } from './useMarketRates';

/**
 * The polling cadence, locked by a test.
 *
 * This app makes exactly two network requests and they are the only traffic it
 * generates, so the interval is a product decision rather than a tuning knob:
 * five minutes. A well-meaning "make the price feel live" edit has to change
 * this file too, and argue with the numbers below.
 *
 * The literals are written out on purpose. Asserting against
 * `POLL_INTERVAL_MS` would make these tests agree with whatever the hook
 * happens to do, which is the one thing a lock must not do.
 */

const FIVE_MINUTES_MS = 300_000;

const goldOk = () =>
  new Response(JSON.stringify({ price: 3110.34768, updatedAt: '2026-11-20T13:00:00Z' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const irtOk = () =>
  new Response(
    JSON.stringify({
      response: {
        indicators: [
          { name: 'geram18', p: '242867000', updated_at: '2026-11-20 19:40:05' },
          { name: 'geram24', p: '323819000', updated_at: '2026-11-20 19:40:05' },
        ],
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

const stubFeed = () => {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('gold-api')) return Promise.resolve(goldOk());
    if (url.includes('tgju')) return Promise.resolve(irtOk());
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('useMarketRates — polling cadence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('polls every five minutes', () => {
    expect(POLL_INTERVAL_MS).toBe(FIVE_MINUTES_MS);
  });

  it('issues no refresh for at least four minutes', async () => {
    const fetchMock = stubFeed();
    renderHook(() => useMarketRates());

    // Two legs on boot only.
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // A 30s cadence would have fired eight times by now.
    await vi.advanceTimersByTimeAsync(240_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes once the five-minute interval elapses', async () => {
    const fetchMock = stubFeed();
    renderHook(() => useMarketRates());

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(FIVE_MINUTES_MS);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
  });
});
