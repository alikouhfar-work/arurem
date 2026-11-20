import { formatDate } from '@/shared/lib/format';
import { formatRial, formatToman, formatUsd } from '@/shared/lib/money';
import { irtPerGramFor, usdPerGram } from '@/shared/lib/valuation';
import { useValueFlash } from '@/shared/hooks/useValueFlash';
import { cn } from '@/shared/lib/utils';
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from 'lucide-react';
import type { PriceTickerProps } from '@/types/components';

/**
 * The live market strip: spot gold in USD, and the Tehran per-gram quote in
 * toman for the two karats the ledger holds.
 *
 * These are two separate markets, not one price in two currencies — the toman
 * figures are what Iranian dealers actually transact at, and they carry an
 * import premium over spot that moves on its own. The strip shows both rather
 * than implying a conversion.
 *
 * Honesty rules baked into the markup:
 *  - Each figure carries its own "as of" stamp, because the providers fail and
 *    update independently. A single combined stamp would be a lie about the
 *    fresher leg.
 *  - `stale` is labelled, never hidden. The numbers stay on screen.
 *  - The refresh control is a real button with a name, disabled while a fetch
 *    is in flight so a fast double-tap cannot queue two requests.
 */
export const PriceTicker = ({ quote, status, isRefreshing, onRefresh }: PriceTickerProps) => {
  const perGramUsd = usdPerGram(quote);
  const perGram24 = irtPerGramFor('24K', quote);
  const perGram18 = irtPerGramFor('18K', quote);
  const flash = useValueFlash(perGram24);

  const goldStamp = quote?.goldUsdPerOunce?.updatedAt ?? null;
  const irtStamp = quote?.goldIrtPerGram['24K']?.updatedAt ?? null;
  const isUnavailable = status === 'unavailable';

  const TrendIcon = flash.trend === 'down' ? ArrowDownRight : ArrowUpRight;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase">
            <span
              className={cn(
                'size-1.5 rounded-full',
                status === 'ready' && 'bg-success',
                status === 'stale' && 'bg-gold-500',
                status === 'loading' && 'bg-muted-foreground',
                isUnavailable && 'bg-destructive',
              )}
              aria-hidden="true"
            />
            Spot gold
          </p>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              key={flash.nonce}
              className={cn(
                'numeric text-ink-900 inline-block px-1 text-xl font-semibold leading-none dark:text-ink-50',
                flash.nonce > 0 && flash.trend === 'up' && 'flash-up',
                flash.nonce > 0 && flash.trend === 'down' && 'flash-down',
              )}
            >
              {formatUsd(perGramUsd)}
            </span>
            <span className="text-muted-foreground text-[11px] font-medium">USD/g</span>
            {flash.trend !== 'flat' ? (
              <TrendIcon
                key={`icon-${flash.nonce}`}
                className={cn(
                  'tick-in size-3.5',
                  flash.trend === 'up' ? 'text-trend-up' : 'text-trend-down',
                )}
                aria-hidden="true"
              />
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
            Tehran · 24K
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="numeric text-ink-900 text-xl leading-none font-semibold dark:text-ink-50">
              {formatToman(perGram24)}
            </span>
            <span className="text-muted-foreground text-[11px] font-medium">IRT/g</span>
          </div>
          {/* The rial figure is what tgju.org prints. Showing it is the only way
              a user can reconcile our toman number against the source without
              reaching for a calculator and a unit table. */}
          <p className="numeric text-muted-foreground mt-1 text-[10px]">
            {formatRial(perGram24)} ریال
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
            Tehran · 18K
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="numeric text-ink-900 text-xl leading-none font-semibold dark:text-ink-50">
              {formatToman(perGram18)}
            </span>
            <span className="text-muted-foreground text-[11px] font-medium">IRT/g</span>
          </div>
          <p className="numeric text-muted-foreground mt-1 text-[10px]">
            {formatRial(perGram18)} ریال
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
        <div className="text-right">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
            {status === 'stale' ? 'Stale · as of' : 'Updated'}
          </p>
          <p className="numeric text-muted-foreground mt-0.5 text-[11px]">
            {isUnavailable
              ? 'No market data'
              : goldStamp
                ? formatDate(goldStamp)
                : 'Fetching…'}
            {irtStamp && !isUnavailable ? ` · IRT ${formatDate(irtStamp)}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={isUnavailable ? 'Retry market prices' : 'Refresh market prices'}
          className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden="true" />
          )}
          <span aria-hidden="true">
            {isRefreshing ? 'Refreshing' : isUnavailable ? 'Retry' : 'Refresh'}
          </span>
        </button>
      </div>
    </div>
  );
};
