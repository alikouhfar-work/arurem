import { AppShell } from '@/shared/components/AppShell';
import { showError, showInfo, showSuccess } from '@/shared/ui/toast';
import { useCallback, useMemo, useState } from 'react';
import { LedgerEntryList } from '@/features/ledger/components/LedgerEntryList';
import { LedgerHeader } from '@/features/ledger/components/LedgerHeader';
import { LedgerFooter } from '@/features/ledger/components/LedgerFooter';
import { ExportNudge } from '@/features/ledger/components/ExportNudge';
import { RecoveryBanner } from '@/features/ledger/components/RecoveryBanner';
import { LedgerSummary } from '@/features/summary/components/LedgerSummary';
import { LedgerToolbar } from '@/features/ledger/components/LedgerToolbar';
import { PriceTicker } from '@/features/market/components/PriceTicker';
import { EntrySheet } from '@/features/ledger/components/EntrySheet';
import { DeleteDialog } from '@/features/ledger/components/DeleteDialog';
import { WalletManager } from '@/features/ledger/components/WalletManager';
import { WalletSheet } from '@/features/ledger/components/WalletSheet';
import { WalletStrip } from '@/features/ledger/components/WalletStrip';
import { WalletDeleteDialog } from '@/features/ledger/components/WalletDeleteDialog';
import { useLedger, useLedgerView } from '@/features/ledger/hooks/useLedger';
import { useDataSafety } from '@/features/ledger/hooks/useDataSafety';
import { useMarketRates } from '@/shared/hooks/useMarketRates';
import { downloadExport, parseImport, readFileAsText } from '@/features/ledger/model/backup';
import {
  computeWalletSummaries,
  countUnassigned,
  entriesInWallet,
} from '@/features/ledger/model/wallet';
import type { Purchase, PurchaseDraft } from '@/types/purchase';
import type { Wallet, WalletDraft } from '@/types/wallet';
import type { PurityFilter, SortKey, ViewMode, WalletFilter } from '@/types/ledger';

/**
 * Ledger page — the only component that composes features. All state lives in
 * `useLedger`; this file is orchestration and layout, nothing else.
 */
