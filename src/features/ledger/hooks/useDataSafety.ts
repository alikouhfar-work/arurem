import { captureSnapshot, getSnapshotStamp, subscribeSnapshots } from '../model/snapshots';
import { getExportNudge } from '../model/exportNudge';
import { loadSafetyMeta, persistSafetyMeta } from '../model/safetyMeta';
import {
  readPersistentStorage,
  requestPersistentStorage,
} from '@/shared/lib/storagePersistence';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Purchase } from '@/types/purchase';
import type { Wallet } from '@/types/wallet';
import type { SafetyMeta } from '@/types/persistence';
import type { PersistenceStatus, UseDataSafetyResult } from '@/types/persistence';

/**
 * Client-side data safety: the browser-local half of the loss problem.
 *
 * Three independent protections, each with its own failure mode:
 *
 *   persistence  asks the browser not to evict this origin under pressure.
 *   snapshots    keeps the last N ledger states beside the live one, so a bad
 *                write costs minutes rather than everything.
 *   nudge        reminds the user to export, because neither of the above
 *                survives clearing site data or losing the device.
 *
 * None of them touches the network, and none of them changes the ledger model —
 * this hook only observes `purchases`.
 */

export const useDataSafety = (
  purchases: readonly Purchase[],
  wallets: readonly Wallet[] = [],
): UseDataSafetyResult => {
  const [persistence, setPersistence] = useState<PersistenceStatus>('unknown');
  const [meta, setMeta] = useState<SafetyMeta>(loadSafetyMeta);
  const requested = useRef(false);

  // The ring lives in localStorage, so it is an external store: subscribe to it
  // rather than copying its stamp into state after every capture.
  const lastSnapshotAt = useSyncExternalStore(subscribeSnapshots, getSnapshotStamp);

  // Ask once, and only once the user actually has data worth protecting: an
  // empty ledger does not need a grant, and asking on first paint spends the
  // request before there is anything to lose.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const current = await readPersistentStorage();
      if (cancelled) return;

      if (current === 'granted' || current === 'unsupported') {
        setPersistence(current);
        return;
      }

      if (purchases.length === 0 || requested.current) {
        setPersistence(current);
        return;
      }

      requested.current = true;
      const granted = await requestPersistentStorage();
      if (!cancelled) setPersistence(granted);
    })();

    return () => {
      cancelled = true;
    };
  }, [purchases.length]);

  // Snapshot on every committed change. The model enforces the interval and
  // skips identical payloads, so this can run on each render of new data. An
  // empty ledger is never captured: an empty snapshot cannot rescue anything.
  useEffect(() => {
    if (purchases.length === 0) return;
    captureSnapshot(purchases, { wallets });
  }, [purchases, wallets]);

  const markExported = useCallback(() => {
    const next: SafetyMeta = { lastExportedAt: new Date().toISOString(), nudgeDismissedAt: null };
    setMeta(next);
    persistSafetyMeta(next);
  }, []);

  const dismissNudge = useCallback(() => {
    setMeta((current) => {
      const next: SafetyMeta = { ...current, nudgeDismissedAt: new Date().toISOString() };
      persistSafetyMeta(next);
      return next;
    });
  }, []);

  const nudge = getExportNudge(purchases.length, meta);

  return useMemo(
    () => ({
      persistence,
      lastSnapshotAt,
      lastExportedAt: meta.lastExportedAt,
      nudge,
      markExported,
      dismissNudge,
    }),
    [persistence, lastSnapshotAt, meta.lastExportedAt, nudge, markExported, dismissNudge],
  );
};
