import { AppShell } from '@/shared/components/AppShell';
import { showError, showInfo, showSuccess } from '@/shared/ui/toast';
import { useCallback, useState } from 'react';
import { LedgerEntryList } from '@/features/ledger/components/LedgerEntryList';
import { LedgerHeader } from '@/features/ledger/components/LedgerHeader';
import { LedgerSummary } from '@/features/summary/components/LedgerSummary';
import { LedgerToolbar } from '@/features/ledger/components/LedgerToolbar';
import { EntrySheet } from '@/features/ledger/components/EntrySheet';
import { DeleteDialog } from '@/features/ledger/components/DeleteDialog';
import { useLedger, useLedgerView } from '@/features/ledger/hooks/useLedger';
import { downloadExport, parseImport, readFileAsText } from '@/features/ledger/model/backup';
import type { Purchase, PurchaseDraft } from '@/types/purchase';
import type { PurityFilter, SortKey, ViewMode } from '@/types/ledger';

/**
 * Ledger page — the only component that composes features. All state lives in
 * `useLedger`; this file is orchestration and layout, nothing else.
 */
export function LedgerPage() {
  const ledger = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('acquired-desc');
  const [purityFilter, setPurityFilter] = useState<PurityFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Purchase | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const visible = useLedgerView(ledger.purchases, { searchQuery, sortKey, purityFilter });
  const isFiltered = searchQuery.trim().length > 0 || purityFilter !== 'all';

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

  const handleExport = useCallback(() => {
    if (ledger.purchases.length === 0) {
      showInfo('Nothing to export yet', { description: 'Add an entry first.' });
      return;
    }
    downloadExport(ledger.purchases);
    showSuccess('Backup downloaded', {
      description: `${ledger.purchases.length} ${ledger.purchases.length === 1 ? 'entry' : 'entries'} saved as JSON.`,
    });
  }, [ledger.purchases]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await readFileAsText(file);
        const result = parseImport(text);

        if (!result.ok) {
          showError('Import failed', { description: result.reason });
          return;
        }

        ledger.replaceAll(result.purchases);
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

      <LedgerSummary stats={ledger.stats} />

      <section
        id="ledger"
        aria-labelledby="ledger-heading"
        className="flex scroll-mt-6 flex-col gap-4"
      >
        <h2 id="ledger-heading" className="sr-only">
          Ledger entries
        </h2>

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
          onEdit={openEdit}
          onDelete={setPendingDelete}
          onCreate={openCreate}
          onClearFilters={clearFilters}
        />
      </section>

      <footer className="border-border text-muted-foreground mt-4 flex flex-col gap-2 border-t py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>Stored locally in this browser. Export a backup to move it.</p>
        <p className="font-mono text-[10px] tracking-wide uppercase">Arurem · v{__APP_VERSION__}</p>
      </footer>

      <EntrySheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditing(null);
        }}
        purchase={editing}
        onSubmit={handleSubmit}
      />

      <DeleteDialog
        purchase={pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
