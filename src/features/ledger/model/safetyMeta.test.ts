import { beforeEach, describe, expect, it } from 'vitest';
import { META_KEY, loadSafetyMeta, persistSafetyMeta } from './safetyMeta';
import type { SafetyMeta } from '@/types/persistence';

describe('safetyMeta', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty record when nothing is stored', () => {
    expect(loadSafetyMeta()).toEqual({ lastExportedAt: null, nudgeDismissedAt: null });
  });

  it('round-trips the export stamps', () => {
    const meta: SafetyMeta = {
      lastExportedAt: '2026-11-01T00:00:00.000Z',
      nudgeDismissedAt: '2026-11-02T00:00:00.000Z',
    };
    persistSafetyMeta(meta);
    expect(loadSafetyMeta()).toEqual(meta);
  });

  it('recovers from unparseable JSON without throwing', () => {
    localStorage.setItem(META_KEY, '{not json');
    expect(loadSafetyMeta()).toEqual({ lastExportedAt: null, nudgeDismissedAt: null });
  });

  it('discards stamps that are not valid dates', () => {
    localStorage.setItem(
      META_KEY,
      JSON.stringify({ lastExportedAt: 'yesterday', nudgeDismissedAt: 42 }),
    );
    expect(loadSafetyMeta()).toEqual({ lastExportedAt: null, nudgeDismissedAt: null });
  });

  it('swallows a write failure rather than blocking the export it describes', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };

    expect(() =>
      persistSafetyMeta({ lastExportedAt: null, nudgeDismissedAt: null }),
    ).not.toThrow();

    Storage.prototype.setItem = original;
  });
});
