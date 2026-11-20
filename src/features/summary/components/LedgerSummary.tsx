import { Card } from '@/shared/ui/Card';
import { formatGrams, formatPercent } from '@/shared/lib/format';
import { formatToman, formatUsdWhole } from '@/shared/lib/money';
import { equivalentGrams, valuateHoldings } from '@/shared/lib/valuation';
import { useValueFlash } from '@/shared/hooks/useValueFlash';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/Dialog';
import { ArrowUpRight, Layers, Users } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type {
  BreakdownDialogProps,
  LedgerSummaryProps,
  PurityMixCardProps,
} from '@/types/components';

/**
 * Portfolio summary.
 *
 * The hero card leads with the holding restated in 18K — the karat Iranian
 * buyers and sellers actually quote in — and names the 24K fine-gold figure in
 * the description, because that is the number every other weight derives from.
 * Both questions a holder asks ("how much do I own", "what is it worth") are
 * answered under the same heading, so the headline weight and the prices below
 * it are on one basis.
 *
 * Valuation prices each karat at its own Tehran quote and applies the purity
 * ratio only to fine-gold weight. Multiplying gross grams by a pure-gold price
 * would overvalue an 18K holding by a third, which is the single most expensive
 * arithmetic mistake available in this app.
 */
export const LedgerSummary = ({ stats, quote, status }: LedgerSummaryProps) => {
  const valuation = valuateHoldings(stats.purityBreakdown, quote);
  const flash = useValueFlash(valuation.irt);
  const isLive = status === 'ready';

  // Headline is 18K-equivalent grams; the fine (24K) figure rides in the caption.
  const grams18k = equivalentGrams(valuation.fineGrams, '18K');

  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
      <h2 id="summary-heading" className="sr-only">
        Ledger summary
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="relative overflow-hidden border-0 bg-[image:var(--gradient-jade)] p-5 text-white sm:col-span-2 sm:p-6">
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-jade-100/90 text-[11px] font-semibold tracking-[0.14em] uppercase">
                  18K gold held
                </p>
                <p className="text-jade-100/70 mt-1 text-xs">
                  Purity-adjusted
                  {valuation.fineGrams > 0
                    ? ` · ${formatGrams(valuation.fineGrams)} g fine (24K)`
                    : ''}
                </p>
              </div>

              {/* Status, not decoration. This badge previously read "Verified
                  ledger", which claimed an audit that does not exist. */}
              <span
                className={cn(
                  'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase sm:inline-flex',
                  isLive
                    ? 'border-gold-200/25 bg-gold-200/10 text-gold-200'
                    : 'border-white/15 bg-white/5 text-white/60',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    isLive ? 'bg-gold-200' : status === 'stale' ? 'bg-gold-300' : 'bg-white/40',
                  )}
                  aria-hidden="true"
                />
                {isLive ? 'Live price' : status === 'stale' ? 'Stale price' : 'No feed'}
              </span>
            </div>

            <div>
              <p className="numeric text-display font-semibold">
                {grams18k !== null ? formatGrams(grams18k) : '—'}
                <span className="ml-2 align-baseline font-sans text-base font-medium tracking-normal text-white/60 sm:text-lg">
                  g · 18K
                </span>
              </p>

              {/* The valuation. Two currencies, equal visual weight — and two
                  separate sources: USD from spot, IRT from Tehran's own
                  per-karat quotes, never one converted into the other. */}
              <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
                <span
                  key={flash.nonce}
                  className={cn(
                    'numeric inline-block px-1 text-lg leading-none font-semibold text-white sm:text-xl',
                    flash.nonce > 0 && flash.trend === 'up' && 'flash-up',
                    flash.nonce > 0 && flash.trend === 'down' && 'flash-down',
                  )}
                >
                  {valuation.usd !== null ? formatUsdWhole(valuation.usd) : '—'}
                  <span className="ml-1.5 font-sans text-[11px] font-medium tracking-normal text-white/70">
                    USD
                  </span>
                </span>

                <span className="numeric text-jade-100 text-lg leading-none font-semibold sm:text-xl">
                  {valuation.irt !== null ? formatToman(valuation.irt) : '—'}
                  <span className="ml-1.5 font-sans text-[11px] font-medium tracking-normal text-white/70">
                    IRT
                  </span>
                </span>
              </div>

              {/* The total in rial, which is the unit every Iranian source
                  publishes in — so the headline is checkable against tgju.org
                  rather than only trusted. */}
              {valuation.irt !== null ? (
                <p className="numeric mt-1.5 px-1 text-[11px] text-white/70">
                  {formatRial(valuation.irt)} ریال
                </p>
              ) : null}

              <p className="mt-2 px-1 text-xs text-white/65 sm:text-[13px]">
                {stats.fineGrams > 0 && stats.grossGrams > 0 ? (
                  <>{formatPercent(stats.fineGrams / stats.grossGrams)} average fineness</>
                ) : null}
              </p>
            </div>
          </div>
        </Card>

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
};

const PurityMixCard = ({ stats }: PurityMixCardProps) => {
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
};

const BreakdownDialog = ({ stats }: BreakdownDialogProps) => (
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
