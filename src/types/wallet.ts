import type { z } from 'zod';
import type { walletDraftSchema, walletSchema } from '@/features/ledger/model/wallet.schema';

/**
 * Wallet domain types.
 *
 * Derived from the zod schema so the runtime contract and the compile-time
 * contract cannot drift. Type-only imports: this file adds no runtime edge.
 */

export type Wallet = z.infer<typeof walletSchema>;

/** The subset of a wallet the user edits. */
export type WalletDraft = z.infer<typeof walletDraftSchema>;

/** What react-hook-form holds while editing a wallet. */
export type WalletFormValues = z.input<typeof walletDraftSchema>;

/** A wallet folded together with what it currently holds. */
export type WalletSummary = {
  wallet: Wallet;
  entryCount: number;
  grossGrams: number;
  fineGrams: number;
};
