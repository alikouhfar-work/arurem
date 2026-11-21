import { describe, expect, it } from 'vitest';
import {
  applyWalletDraft,
  computeWalletSummaries,
  countUnassigned,
  createWallet,
  emptyWalletDraft,
  entriesInWallet,
  isWalletNameTaken,
  toWalletDraft,
  walletDraftSchema,
  walletSchema,
} from './wallet';
import { walletDraftSchemaWith } from './wallet.schema';
import type { Purchase } from '@/types/purchase';
import type { Wallet } from '@/types/wallet';

const row = (overrides: Partial<Purchase>): Purchase => ({
  id: overrides.id ?? Math.random().toString(36).slice(2),
  sellerName: 'Vendor',
  weight: 10,
  purity: '24K',
  acquiredAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const wallet = (id: string, name = `Wallet ${id}`): Wallet => ({
  id,
  name,
  createdAt: '2024-01-01T00:00:00.000Z',
});

describe('wallet domain', () => {
  it('creates a wallet with system fields and trims input', () => {
    const created = createWallet({ name: '  Home safe  ', note: '  under the bed  ' });
    expect(created.id).toMatch(/[0-9a-f-]{8,}/);
    expect(created.name).toBe('Home safe');
    expect(created.note).toBe('under the bed');
    expect(created.createdAt).toBeTypeOf('string');
    expect(created.updatedAt).toBeUndefined();
    expect(walletSchema.safeParse(created).success).toBe(true);
  });

  it('drops an empty note rather than persisting whitespace', () => {
    expect(createWallet({ name: 'Safe', note: '   ' }).note).toBeUndefined();
  });

  it('stamps updatedAt on edit and keeps createdAt untouched', () => {
    const original = createWallet({ name: 'Safe', note: '' });
    const edited = applyWalletDraft(original, { name: 'Bank box', note: '' });
    expect(edited.name).toBe('Bank box');
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.updatedAt).toBeTypeOf('string');
  });

  it('round-trips a draft', () => {
    const created = createWallet({ name: 'Safe', note: 'code 1234' });
    expect(toWalletDraft(created)).toEqual({ name: 'Safe', note: 'code 1234' });
    expect(emptyWalletDraft()).toEqual({ name: '', note: '' });
  });

  it('round-trips through JSON without invalidating the schema', () => {
    const created = createWallet({ name: 'Safe', note: '' });
    const reloaded = JSON.parse(JSON.stringify(created)) as Wallet;
    expect(walletSchema.safeParse(reloaded).success).toBe(true);
  });
});

describe('walletDraftSchema', () => {
  const parse = (overrides: Partial<Record<string, unknown>>) =>
    walletDraftSchema.safeParse({ name: 'Safe', note: '', ...overrides });

  it('accepts a valid draft', () => {
    expect(parse({}).success).toBe(true);
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(parse({ name: '   ' }).success).toBe(false);
  });

  it('rejects a name over 80 characters', () => {
    expect(parse({ name: 'x'.repeat(81) }).success).toBe(false);
  });

  it('rejects a note over 500 characters', () => {
    expect(parse({ note: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('wallet name uniqueness', () => {
  it('detects a duplicate regardless of case and padding', () => {
    const wallets = [wallet('w1', 'Home safe')];
    expect(isWalletNameTaken(wallets, 'home SAFE')).toBe(true);
    expect(isWalletNameTaken(wallets, '  Home safe  ')).toBe(true);
  });

  it('allows a wallet to keep its own name', () => {
    const wallets = [wallet('w1', 'Home safe')];
    expect(isWalletNameTaken(wallets, 'Home safe', 'w1')).toBe(false);
  });

  it('allows a genuinely new name', () => {
    expect(isWalletNameTaken([wallet('w1', 'Home safe')], 'Bank box')).toBe(false);
  });

  it('treats blank input as not taken, leaving it to the required rule', () => {
    expect(isWalletNameTaken([wallet('w1', 'Home safe')], '   ')).toBe(false);
  });

  it('surfaces the duplicate as a field error on the name', () => {
    const schema = walletDraftSchemaWith((name) =>
      isWalletNameTaken([wallet('w1', 'Home safe')], name),
    );
    const result = schema.safeParse({ name: 'Home safe', note: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['name']);
      expect(result.error.issues[0]?.message).toMatch(/already exists/i);
    }
  });
});

describe('computeWalletSummaries', () => {
  it('returns one row per wallet with zeroes when nothing is assigned', () => {
    const summaries = computeWalletSummaries([], [wallet('w1'), wallet('w2')]);
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({ entryCount: 0, grossGrams: 0, fineGrams: 0 });
  });

  it('totals gross and fine weight per wallet', () => {
    const summaries = computeWalletSummaries(
      [
        row({ id: 'a', walletId: 'w1', weight: 100, purity: '24K' }),
        row({ id: 'b', walletId: 'w1', weight: 100, purity: '18K' }),
      ],
      [wallet('w1')],
    );

    expect(summaries[0]?.entryCount).toBe(2);
    expect(summaries[0]?.grossGrams).toBe(200);
    expect(summaries[0]?.fineGrams).toBeCloseTo(174.99, 2);
  });

  it('keeps wallets separate', () => {
    const summaries = computeWalletSummaries(
      [
        row({ id: 'a', walletId: 'w1', weight: 10 }),
        row({ id: 'b', walletId: 'w2', weight: 20 }),
      ],
      [wallet('w1'), wallet('w2')],
    );
    expect(summaries[0]?.grossGrams).toBe(10);
    expect(summaries[1]?.grossGrams).toBe(20);
  });

  it('ignores a link to a wallet that does not exist', () => {
    const summaries = computeWalletSummaries(
      [row({ id: 'a', walletId: 'gone', weight: 20 })],
      [wallet('w1')],
    );
    expect(summaries[0]?.entryCount).toBe(0);
    expect(summaries[0]?.grossGrams).toBe(0);
  });
});

describe('countUnassigned', () => {
  it('counts entries with no wallet', () => {
    const purchases = [row({ id: 'a' }), row({ id: 'b', walletId: 'w1' })];
    expect(countUnassigned(purchases, [wallet('w1')])).toBe(1);
  });

  it('counts an entry whose wallet no longer exists as unassigned', () => {
    // Without this the entry would vanish from every wallet and from the
    // unassigned list at once — visible nowhere.
    const purchases = [row({ id: 'a', walletId: 'gone' })];
    expect(countUnassigned(purchases, [])).toBe(1);
  });

  it('is zero when everything is assigned', () => {
    expect(countUnassigned([row({ id: 'a', walletId: 'w1' })], [wallet('w1')])).toBe(0);
  });
});

describe('entriesInWallet', () => {
  it('returns only the entries pointing at that wallet', () => {
    const purchases = [
      row({ id: 'a', walletId: 'w1' }),
      row({ id: 'b', walletId: 'w2' }),
      row({ id: 'c', walletId: 'w1' }),
    ];
    expect(entriesInWallet(purchases, 'w1').map((entry) => entry.id)).toEqual(['a', 'c']);
  });

  it('returns nothing for an empty wallet', () => {
    expect(entriesInWallet([row({ id: 'a', walletId: 'w2' })], 'w1')).toEqual([]);
  });
});
