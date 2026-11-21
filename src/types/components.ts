import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Purchase, PurchaseDraft } from './purchase';
import type { Wallet, WalletDraft, WalletSummary } from './wallet';
import type { LedgerStats, PurityFilter, SortKey, ViewMode, WalletFilter } from './ledger';
import type { MarketRatesStatus, MarketQuote } from './market';
import type { BackupSnapshot, ExportNudge, PersistenceStatus } from './persistence';

/** Prop contracts for the ledger feature's presentational components. */

export type ToolbarSortOption = {
  value: SortKey;
  label: string;
};

export type ToolbarViewOption = {
  value: ViewMode;
  label: string;
  Icon: LucideIcon;
};

export type LedgerHeaderProps = {
  version: string;
  onExport: () => void;
  onImport: (file: File) => void;
  onCreate: () => void;
};

export type LedgerToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortKey: SortKey;
  onSortChange: (value: SortKey) => void;
  purityFilter: PurityFilter;
  onPurityFilterChange: (value: PurityFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  resultCount: number;
  totalCount: number;
  isFiltered: boolean;
  onClearFilters: () => void;
};

export type WalletStripProps = {
  wallets: readonly Wallet[];
  summaries: readonly WalletSummary[];
  unassignedCount: number;
  walletFilter: WalletFilter;
  onWalletFilterChange: (value: WalletFilter) => void;
  onManageWallets: () => void;
  onCreateWallet: () => void;
};

export type WalletManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summaries: readonly WalletSummary[];
  unassignedCount: number;
  walletFilter: WalletFilter;
  onWalletFilterChange: (value: WalletFilter) => void;
  onCreate: () => void;
  onEdit: (wallet: Wallet) => void;
  onDelete: (wallet: Wallet) => void;
};

export type LedgerEntryRowProps = {
  purchase: Purchase;
  /** Resolved name of the entry's wallet, or null when it has none. */
  walletName: string | null;
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchase: Purchase) => void;
  isNew?: boolean;
};

export type LedgerEntryCardProps = LedgerEntryRowProps;

export type LedgerEntryListProps = {
  purchases: Purchase[];
  viewMode: ViewMode;
  hasAnyEntries: boolean;
  lastCreatedId: string | null;
  walletNames: ReadonlyMap<string, string>;
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchase: Purchase) => void;
  onCreate: () => void;
  onClearFilters: () => void;
};

export type DeleteDialogProps = {
  purchase: Purchase | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (purchase: Purchase) => void;
};

export type EntrySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase | null;
  wallets: readonly Wallet[];
  onSubmit: (draft: PurchaseDraft) => void;
};

export type EntryFormProps = {
  purchase: Purchase | null;
  wallets: readonly Wallet[];
  submitLabel: string;
  onSubmit: (draft: PurchaseDraft) => void;
  onCancel: () => void;
};

export type WalletSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: Wallet | null;
  wallets: readonly Wallet[];
  onSubmit: (draft: WalletDraft) => void;
};

export type WalletFormProps = {
  wallet: Wallet | null;
  wallets: readonly Wallet[];
  submitLabel: string;
  onSubmit: (draft: WalletDraft) => void;
  onCancel: () => void;
};

export type WalletManagerProps = WalletManagerDialogProps;

export type WalletDeleteDialogProps = {
  wallet: Wallet | null;
  /** How many entries currently point at this wallet. */
  entryCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (wallet: Wallet) => void;
};

export type EmptyStateProps = {
  onCreate: () => void;
};

export type NoResultsStateProps = {
  onClearFilters: () => void;
};

export type LedgerSummaryProps = {
  stats: LedgerStats;
  quote: MarketQuote | null;
  status: MarketRatesStatus;
};

export type BreakdownDialogProps = {
  stats: LedgerStats;
};

export type PriceTickerProps = {
  quote: MarketQuote | null;
  status: MarketRatesStatus;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export type ViewSwitchProps = {
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  className?: string;
};

export type PurityMixCardProps = {
  stats: LedgerStats;
};

export type AppShellProps = {
  children: ReactNode;
};

export type BrandMarkProps = {
  version: string;
};

export type ExportNudgeProps = {
  nudge: ExportNudge;
  onExport: () => void;
  onDismiss: () => void;
};

export type RecoveryBannerProps = {
  snapshot: BackupSnapshot;
  onRestore: () => void;
  onDismiss: () => void;
};

export type LedgerFooterProps = {
  version: string;
  entryCount: number;
  persistence: PersistenceStatus;
  lastExportedAt: string | null;
  lastSnapshotAt: string | null;
};
