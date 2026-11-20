import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LedgerPage } from './LedgerPage';
import { SNAPSHOTS_KEY } from '@/features/ledger/model/snapshots';
import { META_KEY } from '@/features/ledger/model/safetyMeta';
import { FIRST_BACKUP_THRESHOLD } from '@/constants/safety';

/**
 * Data-safety flows through the real page.
 *
 * These lock the behaviours that make the ledger recoverable: the backup prompt
 * appears when it should and disappears when it should, the footer states the
 * truth, and a corrupt payload offers a snapshot instead of silently presenting
 * an empty ledger.
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

const rows = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    row({ id: `r${i}`, sellerName: `Vendor ${i}`, weight: 10 }),
  );

const seedSnapshot = (purchases: unknown[], savedAt = '2026-11-01T00:00:00.000Z') => {
  localStorage.setItem(
    SNAPSHOTS_KEY,
    JSON.stringify({
      version: 1,
      snapshots: [{ id: 'snap-1', savedAt, entryCount: purchases.length, purchases }],
    }),
  );
};

describe('LedgerPage — data safety', () => {
  beforeEach(() => localStorage.clear());

  it('does not prompt for a backup on an empty ledger', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /download backup/i })).not.toBeInTheDocument();
  });

  it('stays quiet below the threshold', () => {
    seed(rows(FIRST_BACKUP_THRESHOLD - 1));
    renderPage();
    expect(screen.queryByText(/exist only in this browser/i)).not.toBeInTheDocument();
  });

  it('prompts once the threshold is reached', () => {
    seed(rows(FIRST_BACKUP_THRESHOLD));
    renderPage();
    expect(screen.getByText(/5 entries exist only in this browser/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download backup/i })).toBeInTheDocument();
  });

  it('hides the prompt for this session when dismissed', async () => {
    seed(rows(FIRST_BACKUP_THRESHOLD));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /dismiss backup reminder/i }));

    await waitFor(() => {
      expect(screen.queryByText(/exist only in this browser/i)).not.toBeInTheDocument();
    });
  });

  it('records an export so the prompt does not return immediately', async () => {
    seed(rows(FIRST_BACKUP_THRESHOLD));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /download backup/i }));

    await waitFor(() => {
      expect(screen.queryByText(/exist only in this browser/i)).not.toBeInTheDocument();
    });

    const meta: unknown = JSON.parse(localStorage.getItem(META_KEY) ?? '{}');
    expect(meta).toMatchObject({ lastExportedAt: expect.any(String) as unknown });
  });

  it('keeps recording snapshots as the ledger grows', () => {
    seed(rows(3));
    renderPage();
    // The ring is written from the committted ledger, so a reloaded page with
    // entries already has a copy to fall back on.
    expect(localStorage.getItem(SNAPSHOTS_KEY)).not.toBeNull();
  });

  it('offers the newest snapshot when the payload is corrupt, and restores it', async () => {
    seedSnapshot([row({ id: 'snap-row', sellerName: 'Recovered Vendor' })]);
    localStorage.setItem('arurem.ledger.v2', '{not json');

    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText(/your saved ledger could not be read/i)).toBeInTheDocument();
    // Nothing is applied without consent.
    expect(
      screen.queryByRole('heading', { name: 'Recovered Vendor' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /restore snapshot/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Recovered Vendor' })).toBeInTheDocument();
    });
    expect(screen.queryByText(/your saved ledger could not be read/i)).not.toBeInTheDocument();
  });

  it('lets the recovery prompt be dismissed without changing the ledger', async () => {
    seedSnapshot([row({ id: 'snap-row', sellerName: 'Recovered Vendor' })]);
    localStorage.setItem('arurem.ledger.v2', '{not json');

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /dismiss recovery prompt/i }));

    await waitFor(() => {
      expect(screen.queryByText(/your saved ledger could not be read/i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /no entries yet/i })).toBeInTheDocument();
  });

  it('states backup status truthfully in the footer', () => {
    seed([row()]);
    renderPage();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/never backed up/i)).toBeInTheDocument();
    expect(within(footer).getByText(/stored on this device/i)).toBeInTheDocument();
  });

  it('reports the last export date once one has happened', () => {
    seed([row()]);
    localStorage.setItem(
      META_KEY,
      JSON.stringify({ lastExportedAt: '2026-11-02T00:00:00.000Z', nudgeDismissedAt: null }),
    );
    renderPage();

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/last backup 2 Nov 2026/i)).toBeInTheDocument();
  });

  it('never calls the network for any of it', () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetchSpy);
    seed(rows(FIRST_BACKUP_THRESHOLD));

    renderPage();

    for (const call of fetchSpy.mock.calls) {
      const url = String((call as unknown[])[0]);
      expect(url.includes('gold-api') || url.includes('tgju')).toBe(true);
    }

    vi.unstubAllGlobals();
  });
});
