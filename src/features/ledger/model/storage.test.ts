import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_KEY, STORAGE_KEY, loadLedger, persistLedger } from './storage';
import { captureSnapshot } from './snapshots';
import type { LoadResult } from '@/types/storage';
import type { Purchase } from '@/types/purchase';
import type { Wallet } from '@/types/wallet';

const row = (overrides: Partial<Purchase> = {}): Purchase => ({
  id: 'fixed-id',
  sellerName: 'Royal Treasury',
  weight: 100,
  purity: '24K',
  note: 'bars',
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

describe('storage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips purchases through the envelope', () => {
    persistLedger([row()], []);
    const result: LoadResult = loadLedger();
    expect(result.purchases).toHaveLength(1);
    expect(result.purchases[0]?.sellerName).toBe('Royal Treasury');
    expect(result.migrated).toBe(false);
    expect(result.recoveredFromCorruption).toBe(false);
  });

  it('writes a versioned envelope', () => {
    persistLedger([row()], [wallet()]);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(raw.version).toBe(3);
    expect(Array.isArray(raw.purchases)).toBe(true);
    expect(Array.isArray(raw.wallets)).toBe(true);
  });

  it('round-trips wallets and the entry-to-wallet link', () => {
    persistLedger([row({ walletId: 'w1' })], [wallet()]);

    const { purchases, wallets } = loadLedger();
    expect(wallets).toHaveLength(1);
    expect(wallets[0]?.name).toBe('Home safe');
    expect(purchases[0]?.walletId).toBe('w1');
  });

  it('returns empty state when nothing is stored', () => {
    const result = loadLedger();
    expect(result.purchases).toEqual([]);
    expect(result.wallets).toEqual([]);
  });

  it('recovers from unparseable JSON instead of throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const result = loadLedger();
    expect(result.purchases).toEqual([]);
    expect(result.wallets).toEqual([]);
    expect(result.recoveredFromCorruption).toBe(true);
  });

  it('migrates the v1 legacy key and rewrites it under the new key', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({
        purchases: [
          // Legacy shape: Date serialised to a string, no acquiredAt field.
          {
            id: 'legacy-1',
            sellerName: 'Old Vendor',
            weight: 12.5,
            purity: '22K',
            createdAt: '2022-05-05T00:00:00.000Z',
          },
        ],
      }),
    );

    const result = loadLedger();
    expect(result.migrated).toBe(true);
    expect(result.purchases).toHaveLength(1);
    // acquiredAt backfilled from createdAt
    expect(result.purchases[0]?.acquiredAt).toBe('2022-05-05T00:00:00.000Z');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('drops rows that cannot be repaired', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        purchases: [
          { sellerName: '', weight: 10 },
          { sellerName: 'Good', weight: 10, purity: '24K', acquiredAt: '2024-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' },
          { sellerName: 'Negative', weight: -3 },
          null,
          'garbage',
        ],
      }),
    );

    const { purchases } = loadLedger();
    expect(purchases).toHaveLength(1);
    expect(purchases[0]?.sellerName).toBe('Good');
  });

  it('fills in a missing id and invalid purity', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        purchases: [
          {
            sellerName: 'No Id',
            weight: 5,
            purity: '14K',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    const [purchase] = loadLedger().purchases;
    expect(purchase?.id).toBeTruthy();
    expect(purchase?.purity).toBe('18K');
  });

  it('throws a readable error when the quota is exceeded', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => persistLedger([row()], [])).toThrow(/local storage/i);
    spy.mockRestore();
  });

  describe('wallets in the envelope', () => {
    it('loads a v2 payload that has entries but no wallets key', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, purchases: [row()] }),
      );

      const { purchases, wallets } = loadLedger();
      expect(purchases).toHaveLength(1);
      expect(wallets).toEqual([]);
      expect(purchases[0]?.walletId).toBeUndefined();
    });

    it('drops wallets that cannot be repaired', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 3,
          purchases: [row()],
          wallets: [wallet(), { name: '   ' }, null, 'garbage', { id: 'w9', name: 'Bank box' }],
        }),
      );

      const { wallets } = loadLedger();
      expect(wallets.map((w) => w.name)).toEqual(['Home safe', 'Bank box']);
    });

    it('drops an entry link to a wallet that is not in the payload', () => {
      // The entry is never deleted or altered beyond the link: this is the
      // storage half of "deleting a wallet does not touch its entries".
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 3,
          purchases: [row({ walletId: 'gone' }), row({ id: 'b', walletId: 'w1' })],
          wallets: [wallet()],
        }),
      );

      const { purchases } = loadLedger();
      expect(purchases).toHaveLength(2);
      expect(purchases[0]?.walletId).toBeUndefined();
      expect(purchases[0]?.sellerName).toBe('Royal Treasury');
      expect(purchases[1]?.walletId).toBe('w1');
    });
  });

  describe('recovery', () => {
    it('reports no recovery on a clean load', () => {
      persistLedger([row()], []);
      expect(loadLedger().recovery).toBeNull();
    });

    it('offers the newest snapshot when the payload is unparseable', () => {
      captureSnapshot([row({ id: 'snap-1', sellerName: 'From Snapshot' })], {
        now: '2026-11-01T00:00:00.000Z',
      });
      localStorage.setItem(STORAGE_KEY, '{not json');

      const result = loadLedger();
      expect(result.recoveredFromCorruption).toBe(true);
      expect(result.purchases).toEqual([]);
      expect(result.recovery?.purchases[0]?.sellerName).toBe('From Snapshot');
    });

    it('carries the wallets in the offered snapshot', () => {
      captureSnapshot([row({ walletId: 'w1' })], {
        wallets: [wallet()],
        now: '2026-11-01T00:00:00.000Z',
      });
      localStorage.setItem(STORAGE_KEY, '{not json');

      expect(loadLedger().recovery?.wallets?.[0]?.name).toBe('Home safe');
    });

    it('treats a payload that yields no readable rows as corruption', () => {
      // Rows existed, but every one was unrepairable. The user's ledger is
      // equally gone, so the same escape hatch has to be offered.
      captureSnapshot([row({ id: 'snap-2' })], { now: '2026-11-01T00:00:00.000Z' });
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, purchases: [{ sellerName: '', weight: 0 }] }),
      );

      const result = loadLedger();
      expect(result.recoveredFromCorruption).toBe(true);
      expect(result.purchases).toEqual([]);
      expect(result.recovery?.entryCount).toBe(1);
      expect(result.recovery?.purchases[0]?.sellerName).toBe('Royal Treasury');
    });

    it('does not offer recovery when the payload is simply absent', () => {
      captureSnapshot([row()], { now: '2026-11-01T00:00:00.000Z' });
      // No ledger key at all: a first visit, not a loss.
      const result = loadLedger();
      expect(result.recoveredFromCorruption).toBe(false);
      expect(result.recovery).toBeNull();
    });

    it('offers no recovery when corruption is detected and no snapshot exists', () => {
      localStorage.setItem(STORAGE_KEY, '{not json');
      expect(loadLedger().recovery).toBeNull();
    });
  });
});