export const LedgerPage = () => {
  const ledger = useLedger();
  // One subscription for the whole page. Mounting the hook per card would open
  // an interval for each and let two cards show different spot prices.
  const market = useMarketRates();
  // Observes the ledger; never mutates it. Snapshots, eviction protection, and
  // the export reminder are all consequences of `purchases` changing.
  const safety = useDataSafety(ledger.purchases, ledger.wallets);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('acquired-desc');
  const [purityFilter, setPurityFilter] = useState<PurityFilter>('all');
  const [walletFilter, setWalletFilter] = useState<WalletFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Purchase | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const [walletManagerOpen, setWalletManagerOpen] = useState(false);
  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [pendingDeleteWallet, setPendingDeleteWallet] = useState<Wallet | null>(null);

  const visible = useLedgerView(ledger.purchases, {
    searchQuery,
    sortKey,
    purityFilter,
    walletFilter,
    wallets: ledger.wallets,
  });

  const isFiltered = searchQuery.trim().length > 0 || purityFilter !== 'all' || walletFilter !== 'all';

  const walletSummaries = useMemo(
    () => computeWalletSummaries(ledger.purchases, ledger.wallets),
    [ledger.purchases, ledger.wallets],
  );

  const walletNames = useMemo(
    () => new Map(ledger.wallets.map((wallet) => [wallet.id, wallet.name] as const)),
    [ledger.wallets],
  );

  const unassignedCount = useMemo(
    () => countUnassigned(ledger.purchases, ledger.wallets),
    [ledger.purchases, ledger.wallets],
  );

  /**
   * A filter pointing at a wallet that no longer exists would show an empty
   * ledger with no explanation, so it falls back to `all` instead.
   */
  const activeWalletFilter: WalletFilter =
    walletFilter !== 'all' && walletFilter !== 'none' && !walletNames.has(walletFilter)
      ? 'all'
      : walletFilter;

  const openCreate = useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((purchase: Purchase) => {
    setEditing(purchase);
    setSheetOpen(true);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setPurityFilter('all');
    setWalletFilter('all');
  }, []);

  const handleSubmit = useCallback(
    (draft: PurchaseDraft) => {
      if (editing) {
        ledger.update(editing.id, draft);
        showSuccess('Entry updated', { description: `${draft.sellerName} saved.` });
      } else {
        const created = ledger.create(draft);
        setLastCreatedId(created.id);
        showSuccess('Entry added', { description: `${draft.weight.toFixed(3)} g recorded.` });
      }
      setSheetOpen(false);
      setEditing(null);
    },
    [editing, ledger],
  );

  const handleDelete = useCallback(
    (purchase: Purchase) => {
      const index = ledger.purchases.findIndex((item) => item.id === purchase.id);
      ledger.remove(purchase.id);
      setPendingDelete(null);

      showSuccess(`Deleted ${purchase.sellerName}`, {
        description: `${purchase.weight.toFixed(3)} g removed from your totals.`,
        action: { label: 'Undo', onClick: () => ledger.restore(purchase, Math.max(0, index)) },
        duration: 8000,
      });
    },
    [ledger],
  );

  const openCreateWallet = useCallback(() => {
    setEditingWallet(null);
    setWalletManagerOpen(false);
    setWalletSheetOpen(true);
  }, []);

  const openEditWallet = useCallback((wallet: Wallet) => {
    setEditingWallet(wallet);
    setWalletManagerOpen(false);
    setWalletSheetOpen(true);
  }, []);

  const handleWalletSubmit = useCallback(
    (draft: WalletDraft) => {
      if (editingWallet) {
        ledger.updateWallet(editingWallet.id, draft);
        showSuccess('Wallet updated', { description: `${draft.name} saved.` });
      } else {
        const created = ledger.createWallet(draft);
        showSuccess('Wallet created', {
          description: `${created.name} is ready — assign entries to it from the entry form.`,
        });
      }
      setWalletSheetOpen(false);
      setEditingWallet(null);
    },
    [editingWallet, ledger],
  );

  /**
   * Deletes the wallet, not its entries. The entries lose their link — there is
   * no wallet left to point at — but nothing else about them changes, and Undo
   * relinks them.
   */
  const handleDeleteWallet = useCallback(
    (wallet: Wallet) => {
      const index = ledger.wallets.findIndex((item) => item.id === wallet.id);
      const linkedIds = entriesInWallet(ledger.purchases, wallet.id).map((entry) => entry.id);

      ledger.removeWallet(wallet.id);
      setPendingDeleteWallet(null);
      if (walletFilter === wallet.id) setWalletFilter('all');

      showSuccess(`Deleted wallet ${wallet.name}`, {
        description:
          linkedIds.length === 0
            ? 'It held no entries.'
            : `${linkedIds.length} ${linkedIds.length === 1 ? 'entry stays' : 'entries stay'} in your ledger, now unassigned.`,
        action: {
          label: 'Undo',
          onClick: () => ledger.restoreWallet(wallet, Math.max(0, index), linkedIds),
        },
        duration: 8000,
      });
    },
    [ledger, walletFilter],
  );

  const handleExport = useCallback(() => {
    if (ledger.purchases.length === 0) {
      showInfo('Nothing to export yet', { description: 'Add an entry first.' });
      return;
    }
    downloadExport(ledger.purchases, ledger.wallets);
    // Recorded only after the download is triggered, so the reminder reflects
    // an export that actually happened rather than one that was asked for.
    safety.markExported();
    showSuccess('Backup downloaded', {
      description: `${ledger.purchases.length} ${ledger.purchases.length === 1 ? 'entry' : 'entries'} saved as JSON.`,
    });
  }, [ledger.purchases, ledger.wallets, safety]);

  const handleRestoreSnapshot = useCallback(() => {
    if (!ledger.recovery) return;
    const { purchases, wallets } = ledger.recovery;
    ledger.replaceAll(purchases, wallets ?? []);
    showSuccess('Snapshot restored', {
      description: `${purchases.length} ${purchases.length === 1 ? 'entry' : 'entries'} recovered from a local copy.`,
    });
  }, [ledger]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await readFileAsText(file);
        const result = parseImport(text);

        if (!result.ok) {
          showError('Import failed', { description: result.reason });
          return;
        }

        ledger.replaceAll(result.purchases, result.wallets);
        showSuccess(
          `Imported ${result.purchases.length} ${result.purchases.length === 1 ? 'entry' : 'entries'}`,
          {
            description:
              result.skipped > 0 ? `${result.skipped} invalid rows were skipped.` : undefined,
          },
        );
      } catch (error) {
        showError('Import failed', {
          description: error instanceof Error ? error.message : 'The file could not be read.',
        });
      }
    },
    [ledger],
  );

  return (
    <AppShell>
      <LedgerHeader
        version={__APP_VERSION__}
        onExport={handleExport}
        onImport={handleImport}
        onCreate={openCreate}
      />

      {ledger.error ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive flex items-start justify-between gap-4 rounded-xl border p-3 text-sm"
        >
          <p>{ledger.error}</p>
          <button
            type="button"
            onClick={ledger.dismissError}
            className="shrink-0 text-xs font-semibold underline underline-offset-4"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {ledger.recovery ? (
        <RecoveryBanner
          snapshot={ledger.recovery}
          onRestore={handleRestoreSnapshot}
          onDismiss={ledger.dismissRecovery}
        />
      ) : null}

      {safety.nudge ? (
        <ExportNudge
          nudge={safety.nudge}
          onExport={handleExport}
          onDismiss={safety.dismissNudge}
        />
      ) : null}

      <LedgerSummary stats={ledger.stats} quote={market.quote} status={market.status} />

      <PriceTicker
        quote={market.quote}
        status={market.status}
        isRefreshing={market.isRefreshing}
        onRefresh={market.refresh}
      />

      <section
        id="ledger"
        aria-labelledby="ledger-heading"
        className="flex scroll-mt-6 flex-col gap-4"
      >
        <h2 id="ledger-heading" className="sr-only">
          Ledger entries
        </h2>

        <WalletStrip
          wallets={ledger.wallets}
          summaries={walletSummaries}
          unassignedCount={unassignedCount}
          walletFilter={activeWalletFilter}
          onWalletFilterChange={setWalletFilter}
          onManageWallets={() => setWalletManagerOpen(true)}
          onCreateWallet={openCreateWallet}
        />

        <LedgerToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          purityFilter={purityFilter}
          onPurityFilterChange={setPurityFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          resultCount={visible.length}
          totalCount={ledger.purchases.length}
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
        />

        <LedgerEntryList
          purchases={visible}
          viewMode={viewMode}
          hasAnyEntries={ledger.purchases.length > 0}
          lastCreatedId={lastCreatedId}
          walletNames={walletNames}
          onEdit={openEdit}
          onDelete={setPendingDelete}
          onCreate={openCreate}
          onClearFilters={clearFilters}
        />
      </section>

      <LedgerFooter
        version={__APP_VERSION__}
        entryCount={ledger.purchases.length}
        persistence={safety.persistence}
        lastExportedAt={safety.lastExportedAt}
        lastSnapshotAt={safety.lastSnapshotAt}
      />

      <EntrySheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditing(null);
        }}
        purchase={editing}
        wallets={ledger.wallets}
        onSubmit={handleSubmit}
      />

      <DeleteDialog
        purchase={pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={handleDelete}
      />

      <WalletManager
        open={walletManagerOpen}
        onOpenChange={setWalletManagerOpen}
        summaries={walletSummaries}
        unassignedCount={unassignedCount}
        walletFilter={activeWalletFilter}
        onWalletFilterChange={setWalletFilter}
        onCreate={openCreateWallet}
        onEdit={openEditWallet}
        onDelete={setPendingDeleteWallet}
      />

      <WalletSheet
        open={walletSheetOpen}
        onOpenChange={(open) => {
          setWalletSheetOpen(open);
          if (!open) setEditingWallet(null);
        }}
        wallet={editingWallet}
        wallets={ledger.wallets}
        onSubmit={handleWalletSubmit}
      />

      <WalletDeleteDialog
        wallet={pendingDeleteWallet}
        entryCount={
          pendingDeleteWallet
            ? entriesInWallet(ledger.purchases, pendingDeleteWallet.id).length
            : 0
        }
        onOpenChange={(open) => {
          if (!open) setPendingDeleteWallet(null);
        }}
        onConfirm={handleDeleteWallet}
      />
    </AppShell>
  );
};
