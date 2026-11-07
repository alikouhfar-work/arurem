import { beforeEach, describe, expect, it } from 'vitest';
import { computeStats, filterPurchases, sortPurchases } from './selectors';
import type { Purchase } from '@/types/purchase';

const make = (overrides: Partial<Purchase>): Purchase => ({
  id: overrides.id ?? Math.random().toString(36).slice(2),
  sellerName: 'Vendor',
  weight: 10,
  purity: '24K',
  acquiredAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('computeStats', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty, zeroed summary for no purchases', () => {
    const stats = computeStats([]);
    expect(stats.entryCount).toBe(0);
    expect(stats.vendorCount).toBe(0);
    expect(stats.grossGrams).toBe(0);
    expect(stats.fineGrams).toBe(0);
    expect(stats.vendorShares).toEqual([]);
    expect(stats.purityBreakdown).toEqual([]);
  });

  it('separates gross weight from purity-adjusted fine gold', () => {
    const stats = computeStats([
      make({ weight: 100, purity: '24K' }),
      make({ weight: 100, purity: '18K' }),
    ]);
    expect(stats.grossGrams).toBe(200);
    // 100 * 0.9999 + 100 * 0.75
    expect(stats.fineGrams).toBeCloseTo(174.99, 2);
  });

  it('groups by vendor and ranks by fine gold, not gross weight', () => {
    const stats = computeStats([
      make({ sellerName: 'Heavy Low Karat', weight: 100, purity: '18K' }), // 75 g fine
      make({ sellerName: 'Light High Karat', weight: 80, purity: '24K' }), // ~80 g fine
    ]);
    expect(stats.vendorCount).toBe(2);
    expect(stats.vendorShares[0]?.vendor).toBe('Light High Karat');
    expect(stats.vendorShares[0]?.shareOfFine).toBeGreaterThan(0.5);
  });

  it('counts multiple entries from one vendor as a single vendor', () => {
    const stats = computeStats([
      make({ sellerName: 'Same Vendor', weight: 5 }),
      make({ sellerName: 'Same Vendor', weight: 5 }),
    ]);
    expect(stats.vendorCount).toBe(1);
    expect(stats.vendorShares).toHaveLength(1);
    expect(stats.vendorShares[0]?.vendor).toBe('Same Vendor');
    expect(stats.vendorShares[0]?.fineGrams).toBeCloseTo(10, 2);
  });

  it('builds a purity breakdown that sums to 100%', () => {
    const stats = computeStats([
      make({ weight: 30, purity: '24K' }),
      make({ weight: 70, purity: '18K' }),
    ]);
    const total = stats.purityBreakdown.reduce((sum, row) => sum + row.share, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(stats.purityBreakdown[0]?.purity).toBe('18K');
  });
});

describe('filterPurchases', () => {
  const rows = [
    make({ sellerName: 'Zurich Bullion AG', note: 'allocated bars', purity: 'Bullion', weight: 500 }),
    make({ sellerName: 'Personal Vault', note: 'inherited jewellery', purity: '18K', weight: 84.25 }),
  ];

  it('returns everything for a blank query', () => {
    expect(filterPurchases(rows, '   ')).toHaveLength(2);
  });

  it('matches vendor names case-insensitively', () => {
    expect(filterPurchases(rows, 'zurich')).toHaveLength(1);
  });

  it('matches memo text', () => {
    expect(filterPurchases(rows, 'jewellery')[0]?.sellerName).toBe('Personal Vault');
  });

  it('matches purity and formatted weight', () => {
    expect(filterPurchases(rows, 'bullion')).toHaveLength(1);
    expect(filterPurchases(rows, '84.250')).toHaveLength(1);
  });

  it('returns an empty list for no matches', () => {
    expect(filterPurchases(rows, 'nothing-here')).toEqual([]);
  });
});

describe('sortPurchases', () => {
  const rows = [
    make({ id: 'a', sellerName: 'Beta', weight: 10, acquiredAt: '2024-01-01T00:00:00.000Z' }),
    make({ id: 'b', sellerName: 'Alpha', weight: 30, acquiredAt: '2025-01-01T00:00:00.000Z' }),
    make({ id: 'c', sellerName: 'Gamma', weight: 20, acquiredAt: '2023-01-01T00:00:00.000Z' }),
  ];

  it('sorts newest first', () => {
    expect(sortPurchases(rows, 'acquired-desc').map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts heaviest first', () => {
    expect(sortPurchases(rows, 'weight-desc').map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts vendors alphabetically', () => {
    expect(sortPurchases(rows, 'vendor-asc').map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('does not mutate the input array', () => {
    const copy = [...rows];
    sortPurchases(rows, 'weight-desc');
    expect(rows).toEqual(copy);
  });
});
