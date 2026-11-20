import { Input } from '@/shared/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/Select';
import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { PURITY_VALUES } from '../model/purchase.schema';
import { SORT_OPTIONS } from '@/constants/toolbar';
import { ViewSwitch } from './ViewSwitch';
import type { LedgerToolbarProps } from '@/types/components';
import type { PurityFilter, SortKey } from '@/types/ledger';

/**
 * Search, filters, sort, and the view switch.
 *
 * The alignment rule this file exists to satisfy:
 *
 *  1. Every control in the row is `--control-height` tall and `rounded-control`
 *     round. Nothing here sets a height or a radius of its own — that is what
 *     produced a 44px search field beside 36px selects.
 *  2. The select triggers carry a real border, not a transparent one, so their
 *     box edges line up with the search field's instead of floating inward.
 *  3. The view switch is a track whose inner radius is derived from the control
 *     radius minus its own padding, so the segments sit concentric with the
 *     fields next to them rather than at an unrelated 9px.
 *  4. Layout is a grid, not wrapping flex. `grid-cols-[minmax(0,1fr)_auto]` on
 *     the first row keeps search and the switch on one line at every width,
 *     and the two selects get their own full-width row below `sm`. That is what
 *     prevents the reflow jump the flex-wrap version had: controls change rows,
 *     but never change size.
 *  5. No fixed pixel widths on the selects. They size to content up to a cap, so
 *     a longer translation or a larger user font does not clip the label.
 */
export const LedgerToolbar = ({
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  purityFilter,
  onPurityFilterChange,
  viewMode,
  onViewModeChange,
  resultCount,
  totalCount,
  isFiltered,
  onClearFilters,
}: LedgerToolbarProps) => {
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses search — the one keyboard affordance power users expect in a
  // filterable list. Ignored while typing in any other field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        Boolean(target?.isContentEditable);
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="relative min-w-0">
          <label htmlFor="ledger-search" className="sr-only">
            Search entries
          </label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-(--control-gutter) size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            id="ledger-search"
            type="search"
            inputMode="search"
            placeholder="Search vendor, memo, karat, or weight…"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && searchQuery) {
                event.preventDefault();
                onSearchChange('');
              }
            }}
            // The icon needs room the shared gutter does not provide; the right
            // side reserves space for the clear button so text never runs under
            // it at any width.
            className="pr-10 pl-[calc(var(--control-gutter)+1.25rem)] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                searchRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Clear search</span>
            </button>
          ) : null}
        </div>

        {/* Mobile: the switch shares the search row, which keeps the toolbar two
            rows tall instead of three. From sm up it takes its ordered slot. */}
        <ViewSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} className="col-start-2" />

        {/* `sm:contents` dissolves this wrapper so the two selects become
            direct cells of the single 4-up row at sm+, while on mobile they get
            a clean 2-up row of their own. Without it the grid would place them
            one-per-column and squeeze the sort trigger to the switch's width. */}
        <div className="col-span-2 grid grid-cols-2 gap-2 sm:contents">
          <Select
            value={purityFilter}
            onValueChange={(value) => onPurityFilterChange(value as PurityFilter)}
          >
            <SelectTrigger className="w-full min-w-0 sm:w-auto sm:min-w-[8rem]" aria-label="Filter by purity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All purities</SelectItem>
              {PURITY_VALUES.map((purity) => (
                <SelectItem key={purity} value={purity}>
                  {purity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(value) => onSortChange(value as SortKey)}>
            <SelectTrigger className="w-full min-w-0 sm:w-auto sm:min-w-[9rem]" aria-label="Sort entries">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex min-h-5 items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
          {isFiltered ? (
            <>
              <span className="text-ink-700 dark:text-ink-200 font-semibold">{resultCount}</span> of{' '}
              {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
            </>
          ) : (
            <>
              <span className="text-ink-700 dark:text-ink-200 font-semibold">{totalCount}</span>{' '}
              {totalCount === 1 ? 'entry' : 'entries'} in this ledger
            </>
          )}
        </p>

        {isFiltered ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-primary focus-visible:ring-ring rounded text-xs font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
};
