import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Plus, SearchX, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LedgerEntryCard, LedgerEntryRow } from './ledger-entry';
import type { EmptyStateProps, LedgerEntryListProps, NoResultsStateProps } from '@/types/components';

export function LedgerEntryList({
  purchases,
  viewMode,
  hasAnyEntries,
  lastCreatedId,
  onEdit,
  onDelete,
  onCreate,
  onClearFilters,
}: LedgerEntryListProps) {
  if (purchases.length === 0) {
    // Two genuinely different empty states. The old build showed "start
    // recording your assets" when a search simply had no matches, which told
    // users their data was gone.
    return hasAnyEntries ? (
      <NoResultsState onClearFilters={onClearFilters} />
    ) : (
      <EmptyState onCreate={onCreate} />
    );
  }

  const grid = viewMode === 'grid';

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {grid ? (
        <motion.ul
          key="grid"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Ledger entries"
        >
          {purchases.map((purchase) => (
            <LedgerEntryCard
              key={purchase.id}
              purchase={purchase}
              isNew={purchase.id === lastCreatedId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </motion.ul>
      ) : (
        <motion.ul key="list" className="flex flex-col gap-2" aria-label="Ledger entries">
          {purchases.map((purchase) => (
            <LedgerEntryRow
              key={purchase.id}
              purchase={purchase}
              isNew={purchase.id === lastCreatedId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}

function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-5 border-dashed px-6 py-12 text-center sm:py-16">
      <span className="bg-primary-subtle text-jade-700 dark:text-jade-200 flex size-14 items-center justify-center rounded-2xl">
        <ShieldCheck className="size-7" aria-hidden="true" />
      </span>

      <div className="max-w-sm">
        <h3 className="text-ink-900 dark:text-ink-50 text-lg font-semibold">No entries yet</h3>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Record your first purchase to start tracking gross weight, purity, and how much fine gold
          you actually hold.
        </p>
      </div>

      <Button onClick={onCreate} className="h-11 gap-2 rounded-full px-5">
        <Plus className="size-4" aria-hidden="true" />
        Add your first entry
      </Button>

      <p className="text-muted-foreground text-xs">
        Everything stays in this browser. Export a backup once you have a few entries.
      </p>
    </Card>
  );
}

function NoResultsState({ onClearFilters }: NoResultsStateProps) {
  return (
    <Card className="flex flex-col items-center gap-4 border-dashed px-6 py-12 text-center">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
        <SearchX className="size-6" aria-hidden="true" />
      </span>

      <div className="max-w-sm">
        <h3 className="text-ink-900 dark:text-ink-50 text-base font-semibold">No matching entries</h3>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Your entries are still here — none match the current search and filter.
        </p>
      </div>

      <Button variant="outline" onClick={onClearFilters} className="h-10 rounded-full px-4">
        Clear filters
      </Button>
    </Card>
  );
}
