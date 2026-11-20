import { beforeEach, describe, expect, it } from 'vitest';
import {
  SNAPSHOTS_KEY,
  captureSnapshot,
  clearSnapshots,
  readLatestSnapshot,
  readSnapshotMeta,
  readSnapshots,
} from './snapshots';
import { SNAPSHOT_MIN_INTERVAL_MS, SNAPSHOT_RETENTION } from '@/constants/safety';
import type { Purchase } from '@/types/purchase';

const purchase = (id: string): Purchase => ({
  id,
  sellerName: `Vendor ${id}`,
  weight: 10,
  purity: '24K',
  acquiredAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-03-01T10:00:00.000Z',
});

const at = (iso: string) => iso;

describe('snapshots', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty when nothing has been written', () => {
    expect(readSnapshots()).toEqual([]);
    expect(readLatestSnapshot()).toBeNull();
    expect(readSnapshotMeta()).toEqual([]);
  });

  it('records the current ledger and reads it back intact', () => {
    captureSnapshot([purchase('a')], { now: at('2026-11-01T00:00:00.000Z') });

    const latest = readLatestSnapshot();
    expect(latest?.entryCount).toBe(1);
    expect(latest?.purchases[0]?.sellerName).toBe('Vendor a');
    expect(latest?.savedAt).toBe('2026-11-01T00:00:00.000Z');
  });

  it('skips a capture inside the minimum interval', () => {
    captureSnapshot([purchase('a')], { now: '2026-11-01T00:00:00.000Z' });

    const second = captureSnapshot([purchase('a'), purchase('b')], {
      now: new Date(Date.parse('2026-11-01T00:00:00.000Z') + SNAPSHOT_MIN_INTERVAL_MS - 1000).toISOString(),
    });

    expect(second).toHaveLength(1);
    expect(readLatestSnapshot()?.entryCount).toBe(1);
  });

  it('captures again once the interval has passed', () => {
    captureSnapshot([purchase('a')], { now: '2026-11-01T00:00:00.000Z' });
    captureSnapshot([purchase('a'), purchase('b')], {
      now: new Date(Date.parse('2026-11-01T00:00:00.000Z') + SNAPSHOT_MIN_INTERVAL_MS + 1000).toISOString(),
    });

    expect(readSnapshots()).toHaveLength(2);
    expect(readLatestSnapshot()?.entryCount).toBe(2);
  });

  it('never stores the same payload twice in a row', () => {
    const rows = [purchase('a')];
    captureSnapshot(rows, { now: '2026-11-01T00:00:00.000Z' });
    captureSnapshot(rows, {
      now: new Date(Date.parse('2026-11-01T00:00:00.000Z') + SNAPSHOT_MIN_INTERVAL_MS * 5).toISOString(),
    });

    expect(readSnapshots()).toHaveLength(1);
  });

  it('rotates the ring at the retention limit, newest first', () => {
    for (let i = 0; i < SNAPSHOT_RETENTION + 3; i += 1) {
      captureSnapshot([purchase(`p${i}`)], {
        now: new Date(Date.parse('2026-11-01T00:00:00.000Z') + i * SNAPSHOT_MIN_INTERVAL_MS * 2).toISOString(),
      });
    }

    const ring = readSnapshots();
    expect(ring).toHaveLength(SNAPSHOT_RETENTION);
    expect(ring[0]?.purchases[0]?.id).toBe(`p${SNAPSHOT_RETENTION + 2}`);
  });

  it('force bypasses both the interval and the duplicate check', () => {
    const rows = [purchase('a')];
    captureSnapshot(rows, { now: '2026-11-01T00:00:00.000Z' });
    captureSnapshot(rows, { now: '2026-11-01T00:05:00.000Z', force: true });

    expect(readSnapshots()).toHaveLength(2);
  });

  it('survives a corrupt snapshot payload instead of throwing', () => {
    localStorage.setItem(SNAPSHOTS_KEY, '{not json');
    expect(readSnapshots()).toEqual([]);
    expect(readLatestSnapshot()).toBeNull();
  });

  it('drops entries that are not shaped like a snapshot', () => {
    localStorage.setItem(
      SNAPSHOTS_KEY,
      JSON.stringify({
        version: 1,
        snapshots: [
          { id: 'ok', savedAt: '2026-11-01T00:00:00.000Z', entryCount: 1, purchases: [] },
          { id: 'no-purchases', savedAt: '2026-11-01T00:00:00.000Z', entryCount: 1 },
          { savedAt: '2026-11-01T00:00:00.000Z', entryCount: 0, purchases: [] },
          'garbage',
        ],
      }),
    );

    const ring = readSnapshots();
    expect(ring).toHaveLength(1);
    expect(ring[0]?.id).toBe('ok');
  });

  it('clears the ring on request', () => {
    captureSnapshot([purchase('a')], { now: '2026-11-01T00:00:00.000Z' });
    clearSnapshots();
    expect(readSnapshots()).toEqual([]);
  });

  it('does not fail the write when storage rejects it', () => {
    // A snapshot is disposable; losing one must never surface as a save error.
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };

    expect(() => captureSnapshot([purchase('a')], { now: '2026-11-01T00:00:00.000Z' })).not.toThrow();

    Storage.prototype.setItem = original;
  });
});
