import { FINENESS } from '@/constants/fineness';
import type { Purchase } from '@/types/purchase';
import type { Wallet, WalletDraft, WalletSummary } from '@/types/wallet';

/**
 * Wallet behaviour. Pure functions over the types in `@/types/wallet`; no type
 * declarations live here (project convention).
 */

export { walletDraftSchema, walletSchema } from './wallet.schema';

export const emptyWalletDraft = (): WalletDraft => ({ name: '', note: '' });

export const toWalletDraft = (wallet: Wallet): WalletDraft => ({
  name: wallet.name,
  note: wallet.note ?? '',
});

export const createWallet = (draft: WalletDraft): Wallet => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: draft.name.trim(),
    note: draft.note?.trim() || undefined,
    createdAt: now,
  };
};

export const applyWalletDraft = (wallet: Wallet, draft: WalletDraft): Wallet => ({
  ...wallet,
  name: draft.name.trim(),
  note: draft.note?.trim() || undefined,
  updatedAt: new Date().toISOString(),
});

/**
 * Names identify wallets to a human, so two wallets reading "Home safe" is a
 * defect rather than a preference. Compared trimmed and case-insensitively.
 */
export const isWalletNameTaken = (
  wallets: readonly Wallet[],
  name: string,
  exceptId?: string,
): boolean => {
  const needle = name.trim().toLowerCase();
  if (!needle) return false;
  return wallets.some((wallet) => wallet.id !== exceptId && wallet.name.toLowerCase() === needle);
};

/**
 * Folds entries into their wallets. Entries pointing at a wallet that no longer
 * exists (a stale backup, say) simply do not appear in any summary — they are
 * still in the ledger, and the UI counts them as unassigned.
 */
export const computeWalletSummaries = (
  purchases: readonly Purchase[],
  wallets: readonly Wallet[],
): WalletSummary[] => {
  const totals = new Map<string, { count: number; gross: number; fine: number }>();

  for (const purchase of purchases) {
    if (!purchase.walletId) continue;
    const current = totals.get(purchase.walletId) ?? { count: 0, gross: 0, fine: 0 };
    totals.set(purchase.walletId, {
      count: current.count + 1,
      gross: current.gross + purchase.weight,
      fine: current.fine + purchase.weight * FINENESS[purchase.purity],
    });
  }

  const round = (value: number): number => Math.round(value * 1000) / 1000;

  return wallets.map((wallet) => {
    const total = totals.get(wallet.id);
    return {
      wallet,
      entryCount: total?.count ?? 0,
      grossGrams: round(total?.gross ?? 0),
      fineGrams: round(total?.fine ?? 0),
    };
  });
};

/** Entries that belong to no wallet — no filter, no wallet link, or a stale link. */
export const countUnassigned = (
  purchases: readonly Purchase[],
  wallets: readonly Wallet[],
): number => {
  const known = new Set(wallets.map((wallet) => wallet.id));
  return purchases.filter((purchase) => !purchase.walletId || !known.has(purchase.walletId)).length;
};

/** Entries currently pointing at one wallet. */
export const entriesInWallet = (
  purchases: readonly Purchase[],
  walletId: string,
): Purchase[] => purchases.filter((purchase) => purchase.walletId === walletId);
