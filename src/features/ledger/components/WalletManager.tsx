import { Button } from '@/shared/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/Dialog';
import { formatGrams } from '@/shared/lib/format';
import { Pencil, Plus, Trash2, Wallet as WalletIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { WalletManagerProps } from '@/types/components';

/**
 * The complete wallet list: create, rename, delete, and scope the ledger to one
 * wallet.
 *
 * Kept out of the page body on purpose. Wallets are a way to slice entries, not
 * a second thing to read on the dashboard — the page shows a one-line strip and
 * this dialog holds the full list, including empty wallets, which a strip would
 * have to hide to stay readable.
 */
export const WalletManager = ({
  open,
  onOpenChange,
  summaries,
  unassignedCount,
  walletFilter,
  onWalletFilterChange,
  onCreate,
  onEdit,
  onDelete,
}: WalletManagerProps) => {
  const isEmpty = summaries.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Wallets</DialogTitle>
          <DialogDescription>
            Name the places your gold is kept. Each entry belongs to at most one wallet, and
            deleting a wallet never deletes its entries.
          </DialogDescription>
        </DialogHeader>

        {isEmpty ? (
          <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center">
            <span className="bg-primary-subtle text-jade-700 dark:text-jade-200 flex size-11 items-center justify-center rounded-xl">
              <WalletIcon className="size-5" aria-hidden="true" />
            </span>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              No wallets yet. Create one, then assign entries to it from the entry form.
            </p>
            <Button onClick={onCreate} className="h-10 gap-2 rounded-full px-4">
              <Plus className="size-4" aria-hidden="true" />
              New wallet
            </Button>
          </div>
        ) : (
          <ul className="flex min-w-0 flex-col gap-2" aria-label="Wallets">
            {summaries.map(({ wallet, entryCount, fineGrams }) => {
              const active = walletFilter === wallet.id;
              return (
                <li
                  key={wallet.id}
                  className={cn(
                    // `min-w-0` is load-bearing on this row and its list: as
                    // grid items, their min-content width was set by the
                    // unbreakable wallet name, which pushed the list past the
                    // dialog's content box at 320px.
                    'border-border flex min-w-0 items-center gap-3 rounded-xl border p-3',
                    active && 'border-primary/40 bg-primary-subtle/50',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onWalletFilterChange(active ? 'all' : wallet.id)}
                    aria-pressed={active}
                    className="focus-visible:ring-ring min-w-0 flex-1 rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="text-ink-900 dark:text-ink-50 block truncate text-sm font-semibold">
                      {wallet.name}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      <span className="numeric">{formatGrams(fineGrams)} g fine</span>
                      {' · '}
                      {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                      {wallet.note ? ` · ${wallet.note}` : ''}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(wallet)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Edit ${wallet.name}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(wallet)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Delete ${wallet.name}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}

            <li className="border-border flex min-w-0 items-center gap-3 rounded-xl border border-dashed p-3">
              <div className="min-w-0 flex-1">
                <span className="text-ink-900 dark:text-ink-50 block text-sm font-semibold">
                  Unassigned
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {unassignedCount} {unassignedCount === 1 ? 'entry' : 'entries'} in no wallet
                </span>
              </div>
              <Button
                variant={walletFilter === 'none' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onWalletFilterChange(walletFilter === 'none' ? 'all' : 'none')}
                aria-pressed={walletFilter === 'none'}
                className="shrink-0 text-xs"
              >
                {walletFilter === 'none' ? 'Showing' : 'Show'}
              </Button>
            </li>
          </ul>
        )}

        <DialogFooter>
          {!isEmpty ? (
            <Button onClick={onCreate} className="h-10 gap-2">
              <Plus className="size-4" aria-hidden="true" />
              New wallet
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
