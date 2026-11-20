import { describe, expect, it } from 'vitest';
import { equivalentGrams, irtPerGramFor, trendBetween, usdPerGram, valuateGrams, valuateHoldings } from './valuation';
import type { MarketQuote } from '@/types/market';

/**
 * Prices are deliberately realistic: tgju's real quotes for the day this was
 * written were 24K = 32,381,900 and 18K = 24,286,700 toman per gram, a ratio of
 * 0.750008 — which is what makes the fineness derivation below checkable.
 */
const quote = (overrides: Partial<MarketQuote> = {}): MarketQuote => ({
  goldUsdPerOunce: { value: 3110.34768, updatedAt: '2026-11-20T13:00:00.000Z' },
  goldIrtPerGram: {
    '24K': { value: 32_381_900, updatedAt: '2026-11-20T16:10:05.000Z' },
    '18K': { value: 24_286_700, updatedAt: '2026-11-20T16:10:05.000Z' },
  },
  fetchedAt: '2026-11-20T16:10:06.000Z',
  ...overrides,
});

describe('usdPerGram', () => {
  it('derives the per-gram price from the ounce price', () => {
    // 3110.34768 / 31.1034768 = exactly 100 USD/g.
    expect(usdPerGram(quote())).toBeCloseTo(100, 8);
  });

  it('returns null rather than a partial answer when the leg is missing', () => {
    expect(usdPerGram(null)).toBeNull();
    expect(usdPerGram(quote({ goldUsdPerOunce: null }))).toBeNull();
    expect(usdPerGram(quote({ goldUsdPerOunce: { value: 0, updatedAt: '' } }))).toBeNull();
  });

  it('is independent of the Tehran legs', () => {
    // The two markets are never chained: losing every toman quote must not stop
    // the USD figure from being reported.
    const noIrt = quote({ goldIrtPerGram: { '24K': null, '18K': null } });
    expect(usdPerGram(noIrt)).toBeCloseTo(100, 8);
  });
});

describe('irtPerGramFor', () => {
  it('reads the published quote for a karat tgju prices directly', () => {
    expect(irtPerGramFor('24K', quote())).toBe(32_381_900);
    expect(irtPerGramFor('18K', quote())).toBe(24_286_700);
  });

  it('derives an unpublished karat from 24K by fineness', () => {
    // 22K has no gram quote on tgju; 0.9167 of 24K is the same ratio the market
    // itself uses between 18K and 24K (0.750008 measured).
    expect(irtPerGramFor('22K', quote())).toBeCloseTo(32_381_900 * 0.9167, 4);
    expect(irtPerGramFor('Bullion', quote())).toBeCloseTo(32_381_900 * 0.9999, 4);
  });

  it('scales 18K from 24K within 0.1% of the published 18K quote', () => {
    // Not an assertion the app relies on, but it proves the derivation is the
    // market's own proportional relationship and not an invented one.
    const derived = (irtPerGramFor('24K', quote()) ?? 0) * 0.75;
    const published = irtPerGramFor('18K', quote()) ?? 0;
    expect(Math.abs(derived - published) / published).toBeLessThan(0.001);
  });

  it('returns null when the base quote it needs is missing', () => {
    expect(irtPerGramFor('24K', null)).toBeNull();
    const no24 = quote({ goldIrtPerGram: { '24K': null, '18K': quote().goldIrtPerGram['18K'] } });
    expect(irtPerGramFor('24K', no24)).toBeNull();
    expect(irtPerGramFor('22K', no24)).toBeNull();
    expect(irtPerGramFor('18K', no24)).toBe(24_286_700);
  });

  it('treats a zero or negative quote as absent', () => {
    const zeroed = quote({
      goldIrtPerGram: {
        '24K': { value: 0, updatedAt: '' },
        '18K': { value: -1, updatedAt: '' },
      },
    });
    expect(irtPerGramFor('24K', zeroed)).toBeNull();
    expect(irtPerGramFor('18K', zeroed)).toBeNull();
  });
});

