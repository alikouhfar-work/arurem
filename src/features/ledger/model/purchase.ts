import type { Purchase, PurchaseDraft, Purity } from '@/types/purchase';

/**
 * Purchase behaviour. Pure functions over the types in `@/types/purchase`;
 * no type declarations live here (project convention).
 */

import { FINENESS } from '@/constants/fineness';
import { NO_WALLET } from '@/constants/wallets';

export { PURITY_LABELS, PURITY_VALUES, purchaseSchema, purchaseDraftSchema } from './purchase.schema';

/**
 * Collapses the form's "no wallet" sentinel to absence.
 *
 * Every write path goes through here, so the sentinel cannot reach storage even
 * if a caller forgets: `walletId` is either a real id or nothing at all.
 */
const cleanWalletId = (walletId: string | undefined): string | undefined => {
  const trimmed = walletId?.trim();
  if (!trimmed || trimmed === NO_WALLET) return undefined;
  return trimmed;
};

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
  walletId: purchase.walletId,
});

export const createPurchase = (draft: PurchaseDraft): Purchase => {
  const now = new Date().toISOString();
  return {
    ...draft,
    id: crypto.randomUUID(),
    sellerName: draft.sellerName.trim(),
    note: draft.note?.trim() || undefined,
    walletId: cleanWalletId(draft.walletId),
    createdAt: now,
  };
};

export const applyDraft = (purchase: Purchase, draft: PurchaseDraft): Purchase => ({
  ...purchase,
  ...draft,
  sellerName: draft.sellerName.trim(),
  note: draft.note?.trim() || undefined,
  walletId: cleanWalletId(draft.walletId),
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
