import { Card } from '@/shared/ui/Card';
import { formatGrams, formatPercent } from '@/shared/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/Dialog';
import { ArrowUpRight, Layers, Scale, Users } from 'lucide-react';
import type { PurityMixCardProps, SummaryProps } from '@/types/components';
import type { LedgerStats } from '@/types/ledger';

/**
 * Summary is derived synchronously from local state — there is no loading
 * phase to represent, so no isLoading prop exists.
 */
export function LedgerSummary({ stats }: SummaryProps) {
  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
      <h2 id="summary-heading" className="sr-only">
        Ledger summary
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Primary metric — pure gold content, not gross weight. */}
        <Card className="relative overflow-hidden border-0 bg-[image:var(--gradient-jade)] p-5 text-white sm:col-span-2 sm:p-6">
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-jade-100/90 text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Fine gold held
                </p>
                <p className="text-jade-100/70 mt-1 text-xs">24K equivalent, purity-adjusted</p>
              </div>
              <span className="border-gold-200/25 bg-gold-200/10 text-gold-200 hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase sm:inline-flex">
                <Scale className="size-3" aria-hidden="true" />
                Verified ledger
              </span>
            </div>

            <div>
              <p className="numeric text-display font-semibold">
                {formatGrams(stats.fineGrams)}
                <span className="ml-2 align-baseline font-sans text-base font-medium tracking-normal text-white/60 sm:text-lg">
                  g
                </span>
              </p>
              <p className="mt-2 text-xs text-white/65 sm:text-[13px]">
                {formatGrams(stats.grossGrams)} g gross across {stats.entryCount}{' '}
                {stats.entryCount === 1 ? 'entry' : 'entries'}
                {stats.fineGrams > 0 && stats.grossGrams > 0 ? (
                  <> · {formatPercent(stats.fineGrams / stats.grossGrams)} average fineness</>
                ) : null}
              </p>
            </div>
          </div>
        </Card>

        {/* Vendors + purity mix, secondary weight. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <Card className="flex flex-col justify-between gap-4 p-4">
            <div className="flex items-center gap-2">
              <span className="bg-primary-subtle text-jade-700 dark:text-jade-200 flex size-8 items-center justify-center rounded-lg">
                <Users className="size-4" aria-hidden="true" />
              </span>
              <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
                Vendors
              </p>
            </div>
            <p className="numeric text-ink-900 dark:text-ink-50 text-3xl leading-none font-semibold">
              {stats.vendorCount}
            </p>
          </Card>

          <PurityMixCard stats={stats} />
        </div>
      </div>
    </section>
  );
}

function PurityMixCard({ stats }: PurityMixCardProps) {
  const top = stats.purityBreakdown[0];

  return (
    <Card className="flex flex-col justify-between gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-accent text-gold-800 dark:text-gold-200 flex size-8 items-center justify-center rounded-lg">
            <Layers className="size-4" aria-hidden="true" />
          </span>
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
            Mix
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              disabled={stats.entryCount === 0}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
              aria-label="View full purity and vendor breakdown"
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </button>
          </DialogTrigger>
          <BreakdownDialog stats={stats} />
        </Dialog>
      </div>

      <div>
        <p className="numeric text-ink-900 dark:text-ink-50 text-3xl leading-none font-semibold">
          {top ? top.purity : '—'}
        </p>
        <p className="text-muted-foreground mt-1 truncate text-xs">
          {top ? `${formatPercent(top.share)} of gross weight` : 'No entries yet'}
        </p>
      </div>
    </Card>
  );
}

function BreakdownDialog({ stats }: { stats: LedgerStats }) {
  return (
    <DialogContent className="max-h-[85dvh] gap-5 overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Inventory breakdown</DialogTitle>
        <DialogDescription>
          Gross and purity-adjusted weight, grouped by vendor and karat.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-5">
        <section aria-labelledby="by-vendor">
          <h3
            id="by-vendor"
            className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase"
          >
            By vendor
          </h3>
          <ul className="flex flex-col gap-2.5">
            {stats.vendorShares.map((share) => (
              <li key={share.vendor} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-800 dark:text-ink-100 truncate text-sm font-medium">
                    {share.vendor}
                  </span>
                  <span className="numeric text-ink-600 dark:text-ink-300 shrink-0 text-xs">
                    {formatGrams(share.fineGrams)} g fine
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${Math.max(2, share.shareOfFine * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="by-purity">
          <h3
            id="by-purity"
            className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase"
          >
            By purity
          </h3>
          <dl className="divide-border divide-y">
            {stats.purityBreakdown.map((row) => (
              <div key={row.purity} className="flex items-center justify-between gap-3 py-2">
                <dt className="text-ink-800 dark:text-ink-100 text-sm font-medium">{row.purity}</dt>
                <dd className="numeric text-muted-foreground text-xs">
                  {formatGrams(row.grossGrams)} g · {formatPercent(row.share)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </DialogContent>
  );
}
