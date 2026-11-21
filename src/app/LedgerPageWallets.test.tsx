import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster, toast } from 'react-hot-toast';
import { beforeEach, describe, expect, it } from 'vitest';
import { LedgerPage } from './LedgerPage';
import { STORAGE_KEY } from '@/features/ledger/model/storage';

/**
 * Wallet flows through the real page.
 *
 * The three product rules these lock:
 *   1. Wallets can be created, renamed, and deleted.
 *   2. An entry belongs to at most one wallet at a time — assigning it moves
 *      it, it never appears in two.
 *   3. Deleting a wallet does not touch its entries.
 */

const renderPage = () =>
  rtlRender(
    <>
      <LedgerPage />
      <Toaster />
    </>,
  );

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  sellerName: 'Royal Treasury',
  weight: 100,
  purity: '24K',
  acquiredAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-03-01T10:00:00.000Z',
  ...overrides,
});

const walletRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'w1',
  name: 'Home safe',
  createdAt: '2024-03-01T10:00:00.000Z',
  ...overrides,
});

const seed = (rows: unknown[], wallets: unknown[] = []) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, purchases: rows, wallets }));
};

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');

/** Opens the entry sheet from the header button and waits for the form. */
const openNewEntry = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /new entry/i }));
  return screen.findByLabelText(/^Vendor/i);
};

