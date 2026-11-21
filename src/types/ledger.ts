import type { Purchase, PurchaseDraft } from './purchase';
import type { Wallet, WalletDraft } from './wallet';
import type { BackupSnapshot } from './persistence';

/** Ledger aggregate types and the store's state-machine contracts. */

export type ViewMode = 'grid' | 'list';

export type PurityFilter = 'all' | Purchase['purity'];

export type SortKey = 'acquired-desc' | 'acquired-asc' | 'weight-desc' | 'vendor-asc';

/** `all` is the whole ledger; an id shows one wallet; `none` shows unassigned. */
export type WalletFilter = 'all' | 'none' | (string & {});

export type VendorShare = {
  vendor: string;
  fineGrams: number;
  shareOfFine: number;
};

export type PurityBreakdownRow = {
  purity: Purchase['purity'];
  grossGrams: number;
  share: number;
};

export type LedgerStats = {
  entryCount: number;
  vendorCount: number;
  grossGrams: number;
  fineGrams: number;
  purityBreakdown: PurityBreakdownRow[];
  vendorShares: VendorShare[];
};

export type LedgerStatus = 'idle' | 'error';

export type LedgerState = {
  purchases: Purchase[];
  wallets: Wallet[];
  status: LedgerStatus;
  error: string | null;
  /** A snapshot offered after the live payload failed to load. */
  recovery: BackupSnapshot | null;
};

export type LedgerAction =
  | { type: 'add'; purchase: Purchase }
  | { type: 'update'; id: string; draft: PurchaseDraft }
  | { type: 'delete'; id: string }
  | { type: 'restore'; purchase: Purchase; index: number }
  | { type: 'add-wallet'; wallet: Wallet }
  | { type: 'update-wallet'; id: string; draft: WalletDraft }
  | { type: 'delete-wallet'; id: string }
  | { type: 'restore-wallet'; wallet: Wallet; index: number; entryIds: string[] }
  | { type: 'replace-all'; purchases: Purchase[]; wallets: Wallet[] }
  | { type: 'persist-failed'; message: string }
  | { type: 'dismiss-recovery' }
  | { type: 'persist-ok' };

export type UseLedgerViewOptions = {
  searchQuery: string;
  sortKey: SortKey;
  purityFilter: PurityFilter;
  walletFilter: WalletFilter;
  wallets: readonly Wallet[];
};
