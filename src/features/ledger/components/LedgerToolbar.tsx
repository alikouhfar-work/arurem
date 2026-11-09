import { Input } from '@/shared/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/Select';
import { LayoutGrid, List, Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { PURITY_VALUES } from '../model/purchase.schema';
import { cn } from '@/shared/lib/utils';
import type { LedgerToolbarProps } from '@/types/components';
import type { PurityFilter, SortKey, ViewMode } from '@/types/ledger';

const SORT_LABELS: Record<SortKey, string> = {
  'acquired-desc': 'Newest first',
  'acquired-asc': 'Oldest first',
  'weight-desc': 'Heaviest first',
  'vendor-asc': 'Vendor A–Z',
};

const VIEW_OPTIONS: { value: ViewMode; label: string; Icon: typeof List }[] = [
  { value: 'list', label: 'List view', Icon: List },
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
];

export function LedgerToolbar({
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
}: LedgerToolbarProps) {
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="ledger-search" className="sr-only">
            Search entries
          </label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
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
            className="h-11 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                searchRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Clear search</span>
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={purityFilter}
            onValueChange={(value) => onPurityFilterChange(value as PurityFilter)}
          >
            <SelectTrigger
              className="h-11 min-w-0 flex-1 basis-[6.5rem] gap-1.5 sm:w-[8.5rem] sm:flex-none"
              aria-label="Filter by purity"
            >
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
            <SelectTrigger
              className="h-11 min-w-0 flex-1 basis-[6.5rem] gap-1.5 sm:w-[9.5rem] sm:flex-none"
              aria-label="Sort entries"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            role="group"
            aria-label="Layout"
            className="bg-muted flex h-11 shrink-0 items-center gap-0.5 rounded-lg p-1"
          >
            {VIEW_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onViewModeChange(value)}
                aria-pressed={viewMode === value}
                className={cn(
                  'focus-visible:ring-ring flex size-9 items-center justify-center rounded-md transition-all focus-visible:ring-2 focus-visible:outline-none',
                  viewMode === value
                    ? 'bg-card text-ink-900 dark:text-ink-50 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
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
}