describe('LedgerPage — wallets', () => {
  // react-hot-toast keeps its queue at module scope, so an Undo left over from
  // one test reappears in the next. Clearing it keeps each test independent.
  beforeEach(() => {
    localStorage.clear();
    toast.remove();
  });

  it('offers to create a wallet when there are none', () => {
    renderPage();
    expect(screen.getByText(/group entries by where they are kept/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /new wallet/i }).length).toBeGreaterThan(0);
  });

  it('creates a wallet and shows it as a filter chip', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getAllByRole('button', { name: /new wallet/i })[0]!);
    await user.type(await screen.findByLabelText(/^Name/i), 'Home safe');
    await user.click(screen.getByRole('button', { name: /create wallet/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /home safe/i })).toBeInTheDocument();
    });
    expect(stored().wallets).toHaveLength(1);
    expect(screen.getByText(/wallet created/i)).toBeInTheDocument();
  });

  it('refuses a duplicate wallet name and explains why', async () => {
    seed([], [walletRow()]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /manage/i }));
    await user.click(await screen.findByRole('button', { name: /^new wallet$/i }));
    await user.type(await screen.findByLabelText(/^Name/i), 'home safe');
    await user.click(screen.getByRole('button', { name: /create wallet/i }));

    expect(await screen.findByText(/wallet with this name already exists/i)).toBeInTheDocument();
    expect(stored().wallets).toHaveLength(1);
  });

  it('renames a wallet without disturbing its entries', async () => {
    seed([row({ walletId: 'w1' })], [walletRow()]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /manage/i }));
    await user.click(await screen.findByRole('button', { name: /edit home safe/i }));

    const name = await screen.findByLabelText(/^Name/i);
    await user.clear(name);
    await user.type(name, 'Bank box');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(stored().wallets[0].name).toBe('Bank box');
    });
    // The entry kept its link throughout.
    expect(stored().purchases[0].walletId).toBe('w1');
    expect(screen.getByRole('heading', { name: 'Royal Treasury' })).toBeInTheDocument();
  });

  it('assigns an entry to a wallet from the entry form', async () => {
    seed([], [walletRow()]);
    const user = userEvent.setup();
    renderPage();

    await user.type(await openNewEntry(user), 'Vault A');
    await user.type(screen.getByLabelText(/^Gross weight/i), '25');

    await user.click(screen.getByRole('combobox', { name: /^wallet/i }));
    await user.click(await screen.findByRole('option', { name: 'Home safe' }));
    await user.click(screen.getByRole('button', { name: /^add entry$/i }));

    await waitFor(() => {
      expect(stored().purchases[0].walletId).toBe('w1');
    });
    // And the wallet is named on the row, not just stored.
    const list = screen.getByRole('list', { name: /ledger entries/i });
    expect(within(list).getByText('Home safe')).toBeInTheDocument();
  });

  it('moves an entry from one wallet to another, never duplicating it', async () => {
    seed(
      [row({ walletId: 'w1' })],
      [walletRow(), walletRow({ id: 'w2', name: 'Bank box' })],
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /edit royal treasury/i }));
    await user.click(await screen.findByRole('combobox', { name: /^wallet/i }));
    await user.click(await screen.findByRole('option', { name: 'Bank box' }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(stored().purchases[0].walletId).toBe('w2');
    });
    // One entry, one wallet — the link is singular by construction.
    expect(stored().purchases).toHaveLength(1);
    expect(stored().purchases[0].walletId).not.toBe('w1');
  });

  it('clears an entry out of its wallet when "No wallet" is chosen', async () => {
    seed([row({ walletId: 'w1' })], [walletRow()]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /edit royal treasury/i }));
    await user.click(await screen.findByRole('combobox', { name: /^wallet/i }));
    await user.click(await screen.findByRole('option', { name: /no wallet/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(stored().purchases[0].walletId).toBeUndefined();
    });
    // The sentinel must never reach storage as an id.
    expect(stored().purchases[0].walletId).not.toBe('__none__');
  });

  it('filters the ledger by wallet', async () => {
    seed(
      [row({ id: 'a', sellerName: 'In Safe', walletId: 'w1' }), row({ id: 'b', sellerName: 'Loose' })],
      [walletRow()],
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /home safe/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'In Safe' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Loose' })).not.toBeInTheDocument();
    });

    // Unassigned is its own slice, so nothing can become unreachable.
    await user.click(screen.getByRole('button', { name: /unassigned/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Loose' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'In Safe' })).not.toBeInTheDocument();
    });
  });

  it('deletes a wallet without deleting its entries', async () => {
    seed([row({ walletId: 'w1' })], [walletRow()]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /manage/i }));
    await user.click(await screen.findByRole('button', { name: /delete home safe/i }));

    // The dialog states the rule, not just the consequence.
    expect(await screen.findByText(/does not delete them/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete wallet$/i }));

    await waitFor(() => {
      expect(stored().wallets).toHaveLength(0);
    });

    // The entry is still here with every field it had.
    const persisted = stored().purchases[0];
    expect(persisted.id).toBe('r1');
    expect(persisted.sellerName).toBe('Royal Treasury');
    expect(persisted.weight).toBe(100);
    expect(persisted.walletId).toBeUndefined();

    // Close the manager to read the page behind it, which Radix hides from AT
    // while a modal is open.
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('heading', { name: 'Royal Treasury' })).toBeInTheDocument();
  });

  it('undoes a wallet deletion and relinks the entries it held', async () => {
    seed([row({ walletId: 'w1' })], [walletRow()]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /manage/i }));
    await user.click(await screen.findByRole('button', { name: /delete home safe/i }));
    await user.click(await screen.findByRole('button', { name: /^delete wallet$/i }));

    await waitFor(() => {
      expect(stored().wallets).toHaveLength(0);
    });

    // The manager is still open and Radix hides everything else from assistive
    // tech while a modal is up, so close it before reaching for the toast.
    await user.keyboard('{Escape}');
    await user.click(await screen.findByRole('button', { name: /^undo$/i }));

    await waitFor(() => {
      expect(stored().wallets).toHaveLength(1);
    });
    expect(stored().wallets[0].name).toBe('Home safe');
    expect(stored().purchases[0].walletId).toBe('w1');
  });

  it('keeps wallets and their links across a remount', async () => {
    seed([row({ walletId: 'w1' })], [walletRow()]);
    const first = renderPage();
    expect(screen.getByRole('heading', { name: 'Royal Treasury' })).toBeInTheDocument();
    first.unmount();

    renderPage();
    expect(screen.getByRole('button', { name: /home safe/i })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: /ledger entries/i });
    expect(within(list).getByText('Home safe')).toBeInTheDocument();
  });

  it('shows a wallet as empty rather than hiding it', async () => {
    seed([row({ walletId: 'w2' })], [walletRow(), walletRow({ id: 'w2', name: 'Bank box' })]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /manage/i }));

    const dialog = await screen.findByRole('dialog');
    // "Home safe" holds nothing but is still listed — that is information.
    const emptyRow = within(dialog).getByText('Home safe').closest('li');
    expect(emptyRow).not.toBeNull();
    expect(within(emptyRow as HTMLElement).getByText(/0 entries/)).toBeInTheDocument();
  });

  it('lets the wallet list shrink inside the dialog', async () => {
    seed([], [walletRow({ name: 'A wallet name long enough to overflow a 320px dialog' })]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /manage/i }));
    const dialog = await screen.findByRole('dialog');

    // The dialog is a grid; without `min-w-0` on the list and its rows, the
    // unbreakable wallet name becomes the track's min-content width and the
    // rows spill out of the dialog at 320px (verified in a real browser). jsdom
    // applies no stylesheet, so this locks the classes that fix it.
    const list = within(dialog).getByRole('list', { name: /wallets/i });
    expect(list).toHaveClass('min-w-0');
    for (const item of within(list).getAllByRole('listitem')) {
      expect(item).toHaveClass('min-w-0');
    }
  });
});
