import { Button } from '@/shared/ui/Button';
import { formatGrams } from '@/shared/lib/format';
import { Plus, Wallet as WalletIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { WalletStripProps } from '@/types/components';

/**
 * One-line wallet summary above the entries.
 *
 * Chips, not a dropdown, because the wallet is the most common way to slice the
 * ledger and switching should cost one click. Each chip is a filter toggle with
 * `aria-pressed`, so the current scope is announced rather than only shaded.
 *
 * Empty wallets are shown here rather than hidden: a wallet with nothing in it
 * is a place the user created and has not filled, which is information.
 */
export const WalletStrip = ({
  summaries,
  unassignedCount,
  walletFilter,
  onWalletFilterChange,
  onManageWallets,
  onCreateWallet,
}: WalletStripProps) => {
  if (summaries.length === 0) {
    return (
      <div className="border-border bg-card/60 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2.5">
        <p className="text-muted-foreground text-xs leading-relaxed">
          Group entries by where they are kept — a safe, a bank box, a relative&apos;s house.
        </p>
        <Button onClick={onCreateWallet} variant="outline" size="sm" className="shrink-0 gap-1.5">
          <Plus className="size-3.5" aria-hidden="true" />
          New wallet
        </Button>
      </div>
    );
  }

  const showUnassigned = unassignedCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by wallet">
      <WalletIcon className="text-muted-foreground mr-0.5 size-3.5 shrink-0" aria-hidden="true" />

      <button
        type="button"
        onClick={() => onWalletFilterChange('all')}
        aria-pressed={walletFilter === 'all'}
        className={cn(
          'focus-visible:ring-ring rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
          walletFilter === 'all'
            ? 'border-primary/40 bg-primary text-primary-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        All
      </button>

      {summaries.map(({ wallet, entryCount, fineGrams }) => {
        const active = walletFilter === wallet.id;
        return (
          <button
            key={wallet.id}
            type="button"
            onClick={() => onWalletFilterChange(active ? 'all' : wallet.id)}
            aria-pressed={active}
            title={`${formatGrams(fineGrams)} g fine · ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`}
            className={cn(
              'focus-visible:ring-ring max-w-44 truncate rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
              active
                ? 'border-primary/40 bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {wallet.name}
            <span className={cn('ml-1.5 font-mono text-[10px]', active ? 'opacity-80' : 'opacity-60')}>
              {entryCount}
            </span>
          </button>
        );
      })}

      {showUnassigned ? (
        <button
          type="button"
          onClick={() => onWalletFilterChange(walletFilter === 'none' ? 'all' : 'none')}
          aria-pressed={walletFilter === 'none'}
          className={cn(
            'focus-visible:ring-ring rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
            walletFilter === 'none'
              ? 'border-primary/40 bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          Unassigned
          <span
            className={cn(
              'ml-1.5 font-mono text-[10px]',
              walletFilter === 'none' ? 'opacity-80' : 'opacity-60',
            )}
          >
            {unassignedCount}
          </span>
        </button>
      ) : null}

      <Button
        variant="ghost"
        size="sm"
        onClick={onManageWallets}
        className="text-muted-foreground hover:text-foreground ml-auto h-7 shrink-0 px-2 text-xs"
      >
        Manage
      </Button>
    </div>
  );
};
