import { Button } from '@/shared/ui/button';
import { formatDate, formatGrams } from '@/shared/lib/format';
import { PURITY_LABELS } from '../model/purchase';
import { CalendarDays, History, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/shared/lib/utils';
import type { LedgerEntryCardProps, LedgerEntryRowProps } from '@/types/components';

/**
 * List row. On mobile the actions collapse into the row's trailing area rather
 * than sitting in an absolutely-positioned corner (which overlapped the vendor
 * name at 320px in the previous build). Every control is a real button with an
 * accessible name.
 */
export function LedgerEntryRow({ purchase, onEdit, onDelete, isNew }: LedgerEntryRowProps) {
  return (
    <motion.li
      layout="position"
      initial={isNew ? { opacity: 0, y: -6 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className="bg-card text-card-foreground group hover:border-border-strong/40 relative flex items-start gap-3 rounded-xl border p-3 transition-colors sm:items-center sm:gap-4 sm:p-3.5"
    >
      <div className="bg-accent text-gold-800 dark:text-gold-200 hidden size-10 shrink-0 items-center justify-center rounded-lg sm:flex">
        <span className="font-mono text-[10px] leading-none font-bold tracking-tight">
          {purchase.purity}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="text-ink-900 dark:text-ink-50 truncate text-sm font-semibold sm:text-[15px]">
            {purchase.sellerName}
          </h3>
          <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold sm:hidden">
            {purchase.purity}
          </span>
        </div>

        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" aria-hidden="true" />
            <span className="sr-only">Acquired</span>
            <time dateTime={purchase.acquiredAt}>{formatDate(purchase.acquiredAt)}</time>
          </span>

          {purchase.updatedAt ? (
            <span className="inline-flex items-center gap-1">
              <History className="size-3" aria-hidden="true" />
              <span className="sr-only">Last updated</span>
              <time dateTime={purchase.updatedAt}>{formatDate(purchase.updatedAt)}</time>
            </span>
          ) : null}

          {purchase.note ? (
            <span className="text-ink-500 dark:text-ink-400 max-w-full truncate sm:max-w-[28ch]">
              {purchase.note}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        <div className="text-right">
          <p className="numeric text-ink-900 dark:text-ink-50 text-base leading-none font-semibold sm:text-lg">
            {formatGrams(purchase.weight)}
          </p>
          <p className="text-muted-foreground mt-1 text-[10px] tracking-wide uppercase">
            {PURITY_LABELS[purchase.purity]} · g
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(purchase)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${purchase.sellerName}`}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(purchase)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label={`Delete ${purchase.sellerName}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.li>
  );
}

/** Grid tile — used from `sm` up; the list stays the mobile default. */
export function LedgerEntryCard({ purchase, onEdit, onDelete, isNew }: LedgerEntryCardProps) {
  return (
    <motion.li
      layout="position"
      initial={isNew ? { opacity: 0, scale: 0.98 } : false}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className={cn(
        'bg-card text-card-foreground group hover:border-border-strong/40 flex flex-col gap-5 rounded-2xl border p-4 transition-colors sm:p-5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-ink-900 dark:text-ink-50 truncate text-base font-semibold">
            {purchase.sellerName}
          </h3>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <CalendarDays className="size-3" aria-hidden="true" />
            <time dateTime={purchase.acquiredAt}>{formatDate(purchase.acquiredAt)}</time>
          </p>
        </div>

        <span className="bg-accent text-gold-800 dark:text-gold-200 shrink-0 rounded-md px-2 py-1 font-mono text-[10px] font-bold">
          {purchase.purity}
        </span>
      </div>

      {purchase.note ? (
        <p className="text-ink-500 dark:text-ink-400 line-clamp-2 text-xs leading-relaxed">
          {purchase.note}
        </p>
      ) : (
        <p className="text-muted-foreground/60 text-xs italic">No memo</p>
      )}

      <div className="border-border mt-auto flex items-end justify-between gap-3 border-t pt-4">
        <div>
          <p className="numeric text-ink-900 dark:text-ink-50 text-2xl leading-none font-semibold">
            {formatGrams(purchase.weight)}
            <span className="text-muted-foreground ml-1 font-sans text-xs font-medium">g</span>
          </p>
          <p className="text-muted-foreground mt-1 text-[10px] tracking-wide uppercase">
            {PURITY_LABELS[purchase.purity]}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(purchase)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${purchase.sellerName}`}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(purchase)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label={`Delete ${purchase.sellerName}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.li>
  );
}
