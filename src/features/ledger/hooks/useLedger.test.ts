import { describe, expect, it } from 'vitest';
import { ledgerReducer } from './useLedger';
import type { Purchase, PurchaseDraft } from '@/types/purchase';
import type { Wallet, WalletDraft } from '@/types/wallet';

const draft: PurchaseDraft = {
  sellerName: 'Vendor',
  weight: 10,
  purity: '24K',
  note: '',
  acquiredAt: '2024-03-01T10:00:00.000Z',
};

const purchase = (id: string, walletId?: string): Purchase => ({
  id,
  sellerName: `Vendor ${id}`,
  weight: 10,
  purity: '24K',
  ...(walletId ? { walletId } : {}),
  acquiredAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-03-01T10:00:00.000Z',
});

const wallet = (id: string, name = `Wallet ${id}`): Wallet => ({
  id,
  name,
  createdAt: '2024-03-01T10:00:00.000Z',
});

const walletDraft: WalletDraft = { name: 'Home safe', note: '' };

const state = (purchases: Purchase[] = [], wallets: Wallet[] = []) => ({
  purchases,
  wallets,
  status: 'idle' as const,
  error: null,
  recovery: null,
});

describe('ledgerReducer', () => {
  it('prepends a new purchase', () => {
    const next = ledgerReducer(state([purchase('a')]), { type: 'add', purchase: purchase('b') });
    expect(next.purchases.map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('updates only the targeted purchase and stamps updatedAt', () => {
    const next = ledgerReducer(state([purchase('a'), purchase('b')]), {
      type: 'update',
      id: 'a',
      draft: { ...draft, weight: 99 },
    });
    expect(next.purchases[0]?.weight).toBe(99);
    expect(next.purchases[0]?.updatedAt).toBeTypeOf('string');
    expect(next.purchases[1]?.weight).toBe(10);
    expect(next.purchases[1]?.updatedAt).toBeUndefined();
  });

  it('deletes by id and leaves siblings intact', () => {
    const next = ledgerReducer(state([purchase('a'), purchase('b')]), { type: 'delete', id: 'a' });
    expect(next.purchases.map((p) => p.id)).toEqual(['b']);
  });

  it('restores a deleted purchase at its original index', () => {
    const original = [purchase('a'), purchase('b'), purchase('c')];
    const deleted = ledgerReducer(state(original), { type: 'delete', id: 'b' });
    const restored = ledgerReducer(deleted, { type: 'restore', purchase: purchase('b'), index: 1 });
    expect(restored.purchases.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('is idempotent when restoring an entry that already exists', () => {
    const current = state([purchase('a')]);
    const next = ledgerReducer(current, { type: 'restore', purchase: purchase('a'), index: 0 });
    expect(next).toBe(current);
  });

  it('replaces the whole ledger on import', () => {
    const next = ledgerReducer(state([purchase('a')], [wallet('w1')]), {
      type: 'replace-all',
      purchases: [purchase('x'), purchase('y')],
      wallets: [wallet('w2')],
    });
    expect(next.purchases.map((p) => p.id)).toEqual(['x', 'y']);
    expect(next.wallets.map((w) => w.id)).toEqual(['w2']);
  });

  it('records a persistence failure without losing the in-memory change', () => {
    const next = ledgerReducer(state([purchase('a')]), {
      type: 'persist-failed',
      message: 'quota',
    });
    expect(next.status).toBe('error');
    expect(next.error).toBe('quota');
    expect(next.purchases).toHaveLength(1);
  });

  it('clears a pending recovery on dismiss', () => {
    const withRecovery = {
      ...state([]),
      recovery: {
        id: 'snap-1',
        savedAt: '2026-11-01T00:00:00.000Z',
        entryCount: 1,
        purchases: [purchase('a')],
      },
    };
    expect(ledgerReducer(withRecovery, { type: 'dismiss-recovery' }).recovery).toBeNull();
  });

  it('is a no-op when dismissing with no recovery pending', () => {
    const current = state([purchase('a')]);
    expect(ledgerReducer(current, { type: 'dismiss-recovery' })).toBe(current);
  });

  it('clears a pending recovery when an import replaces the ledger', () => {
    const withRecovery = {
      ...state([]),
      recovery: {
        id: 'snap-1',
        savedAt: '2026-11-01T00:00:00.000Z',
        entryCount: 1,
        purchases: [purchase('a')],
      },
    };
    const next = ledgerReducer(withRecovery, {
      type: 'replace-all',
      purchases: [purchase('x')],
      wallets: [],
    });
    expect(next.recovery).toBeNull();
    expect(next.purchases.map((p) => p.id)).toEqual(['x']);
  });

  describe('wallets', () => {
    it('appends a new wallet', () => {
      const next = ledgerReducer(state([], [wallet('w1')]), {
        type: 'add-wallet',
        wallet: wallet('w2'),
      });
      expect(next.wallets.map((w) => w.id)).toEqual(['w1', 'w2']);
    });

    it('renames only the targeted wallet and stamps updatedAt', () => {
      const next = ledgerReducer(state([], [wallet('w1'), wallet('w2')]), {
        type: 'update-wallet',
        id: 'w1',
        draft: { ...walletDraft, name: 'Bank box' },
      });
      expect(next.wallets[0]?.name).toBe('Bank box');
      expect(next.wallets[0]?.updatedAt).toBeTypeOf('string');
      expect(next.wallets[1]?.name).toBe('Wallet w2');
      expect(next.wallets[1]?.updatedAt).toBeUndefined();
    });

    it('deletes the wallet and unlinks its entries without deleting them', () => {
      const next = ledgerReducer(
        state([purchase('a', 'w1'), purchase('b'), purchase('c', 'w1')], [wallet('w1')]),
        { type: 'delete-wallet', id: 'w1' },
      );

      // The entries are all still here, with every other field untouched.
      expect(next.purchases.map((p) => p.id)).toEqual(['a', 'b', 'c']);
      expect(next.purchases[0]?.sellerName).toBe('Vendor a');
      expect(next.purchases[2]?.weight).toBe(10);

      // Only the link is gone, and only where it pointed at the deleted wallet.
      expect(next.purchases[0]?.walletId).toBeUndefined();
      expect(next.purchases[2]?.walletId).toBeUndefined();
      expect(next.purchases[1]?.walletId).toBeUndefined();
      expect(next.wallets).toEqual([]);
    });

    it('leaves entries in other wallets linked when one wallet is deleted', () => {
      const next = ledgerReducer(
        state([purchase('a', 'w1'), purchase('b', 'w2')], [wallet('w1'), wallet('w2')]),
        { type: 'delete-wallet', id: 'w1' },
      );
      expect(next.purchases[0]?.walletId).toBeUndefined();
      expect(next.purchases[1]?.walletId).toBe('w2');
      expect(next.wallets.map((w) => w.id)).toEqual(['w2']);
    });

    it('restores a deleted wallet and relinks the entries it held', () => {
      const original = [wallet('w1'), wallet('w2')];
      const deleted = ledgerReducer(state([purchase('a', 'w1')], original), {
        type: 'delete-wallet',
        id: 'w1',
      });

      const restored = ledgerReducer(deleted, {
        type: 'restore-wallet',
        wallet: wallet('w1'),
        index: 0,
        entryIds: ['a'],
      });

      expect(restored.wallets.map((w) => w.id)).toEqual(['w1', 'w2']);
      expect(restored.purchases[0]?.walletId).toBe('w1');
    });

    it('does not steal an entry that was assigned elsewhere in the meantime', () => {
      const moved = [{ ...purchase('a'), walletId: 'w2' }];
      const restored = ledgerReducer(state(moved, [wallet('w2')]), {
        type: 'restore-wallet',
        wallet: wallet('w1'),
        index: 0,
        entryIds: ['a'],
      });

      expect(restored.wallets.map((w) => w.id)).toEqual(['w1', 'w2']);
      expect(restored.purchases[0]?.walletId).toBe('w2');
    });

    it('is idempotent when restoring a wallet that already exists', () => {
      const current = state([], [wallet('w1')]);
      const next = ledgerReducer(current, {
        type: 'restore-wallet',
        wallet: wallet('w1'),
        index: 0,
        entryIds: [],
      });
      expect(next).toBe(current);
    });

    it('never places one entry in two wallets', () => {
      // The link is a single field, so the invariant holds by construction —
      // this asserts the property that matters rather than the implementation.
      const next = ledgerReducer(state([purchase('a', 'w1')], [wallet('w1'), wallet('w2')]), {
        type: 'update',
        id: 'a',
        draft: { ...draft, walletId: 'w2' },
      });
      expect(next.purchases[0]?.walletId).toBe('w2');
    });

    it('drops an explicit "no wallet" choice rather than storing the sentinel', () => {
      const next = ledgerReducer(state([purchase('a', 'w1')]), {
        type: 'update',
        id: 'a',
        draft: { ...draft, walletId: '__none__' },
      });
      expect(next.purchases[0]?.walletId).toBeUndefined();
    });
  });
});
