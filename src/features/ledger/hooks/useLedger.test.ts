import { describe, expect, it } from 'vitest';
import { ledgerReducer } from './useLedger';
import type { Purchase, PurchaseDraft } from '@/types/purchase';

const draft: PurchaseDraft = {
  sellerName: 'Vendor',
  weight: 10,
  purity: '24K',
  note: '',
  acquiredAt: '2024-03-01T10:00:00.000Z',
};

const purchase = (id: string): Purchase => ({
  id,
  sellerName: `Vendor ${id}`,
  weight: 10,
  purity: '24K',
  acquiredAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-03-01T10:00:00.000Z',
});

const state = (purchases: Purchase[] = []) => ({
  purchases,
  status: 'idle' as const,
  error: null,
  migrated: false,
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
    const next = ledgerReducer(state([purchase('a')]), {
      type: 'replace-all',
      purchases: [purchase('x'), purchase('y')],
    });
    expect(next.purchases.map((p) => p.id)).toEqual(['x', 'y']);
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
});
