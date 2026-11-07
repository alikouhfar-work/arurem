import { describe, expect, it } from 'vitest';
import {
  applyDraft,
  createPurchase,
  fineGoldGrams,
  purchaseDraftSchema,
  purchaseSchema,
  purityFineness,
  toDraft,
} from './purchase';
import type { Purchase } from '@/types/purchase';

const baseDraft = {
  sellerName: 'Royal Treasury',
  weight: 100,
  purity: '24K' as const,
  note: 'series 2019',
  acquiredAt: '2024-03-01T10:00:00.000Z',
};

describe('purchase domain', () => {
  it('creates a purchase with system fields and trims input', () => {
    const purchase = createPurchase({ ...baseDraft, sellerName: '  Royal Treasury  ' });
    expect(purchase.id).toMatch(/[0-9a-f-]{8,}/);
    expect(purchase.sellerName).toBe('Royal Treasury');
    expect(purchase.createdAt).toBeTypeOf('string');
    expect(purchase.updatedAt).toBeUndefined();
    expect(purchaseSchema.safeParse(purchase).success).toBe(true);
  });

  it('drops an empty memo rather than persisting whitespace', () => {
    expect(createPurchase({ ...baseDraft, note: '   ' }).note).toBeUndefined();
  });

  it('stamps updatedAt on edit and keeps createdAt untouched', () => {
    const original = createPurchase(baseDraft);
    const edited = applyDraft(original, { ...baseDraft, weight: 150 });
    expect(edited.weight).toBe(150);
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.updatedAt).toBeTypeOf('string');
  });

  it('round-trips through JSON without invalidating the schema', () => {
    // Regression: the previous model stored Date objects, which serialise to
    // strings; the zod schema demanded Date, so every edit after a reload
    // silently failed validation and the save button stayed disabled.
    const original = createPurchase(baseDraft);
    const reloaded = JSON.parse(JSON.stringify(original)) as Purchase;
    expect(purchaseSchema.safeParse(reloaded).success).toBe(true);
    expect(toDraft(reloaded).acquiredAt).toBe(baseDraft.acquiredAt);
  });

  it('computes fine gold content from purity', () => {
    const purchase = createPurchase({ ...baseDraft, weight: 100, purity: '18K' });
    expect(fineGoldGrams(purchase)).toBeCloseTo(75, 5);
    expect(purityFineness('24K')).toBeCloseTo(0.9999, 4);
    expect(fineGoldGrams(createPurchase({ ...baseDraft, weight: 10, purity: '22K' }))).toBeCloseTo(9.167, 3);
  });
});

describe('purchaseDraftSchema', () => {
  const parse = (overrides: Partial<Record<string, unknown>>) =>
    purchaseDraftSchema.safeParse({ ...baseDraft, ...overrides });

  it('accepts a valid draft', () => {
    expect(parse({}).success).toBe(true);
  });

  it('rejects an empty vendor name', () => {
    const result = parse({ sellerName: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/who you bought from/i);
    }
  });

  it('rejects zero, negative, and non-finite weights', () => {
    for (const weight of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(parse({ weight }).success).toBe(false);
    }
  });

  it('rejects an unknown purity', () => {
    expect(parse({ purity: '14K' }).success).toBe(false);
  });

  it('rejects a memo over 2000 characters', () => {
    expect(parse({ note: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('rejects a non-ISO acquisition date', () => {
    expect(parse({ acquiredAt: '2024-03-01' }).success).toBe(false);
  });
});
