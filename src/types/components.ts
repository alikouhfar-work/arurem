import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Purchase, PurchaseDraft } from './purchase';
import type { LedgerStats, PurityFilter, SortKey, ViewMode } from './ledger';
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

export type LedgerEntryRowProps = {
  purchase: Purchase;
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
  onSubmit: (draft: PurchaseDraft) => void;
};

export type EntryFormProps = {
  purchase: Purchase | null;
  submitLabel: string;
  onSubmit: (draft: PurchaseDraft) => void;
  onCancel: () => void;
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
