import { describe, expect, it } from 'vitest';
import { buildExport, parseImport } from './backup';
import type { Purchase } from '@/types/purchase';

const row = (overrides: Partial<Purchase> = {}): Purchase => ({
  id: 'abc',
  sellerName: 'Royal Treasury',
  weight: 100,
  purity: '24K',
  acquiredAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-03-01T10:00:00.000Z',
  ...overrides,
});

describe('buildExport', () => {
  it('produces a versioned, self-describing payload', () => {
    const payload = buildExport([row()]);
    expect(payload.format).toBe('arurem.backup');
    expect(payload.version).toBe(2);
    expect(payload.purchases).toHaveLength(1);
    expect(new Date(payload.exportedAt).toString()).not.toBe('Invalid Date');
  });
});

describe('parseImport', () => {
  it('accepts an envelope payload', () => {
    const result = parseImport(JSON.stringify(buildExport([row()])));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.purchases).toHaveLength(1);
      expect(result.skipped).toBe(0);
    }
  });

  it('accepts a bare array (the v1 export shape)', () => {
    const result = parseImport(JSON.stringify([row()]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.purchases).toHaveLength(1);
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
});
