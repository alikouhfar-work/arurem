import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LedgerToolbar } from './LedgerToolbar';
import type { LedgerToolbarProps } from '@/types/components';

/**
 * Toolbar contract.
 *
 * jsdom applies no stylesheet, so this cannot assert rendered heights — that is
 * verified against the real browser. What it does lock is the part a stylesheet
 * cannot: that every control in the row resolves the *same* geometry classes,
 * that each control keeps its accessible name, and that the switch reports its
 * state. A regression here means someone reintroduced a bespoke height or
 * radius on one control, which is exactly how the original 44px-vs-36px row
 * happened.
 */

const props: LedgerToolbarProps = {
  searchQuery: '',
  onSearchChange: vi.fn(),
  sortKey: 'acquired-desc',
  onSortChange: vi.fn(),
  purityFilter: 'all',
  onPurityFilterChange: vi.fn(),
  viewMode: 'list',
  onViewModeChange: vi.fn(),
  resultCount: 3,
  totalCount: 12,
  isFiltered: false,
  onClearFilters: vi.fn(),
};

const renderToolbar = (overrides: Partial<LedgerToolbarProps> = {}) =>
  render(<LedgerToolbar {...props} {...overrides} />);

describe('LedgerToolbar geometry contract', () => {
  it('sizes the search field and both selects from the same control tokens', () => {
    renderToolbar();

    const search = screen.getByRole('searchbox', { name: /search entries/i });
    const selects = screen.getAllByRole('combobox');

    expect(search).toHaveClass('h-(--control-height)', 'rounded-control');
    expect(selects).toHaveLength(2);
    for (const select of selects) {
      expect(select).toHaveClass('h-(--control-height)', 'rounded-control', 'border');
    }
  });

  it('derives the view switch track and segments from the control tokens', () => {
    renderToolbar();

    const group = screen.getByRole('group', { name: /layout/i });
    expect(group).toHaveClass('h-(--control-height)', 'rounded-control', 'border');

    for (const button of screen.getAllByRole('button', { pressed: false }).concat(
      screen.getAllByRole('button', { pressed: true }),
    )) {
      // Only the switch segments carry the pressed state; skip the clear button.
      if (!button.getAttribute('aria-pressed')) continue;
      expect(button).toHaveClass(
        'h-(--control-segment)',
        'w-(--control-segment)',
        'rounded-control-inner',
      );
    }
  });

  it('does not hard-code a pixel height on any control', () => {
    renderToolbar();
    const controls = [
      screen.getByRole('searchbox'),
      ...screen.getAllByRole('combobox'),
      screen.getByRole('group', { name: /layout/i }),
    ];

    for (const control of controls) {
      // The old build used h-11 / h-9 / size-9 here, which is how the row
      // ended up 44px tall on two controls and 36px on the others.
      expect(control.className).not.toMatch(/\bh-11\b|\bh-9\b|\bsize-9\b/);
    }
  });
});

describe('LedgerToolbar behaviour', () => {
  it('names every control for assistive tech', () => {
    renderToolbar();
    expect(screen.getByRole('searchbox', { name: /search entries/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter by purity/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /sort entries/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument();
  });

  it('reports the active view via aria-pressed, not colour alone', () => {
    renderToolbar({ viewMode: 'grid' });
    expect(screen.getByRole('button', { name: /grid view/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /list view/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('emits the view change on click', async () => {
    const onViewModeChange = vi.fn();
    renderToolbar({ onViewModeChange });
    await userEvent.setup().click(screen.getByRole('button', { name: /grid view/i }));
    expect(onViewModeChange).toHaveBeenCalledWith('grid');
  });

  it('shows a result count as a live region', () => {
    renderToolbar({ isFiltered: true, resultCount: 3, totalCount: 12 });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('3');
    expect(status).toHaveTextContent('12');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('offers clear-filters only when a filter is active', () => {
    const { rerender } = renderToolbar({ isFiltered: false });
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

    rerender(<LedgerToolbar {...props} isFiltered />);
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('shows a clear button and focuses the field back after clearing search', async () => {
    const onSearchChange = vi.fn();
    renderToolbar({ searchQuery: 'tehran', onSearchChange });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /clear search/i }));

    expect(onSearchChange).toHaveBeenCalledWith('');
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('clears search on Escape', async () => {
    const onSearchChange = vi.fn();
    renderToolbar({ searchQuery: 'tehran', onSearchChange });

    const search = screen.getByRole('searchbox');
    await userEvent.setup().type(search, '{Escape}');
    expect(onSearchChange).toHaveBeenCalledWith('');
  });
});
