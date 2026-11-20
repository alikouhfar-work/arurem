import { describe, expect, it } from 'vitest';
import { daysSince, getExportNudge } from './exportNudge';
import { BACKUP_INTERVAL_DAYS, FIRST_BACKUP_THRESHOLD } from '@/constants/safety';
import type { SafetyMeta } from '@/types/persistence';

const NOW = '2026-11-20T12:00:00.000Z';

const meta = (overrides: Partial<SafetyMeta> = {}): SafetyMeta => ({
  lastExportedAt: null,
  nudgeDismissedAt: null,
  ...overrides,
});

const daysAgo = (days: number): string =>
  new Date(Date.parse(NOW) - days * 24 * 60 * 60 * 1000).toISOString();

describe('getExportNudge', () => {
  it('never nudges an empty ledger, however stale the bookkeeping is', () => {
    expect(getExportNudge(0, meta(), NOW)).toBeNull();
    expect(getExportNudge(0, meta({ lastExportedAt: daysAgo(400) }), NOW)).toBeNull();
  });

  it('stays quiet below the first-backup threshold', () => {
    expect(getExportNudge(FIRST_BACKUP_THRESHOLD - 1, meta(), NOW)).toBeNull();
  });

  it('asks for the first backup once the threshold is reached', () => {
    const nudge = getExportNudge(FIRST_BACKUP_THRESHOLD, meta(), NOW);
    expect(nudge?.reason).toBe('never-exported');
    expect(nudge?.lastExportedAt).toBeNull();
    expect(nudge?.entryCount).toBe(FIRST_BACKUP_THRESHOLD);
  });

  it('stays quiet when the last export is recent', () => {
    expect(getExportNudge(20, meta({ lastExportedAt: daysAgo(1) }), NOW)).toBeNull();
  });

  it('asks again once the export interval has passed', () => {
    const nudge = getExportNudge(20, meta({ lastExportedAt: daysAgo(BACKUP_INTERVAL_DAYS) }), NOW);
    expect(nudge?.reason).toBe('overdue');
    expect(nudge?.lastExportedAt).toBe(daysAgo(BACKUP_INTERVAL_DAYS));
  });

  it('treats an unparseable export stamp as overdue rather than as silence', () => {
    const nudge = getExportNudge(20, meta({ lastExportedAt: 'not a date' }), NOW);
    expect(nudge?.reason).toBe('overdue');
  });

  it('honours a dismissal for one interval', () => {
    const dismissed = meta({ nudgeDismissedAt: daysAgo(2) });
    expect(getExportNudge(20, dismissed, NOW)).toBeNull();
  });

  it('resumes after a dismissal expires', () => {
    const dismissed = meta({ nudgeDismissedAt: daysAgo(BACKUP_INTERVAL_DAYS + 1) });
    expect(getExportNudge(20, dismissed, NOW)?.reason).toBe('never-exported');
  });

  it('does not rack up days when the stamp is in the future', () => {
    expect(daysSince('2027-01-01T00:00:00.000Z', NOW)).toBe(0);
  });
});

describe('daysSince', () => {
  it('counts whole days between two stamps', () => {
    expect(daysSince(daysAgo(3), NOW)).toBe(3);
  });
});
