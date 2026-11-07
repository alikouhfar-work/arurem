import type { Purchase, PurchaseDraft } from './purchase';

/** Ledger aggregate types and the store's state-machine contracts. */

export type ViewMode = 'grid' | 'list';

export type PurityFilter = 'all' | Purchase['purity'];

export type SortKey = 'acquired-desc' | 'acquired-asc' | 'weight-desc' | 'vendor-asc';

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
  status: LedgerStatus;
  error: string | null;
};

export type LedgerAction =
  | { type: 'add'; purchase: Purchase }
  | { type: 'update'; id: string; draft: PurchaseDraft }
  | { type: 'delete'; id: string }
  | { type: 'restore'; purchase: Purchase; index: number }
  | { type: 'replace-all'; purchases: Purchase[] }
  | { type: 'persist-failed'; message: string }
  | { type: 'persist-ok' };

export type UseLedgerViewOptions = {
  searchQuery: string;
  sortKey: SortKey;
  purityFilter: PurityFilter;
};
