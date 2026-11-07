import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it } from 'vitest';
import { LedgerPage } from './ledger-page';

/**
 * End-to-end-ish integration tests against the real page. These cover the
 * regressions found in the audit, so they fail if the old behaviour returns.
 *
 * The Toaster is mounted here because it lives in `main.tsx` in production;
 * without it, toast-driven affordances (like Undo) are not in the tree.
 */
const renderPage = () =>
  rtlRender(
    <>
      <LedgerPage />
      <Toaster />
    </>,
  );

const seed = (rows: unknown[]) => {
  localStorage.setItem('arurem.ledger.v2', JSON.stringify({ version: 2, purchases: rows }));
};

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  sellerName: 'Royal Treasury',
  weight: 100,
  purity: '24K',
  acquiredAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-03-01T10:00:00.000Z',
  ...overrides,
});

describe('LedgerPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows the empty state with a primary call to action', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /no entries yet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first entry/i })).toBeInTheDocument();
  });

  it('renders a seeded entry with its weight', () => {
    seed([row()]);
    renderPage();
    expect(screen.getByRole('heading', { name: 'Royal Treasury' })).toBeInTheDocument();
    expect(screen.getByText('100.000')).toBeInTheDocument();
  });

  it('summarises fine gold, not raw weight, on mixed purities', () => {
    seed([
      row({ id: 'a', sellerName: 'Vault A', weight: 100, purity: '24K' }),
      row({ id: 'b', sellerName: 'Vault B', weight: 100, purity: '18K' }),
    ]);
    renderPage();
    // 100 * 0.9999 + 100 * 0.75 = 174.990
    expect(screen.getByText('174.990')).toBeInTheDocument();
  });

  it('distinguishes "no matches" from "no entries"', async () => {
    seed([row()]);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByRole('searchbox', { name: /search entries/i }), 'zzzz');

    // Regression: the old UI claimed there were no assets at all.
    expect(screen.getByRole('heading', { name: /no matching entries/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /no entries yet/i })).not.toBeInTheDocument();
    expect(screen.getByText(/your entries are still here/i)).toBeInTheDocument();
  });

  it('clears filters from the empty-results state', async () => {
    seed([row()]);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByRole('searchbox'), 'zzzz');
    await user.click(screen.getAllByRole('button', { name: /clear filters/i })[0]!);

    expect(screen.getByRole('heading', { name: 'Royal Treasury' })).toBeInTheDocument();
  });

  it('creates an entry through the sheet', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /add your first entry/i }));

    const vendor = await screen.findByLabelText(/^Vendor/i);
    await user.type(vendor, 'Bazaar Exchange');
    const weight = screen.getByLabelText(/^Gross weight/i);
    await user.type(weight, '12.5');
    await user.click(screen.getByRole('button', { name: /^add entry$/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bazaar Exchange' })).toBeInTheDocument();
    });
    expect(screen.getByText('12.500')).toBeInTheDocument();
  });

  it('refuses to submit without a vendor and explains why', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /add your first entry/i }));
    await user.type(screen.getByLabelText(/^Gross weight/i), '5');
    await user.click(screen.getByRole('button', { name: /^add entry$/i }));

    // The submit button stays enabled; the error is shown instead of a dead end.
    expect(await screen.findByText(/enter who you bought from/i)).toBeInTheDocument();
  });

  it('opens the edit sheet pre-filled and allows saving', async () => {
    seed([row({ updatedAt: '2024-04-01T10:00:00.000Z' })]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /edit royal treasury/i }));

    const vendor = await screen.findByLabelText(/^Vendor/i);
    expect(vendor).toHaveValue('Royal Treasury');

    // Unchanged form: saving is a no-op, so it says so instead of pretending.
    expect(screen.getByRole('button', { name: /no changes/i })).toBeDisabled();

    await user.clear(vendor);
    await user.type(vendor, 'Royal Treasury (updated)');

    // Regression: an entry with updatedAt used to fail schema validation
    // silently, so the save button stayed permanently disabled even after
    // edits. It must become enabled once the form is dirty and valid.
    const save = screen.getByRole('button', { name: /save changes/i });
    expect(save).toBeEnabled();

    await user.click(save);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Royal Treasury (updated)' })).toBeInTheDocument();
    });
  });

  it('deletes an entry and offers undo', async () => {
    seed([row()]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /delete royal treasury/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Royal Treasury' })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^undo$/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Royal Treasury' })).toBeInTheDocument();
    });
  });

  it('persists across a remount', async () => {
    const user = userEvent.setup();
    const first = renderPage();

    await user.click(screen.getByRole('button', { name: /add your first entry/i }));
    await user.type(await screen.findByLabelText(/^Vendor/i), 'Persisted Vendor');
    await user.type(screen.getByLabelText(/^Gross weight/i), '7');
    await user.click(screen.getByRole('button', { name: /^add entry$/i }));

    await waitFor(() => expect(screen.getByText('7.000')).toBeInTheDocument());
    first.unmount();

    renderPage();
    expect(screen.getByRole('heading', { name: 'Persisted Vendor' })).toBeInTheDocument();
  });

  it('splits results by purity filter', async () => {
    seed([
      row({ id: 'a', sellerName: 'Karat Twenty Four', purity: '24K' }),
      row({ id: 'b', sellerName: 'Karat Eighteen', purity: '18K' }),
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('combobox', { name: /filter by purity/i }));
    await user.click(await screen.findByRole('option', { name: '24K' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Karat Twenty Four' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Karat Eighteen' })).not.toBeInTheDocument();
    });
  });

  it('gives every icon-only control an accessible name', () => {
    seed([row()]);
    renderPage();
    // Queries by role+name only succeed when the name resolves.
    expect(screen.getByRole('button', { name: /data options/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to (dark|light) theme/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit royal treasury/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete royal treasury/i })).toBeInTheDocument();
  });
});
