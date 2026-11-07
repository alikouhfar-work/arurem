import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_KEY, STORAGE_KEY, loadPurchases, persistPurchases } from './storage';
import type { LoadResult } from '@/types/storage';
import type { Purchase } from '@/types/purchase';

const row = (overrides: Partial<Purchase> = {}): Purchase => ({
  id: 'fixed-id',
  sellerName: 'Royal Treasury',
  weight: 100,
  purity: '24K',
  note: 'bars',
  acquiredAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-03-01T10:00:00.000Z',
  ...overrides,
});

describe('storage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips purchases through the envelope', () => {
    persistPurchases([row()]);
    const result: LoadResult = loadPurchases();
    expect(result.purchases).toHaveLength(1);
    expect(result.purchases[0]?.sellerName).toBe('Royal Treasury');
    expect(result.migrated).toBe(false);
    expect(result.recoveredFromCorruption).toBe(false);
  });

  it('writes a versioned envelope', () => {
    persistPurchases([row()]);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(raw.version).toBe(2);
    expect(Array.isArray(raw.purchases)).toBe(true);
  });

  it('returns empty state when nothing is stored', () => {
    expect(loadPurchases().purchases).toEqual([]);
  });

  it('recovers from unparseable JSON instead of throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const result = loadPurchases();
    expect(result.purchases).toEqual([]);
    expect(result.recoveredFromCorruption).toBe(true);
  });

  it('migrates the v1 legacy key and rewrites it under the new key', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({
        purchases: [
          // Legacy shape: Date serialised to a string, no acquiredAt field.
          {
            id: 'legacy-1',
            sellerName: 'Old Vendor',
            weight: 12.5,
            purity: '22K',
            createdAt: '2022-05-05T00:00:00.000Z',
          },
        ],
      }),
    );

    const result = loadPurchases();
    expect(result.migrated).toBe(true);
    expect(result.purchases).toHaveLength(1);
    // acquiredAt backfilled from createdAt
    expect(result.purchases[0]?.acquiredAt).toBe('2022-05-05T00:00:00.000Z');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('drops rows that cannot be repaired', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        purchases: [
          { sellerName: '', weight: 10 },
          { sellerName: 'Good', weight: 10, purity: '24K', acquiredAt: '2024-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' },
          { sellerName: 'Negative', weight: -3 },
          null,
          'garbage',
        ],
      }),
    );

    const { purchases } = loadPurchases();
    expect(purchases).toHaveLength(1);
    expect(purchases[0]?.sellerName).toBe('Good');
  });

  it('fills in a missing id and invalid purity', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        purchases: [
          {
            sellerName: 'No Id',
            weight: 5,
            purity: '14K',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    const [purchase] = loadPurchases().purchases;
    expect(purchase?.id).toBeTruthy();
    expect(purchase?.purity).toBe('18K');
  });

  it('throws a readable error when the quota is exceeded', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => persistPurchases([row()])).toThrow(/local storage/i);
    spy.mockRestore();
  });
});
