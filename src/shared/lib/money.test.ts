import { describe, expect, it } from 'vitest';
import { formatToman, formatTomanCompact, formatUsd, formatUsdWhole } from './money';

/**
 * Currency formatting is a correctness surface, not a cosmetic one: a gold
 * ledger that shows rial instead of toman, or loses a digit, is wrong in a way
 * the user cannot see.
 */

describe('formatUsd', () => {
  it('keeps cents for per-gram prices', () => {
    expect(formatUsd(114.95)).toBe('$114.95');
    expect(formatUsd(3575.649902)).toBe('$3,575.65');
  });

  it('renders an em dash for missing data instead of NaN', () => {
    expect(formatUsd(null)).toBe('—');
    expect(formatUsd(Number.NaN)).toBe('—');
    expect(formatUsd(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatUsdWhole', () => {
  it('drops cents on totals where they are noise', () => {
    expect(formatUsdWhole(12044.4)).toBe('$12,044');
  });
});

describe('formatToman', () => {
  it('shows no decimals: toman has no minor unit in practice', () => {
    expect(formatToman(266245)).toBe('266,245');
    expect(formatToman(2_662_450_000)).toBe('2,662,450,000');
  });

  it('keeps Latin digits so a toman column stays readable next to a USD one', () => {
    // fa-IR would emit Persian-Indic digits; the `-u-nu-latn` extension pins
    // Latin, and this test is the lock on that choice.
    expect(formatToman(1234)).toMatch(/^[0-9,]+$/);
  });

  it('rounds away fractional toman rather than showing them', () => {
    expect(formatToman(266245.7)).toBe('266,246');
  });

  it('renders an em dash for missing data', () => {
    expect(formatToman(null)).toBe('—');
  });
});

describe('formatTomanCompact', () => {
  it('compacts figures that would overflow a narrow tile', () => {
    expect(formatTomanCompact(2_662_450_000)).toBe('2.66B');
  });

  it('leaves small figures alone', () => {
    expect(formatTomanCompact(1240)).toBe('1,240');
  });
});
