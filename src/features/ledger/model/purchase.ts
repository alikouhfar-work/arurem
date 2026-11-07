import type { Purchase, PurchaseDraft, Purity } from '@/types/purchase';

/**
 * Purchase behaviour. Pure functions over the types in `@/types/purchase`;
 * no type declarations live here (project convention).
 */

const FINENESS: Record<Purity, number> = {
  '24K': 0.9999,
  '22K': 0.9167,
  '18K': 0.75,
  Bullion: 0.9999,
};

export { PURITY_LABELS, PURITY_VALUES, purchaseSchema, purchaseDraftSchema } from './purchase.schema';

export const emptyDraft = (): PurchaseDraft => ({
  sellerName: '',
  weight: Number.NaN,
  purity: '18K',
  note: '',
  acquiredAt: new Date().toISOString(),
});

export const toDraft = (purchase: Purchase): PurchaseDraft => ({
  sellerName: purchase.sellerName,
  weight: purchase.weight,
  purity: purchase.purity,
  note: purchase.note ?? '',
  acquiredAt: purchase.acquiredAt,
});

export const createPurchase = (draft: PurchaseDraft): Purchase => {
  const now = new Date().toISOString();
  return {
    ...draft,
    id: crypto.randomUUID(),
    sellerName: draft.sellerName.trim(),
    note: draft.note?.trim() || undefined,
    createdAt: now,
  };
};

export const applyDraft = (purchase: Purchase, draft: PurchaseDraft): Purchase => ({
  ...purchase,
  ...draft,
  sellerName: draft.sellerName.trim(),
  note: draft.note?.trim() || undefined,
  updatedAt: new Date().toISOString(),
});

/**
 * Gold content in grams. Weight is gross; purity is the fineness of that
 * weight. Pure-gold totals are what a ledger is actually for — reporting only
 * gross grams across mixed purities overstates a holding.
 */
export const fineGoldGrams = (purchase: Purchase): number =>
  purchase.weight * FINENESS[purchase.purity];

export const purityFineness = (purity: Purity): number => FINENESS[purity];