describe('valuateHoldings', () => {
  it('prices each karat at its own quote, not at a blended rate', () => {
    const value = valuateHoldings(
      [
        { purity: '24K', grossGrams: 10 },
        { purity: '18K', grossGrams: 10 },
      ],
      quote(),
    );

    // 10 × 32,381,900 + 10 × 24,286,700. A blended per-gram price times 20 g
    // would give 566,686,000 and be wrong by 150,000.
    expect(value.irt).toBeCloseTo(566_686_000, 3);
    expect(value.grossGrams).toBe(20);
    expect(value.fineGrams).toBeCloseTo(10 * 0.9999 + 10 * 0.75, 6);
  });

  it('values USD from fine grams and spot, independent of the karat mix', () => {
    const mixed = valuateHoldings(
      [
        { purity: '24K', grossGrams: 10 },
        { purity: '18K', grossGrams: 10 },
      ],
      quote(),
    );
    const fineGrams = 10 * 0.9999 + 10 * 0.75;

    expect(mixed.usd).toBeCloseTo(100 * fineGrams, 6);
    expect(mixed.fineGrams).toBeCloseTo(fineGrams, 6);
  });

  it('nullifies the toman total when any slice lacks a quote', () => {
    // Summing the slices that do resolve would silently understate the holding.
    const no18 = quote({ goldIrtPerGram: { '24K': quote().goldIrtPerGram['24K'], '18K': null } });
    const value = valuateHoldings(
      [
        { purity: '24K', grossGrams: 10 },
        { purity: '18K', grossGrams: 10 },
      ],
      no18,
    );

    expect(value.irt).toBeNull();
    expect(value.irtPerFineGram).toBeNull();
    // USD needs only spot, so it still resolves.
    expect(value.usd).toBeCloseTo(100 * (9.999 + 7.5), 6);
  });

  it('derives a portfolio toman-per-fine-gram from the actual mix', () => {
    const value = valuateHoldings([{ purity: '18K', grossGrams: 10 }], quote());

    // 18K: 10 g gross = 7.5 g fine, worth 242,867,000 → 32,382,266.67 per fine g,
    // which is 18K's own price divided by 0.75. Not a market 24K quote.
    expect(value.irtPerFineGram).toBeCloseTo(24_286_700 / 0.75, 4);
    expect(value.irtPerFineGram).not.toBeCloseTo(32_381_900, 0);
  });

  it('values an empty holding at zero, not null, when prices are known', () => {
    const value = valuateHoldings([], quote());
    expect(value.usd).toBe(0);
    expect(value.irt).toBe(0);
    expect(value.irtPerFineGram).toBeNull();
  });

  it('keeps null when the price is unknown, even for real weight', () => {
    // No quote must not collapse to 0, which would read as "worthless".
    const value = valuateHoldings([{ purity: '24K', grossGrams: 250 }], null);
    expect(value.usd).toBeNull();
    expect(value.irt).toBeNull();
    expect(value.grossGrams).toBe(250);
  });

  it('coerces a non-finite or negative weight to zero without poisoning prices', () => {
    const value = valuateHoldings(
      [
        { purity: '24K', grossGrams: Number.NaN },
        { purity: '18K', grossGrams: -5 },
      ],
      quote(),
    );

    expect(value.grossGrams).toBe(0);
    expect(value.fineGrams).toBe(0);
    expect(value.usd).toBe(0);
    expect(value.irt).toBe(0);
  });
});

describe('valuateGrams', () => {
  it('is the single-karat case of valuateHoldings', () => {
    const value = valuateGrams(10, '24K', quote());
    expect(value.usd).toBeCloseTo(100 * 9.999, 6);
    expect(value.irt).toBeCloseTo(323_819_000, 3);
  });
});

describe('equivalentGrams', () => {
  it('restates fine gold as grams of a lower karat by dividing by fineness', () => {
    // 100 g of 24K is 99.99 g fine, which is 133.32 g *of 18K product* — more
    // grams, not fewer, because each 18K gram is only three-quarters gold.
    expect(equivalentGrams(99.99, '18K')).toBeCloseTo(133.32, 6);
    expect(equivalentGrams(174.99, '18K')).toBeCloseTo(233.32, 6);
  });

  it('is the identity for 24K apart from its fineness factor', () => {
    expect(equivalentGrams(99.99, '24K')).toBeCloseTo(99.99 / 0.9999, 6);
  });

  it('preserves zero and rejects unusable input', () => {
    expect(equivalentGrams(0, '18K')).toBe(0);
    expect(equivalentGrams(-1, '18K')).toBeNull();
    expect(equivalentGrams(Number.NaN, '18K')).toBeNull();
  });
});

describe('trendBetween', () => {
  it('reports direction above the noise floor', () => {
    expect(trendBetween(100, 101)).toBe('up');
    expect(trendBetween(100, 99)).toBe('down');
  });

  it('treats sub-basis-point drift as flat', () => {
    // A Tehran quote moves in thousands of toman; flashing on that would strobe.
    expect(trendBetween(100, 100.001)).toBe('flat');
    expect(trendBetween(100, 99.999)).toBe('flat');
  });

  it('is flat whenever either side is unknown', () => {
    expect(trendBetween(null, 100)).toBe('flat');
    expect(trendBetween(100, null)).toBe('flat');
    expect(trendBetween(0, 100)).toBe('flat');
    expect(trendBetween(Number.NaN, 100)).toBe('flat');
  });
});
