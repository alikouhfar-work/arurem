import { describe, expect, it } from 'vitest';
import { parseGoldLeg, parseIrtTableLeg, parseIrtWidgetLegs } from './spotFeed';

/**
 * Feed parsing is the boundary between untrusted JSON and every number the app
 * displays, so each provider quirk gets an explicit test. The fixtures below are
 * trimmed copies of real responses, including the HTML spans tgju embeds.
 */

describe('parseGoldLeg', () => {
  const now = new Date('2026-11-20T13:05:00.000Z');

  it('reads the spot price and the provider timestamp', () => {
    const leg = parseGoldLeg(
      {
        currency: 'USD',
        price: 3575.649902,
        updatedAt: '2026-11-20T13:01:36Z',
        updatedAtReadable: 'a few seconds ago',
      },
      now,
    );

    expect(leg).toEqual({ value: 3575.649902, updatedAt: '2026-11-20T13:01:36.000Z' });
  });

  it('falls back to now when the timestamp is missing or unparseable', () => {
    expect(parseGoldLeg({ price: 3500 }, now)?.updatedAt).toBe(now.toISOString());
    expect(parseGoldLeg({ price: 3500, updatedAt: 'not-a-date' }, now)?.updatedAt).toBe(
      now.toISOString(),
    );
  });

  it('rejects payloads it cannot price rather than returning zero', () => {
    // Zero would silently render "$0.00" — a wrong number, not a missing one.
    expect(parseGoldLeg({ price: 0 }, now)).toBeNull();
    expect(parseGoldLeg({ price: -10 }, now)).toBeNull();
    expect(parseGoldLeg({ price: 'abc' }, now)).toBeNull();
    expect(parseGoldLeg({}, now)).toBeNull();
    expect(parseGoldLeg(null, now)).toBeNull();
  });
});

describe('parseIrtWidgetLegs', () => {
  const now = new Date('2026-11-20T16:10:00.000Z');

  // Verbatim from api.tgju.org/v1/widget/tmp?keys=geram18,geram24 — rial per
  // gram, Tehran wall-clock timestamp with no zone.
  const indicator = (name: string, p: string) => ({
    name,
    p,
    h: '243559000',
    l: '242500000',
    title: 'x',
    updated_at: '2026-11-20 19:40:05',
  });

  const payload = (...entries: unknown[]) => ({ response: { indicators: entries } });

  it('converts the published rial gram price to toman exactly once', () => {
    const legs = parseIrtWidgetLegs(
      payload(indicator('geram18', '242867000'), indicator('geram24', '323819000')),
      now,
    );

    expect(legs['18K']?.value).toBe(24_286_700);
    expect(legs['24K']?.value).toBe(32_381_900);
  });

  it('reads the Tehran timestamp as UTC+03:30, not the viewer’s local time', () => {
    const legs = parseIrtWidgetLegs(payload(indicator('geram24', '323819000')), now);

    // 19:40:05 in Tehran is 16:10:05Z. A Date parsed without the offset would
    // land four hours later in most timezones, misdating an intraday quote.
    expect(legs['24K']?.updatedAt).toBe('2026-11-20T16:10:05.000Z');
  });

  it('leaves a karat null when the provider omits it', () => {
    const legs = parseIrtWidgetLegs(payload(indicator('geram18', '242867000')), now);

    expect(legs['18K']?.value).toBe(24_286_700);
    expect(legs['24K']).toBeNull();
  });

  it('rejects a karat with an unusable price instead of pricing it at zero', () => {
    const legs = parseIrtWidgetLegs(
      payload(indicator('geram24', '0'), indicator('geram18', '—')),
      now,
    );

    expect(legs['24K']).toBeNull();
    expect(legs['18K']).toBeNull();
  });

  it('returns both legs null for a payload it does not recognise', () => {
    for (const bad of [null, {}, { response: {} }, { response: { indicators: 'nope' } }]) {
      expect(parseIrtWidgetLegs(bad, now)).toEqual({ '24K': null, '18K': null });
    }
  });
});

describe('parseIrtTableLeg', () => {
  const now = new Date('2026-11-20T16:10:00.000Z');

  // [open, low, high, close, change, percent, gregorian, jalali]
  const row = (close: string, date: string) => [
    '243,093,000',
    '242,500,000',
    '243,559,000',
    close,
    '<span class="low" dir="ltr">1729000</span>',
    '<span class="low" dir="ltr">0.71%</span>',
    date,
    '1405/08/28',
  ];

  it('reads the latest traded gram price as toman and anchors the date in Tehran', () => {
    const leg = parseIrtTableLeg({ data: [row('242,867,000', '2026/11/19')] }, now);

    expect(leg?.value).toBe(24_286_700);
    expect(leg?.updatedAt).toBe('2026-11-19T08:30:00.000Z');
  });

  it('strips markup from the numeric cells instead of depending on their shape', () => {
    const leg = parseIrtTableLeg({ data: [row('<b>242,867,000</b>', '2026/11/19')] }, now);

    expect(leg?.value).toBe(24_286_700);
  });

  it('rejects an empty table or a non-numeric close', () => {
    expect(parseIrtTableLeg({ data: [] }, now)).toBeNull();
    expect(parseIrtTableLeg({ data: [[]] }, now)).toBeNull();
    expect(parseIrtTableLeg({ data: [row('—', '2026/11/19')] }, now)).toBeNull();
    expect(parseIrtTableLeg({}, now)).toBeNull();
    expect(parseIrtTableLeg({ data: 'nope' }, now)).toBeNull();
  });
});
