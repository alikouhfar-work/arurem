import { fineGoldGrams } from './purchase';
import type { Purchase } from '@/types/purchase';
import type { LedgerStats, PurityBreakdownRow, SortKey, VendorShare } from '@/types/ledger';

/** Aggregate computations over the ledger. Pure; no I/O, no React. */

const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const computeStats = (purchases: readonly Purchase[]): LedgerStats => {
  const grossGrams = purchases.reduce((sum, purchase) => sum + purchase.weight, 0);
  const fineGrams = purchases.reduce((sum, purchase) => sum + fineGoldGrams(purchase), 0);

  const vendors = new Map<string, { fine: number }>();
  const purities = new Map<Purchase['purity'], number>();

  for (const purchase of purchases) {
    const fine = fineGoldGrams(purchase);
    const current = vendors.get(purchase.sellerName) ?? { fine: 0 };
    vendors.set(purchase.sellerName, { fine: current.fine + fine });
    purities.set(purchase.purity, (purities.get(purchase.purity) ?? 0) + purchase.weight);
  }

  const vendorShares: VendorShare[] = [...vendors.entries()]
    .map(([vendor, value]) => ({
      vendor,
      fineGrams: round(value.fine),
      shareOfFine: fineGrams > 0 ? value.fine / fineGrams : 0,
    }))
    .sort((a, b) => b.fineGrams - a.fineGrams);

  const purityBreakdown: PurityBreakdownRow[] = [...purities.entries()]
    .map(([purity, gross]) => ({
      purity,
      grossGrams: round(gross),
      share: grossGrams > 0 ? gross / grossGrams : 0,
    }))
    .sort((a, b) => b.grossGrams - a.grossGrams);

  return {
    entryCount: purchases.length,
    vendorCount: vendors.size,
    grossGrams: round(grossGrams),
    fineGrams: round(fineGrams),
    purityBreakdown,
    vendorShares,
  };
};

/**
 * Weighted search across the fields a user actually remembers.
 * Returns the input array unchanged for an empty query so callers keep
 * reference stability for memoisation.
 */
export const filterPurchases = (purchases: readonly Purchase[], query: string): Purchase[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return purchases as Purchase[];

  return purchases.filter((purchase) => {
    const haystack = [
      purchase.sellerName,
      purchase.purity,
      purchase.note ?? '',
      purchase.weight.toFixed(3),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
};

export const sortPurchases = (purchases: readonly Purchase[], key: SortKey): Purchase[] => {
  const compare = {
    'acquired-desc': (a: Purchase, b: Purchase) => b.acquiredAt.localeCompare(a.acquiredAt),
    'acquired-asc': (a: Purchase, b: Purchase) => a.acquiredAt.localeCompare(b.acquiredAt),
    'weight-desc': (a: Purchase, b: Purchase) => b.weight - a.weight,
    'vendor-asc': (a: Purchase, b: Purchase) => a.sellerName.localeCompare(b.sellerName),
  } as const;

  return [...purchases].sort(compare[key]);
};
