import { describe, expect, it } from 'vitest';
import { buildExport, parseImport } from './backup';
import type { Purchase } from '@/types/purchase';
import type { Wallet } from '@/types/wallet';

const row = (overrides: Partial<Purchase> = {}): Purchase => ({
  id: 'abc',
  sellerName: 'Royal Treasury',
  weight: 100,
  purity: '24K',
  acquiredAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-03-01T10:00:00.000Z',
  ...overrides,
});

const wallet = (overrides: Partial<Wallet> = {}): Wallet => ({
  id: 'w1',
  name: 'Home safe',
  createdAt: '2024-03-01T10:00:00.000Z',
  ...overrides,
});

describe('buildExport', () => {
  it('produces a versioned, self-describing payload', () => {
    const payload = buildExport([row()], [wallet()]);
    expect(payload.format).toBe('arurem.backup');
    expect(payload.version).toBe(3);
    expect(payload.purchases).toHaveLength(1);
    expect(payload.wallets).toHaveLength(1);
    expect(new Date(payload.exportedAt).toString()).not.toBe('Invalid Date');
  });

  it('defaults to no wallets so a caller cannot emit an undefined list', () => {
    expect(buildExport([row()]).wallets).toEqual([]);
  });
});

describe('parseImport', () => {
  it('accepts an envelope payload', () => {
    const result = parseImport(JSON.stringify(buildExport([row()], [wallet()])));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.purchases).toHaveLength(1);
      expect(result.wallets).toHaveLength(1);
      expect(result.skipped).toBe(0);
    }
  });

  it('accepts a bare array (the v1 export shape)', () => {
    const result = parseImport(JSON.stringify([row()]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.purchases).toHaveLength(1);
      expect(result.wallets).toEqual([]);
    }
  });

  it('rejects invalid JSON with a readable reason', () => {
    const result = parseImport('{oops');
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toMatch(/not valid JSON/i);
  });

  it('rejects a payload with no purchases list', () => {
    const result = parseImport(JSON.stringify({ hello: 'world' }));
    expect(result).toMatchObject({ ok: false });
  });

  it('rejects a file where every row is invalid', () => {
    const result = parseImport(JSON.stringify([{ sellerName: '' }, { weight: -1 }]));
    expect(result).toMatchObject({ ok: false });
  });

  it('skips invalid rows but keeps the valid ones', () => {
    const result = parseImport(
      JSON.stringify({
        purchases: [
          row(),
          { sellerName: '', weight: 5 },
          { sellerName: 'No weight' },
          row({ id: 'def', sellerName: 'Second' }),
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.purchases).toHaveLength(2);
      expect(result.skipped).toBe(2);
    }
  });

  it('repairs missing timestamps instead of dropping the row', () => {
    const result = parseImport(
      JSON.stringify([{ sellerName: 'Repairable', weight: 3, purity: '18K' }]),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.purchases[0]?.acquiredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.purchases[0]?.purity).toBe('18K');
    }
  });

  describe('wallets', () => {
    it('restores entries and wallets together with their links', () => {
      const result = parseImport(
        JSON.stringify(buildExport([row({ walletId: 'w1' })], [wallet()])),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.wallets[0]?.name).toBe('Home safe');
        expect(result.purchases[0]?.walletId).toBe('w1');
      }
    });

    it('unlinks an entry whose wallet is not in the file', () => {
      // A hand-edited or partial backup must not restore a link to nothing —
      // the entry survives, unassigned, rather than disappearing from view.
      const result = parseImport(
        JSON.stringify({ purchases: [row({ walletId: 'missing' })], wallets: [] }),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.purchases).toHaveLength(1);
        expect(result.purchases[0]?.walletId).toBeUndefined();
      }
    });

    it('drops malformed wallets while keeping the entries', () => {
      const result = parseImport(
        JSON.stringify({
          purchases: [row()],
          wallets: [wallet(), { name: '  ' }, { id: 'w2' }, 'garbage'],
        }),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.wallets.map((w) => w.name)).toEqual(['Home safe']);
        expect(result.purchases).toHaveLength(1);
      }
    });

    it('never imports the "no wallet" sentinel as a wallet id', () => {
      const result = parseImport(
        JSON.stringify({ purchases: [row({ walletId: '__none__' })], wallets: [] }),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.purchases[0]?.walletId).toBeUndefined();
    });
  });
});
