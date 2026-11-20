import { formatDate } from '@/shared/lib/format';
import type { LedgerFooterProps } from '@/types/components';

/**
 * The footer makes three claims and every one is checkable by the user:
 * where the data is, whether the browser has agreed to keep it, and when it
 * last left the device. No "secure", no "audited", no "verified".
 */
export const LedgerFooter = ({
  version,
  entryCount,
  persistence,
  lastExportedAt,
  lastSnapshotAt,
}: LedgerFooterProps) => {
  const backup =
    lastExportedAt === null
      ? 'never backed up'
      : `last backup ${formatDate(lastExportedAt)}`;

  const protection =
    persistence === 'granted'
      ? 'eviction-protected'
      : persistence === 'denied'
        ? 'browser may clear it'
        : persistence === 'unsupported'
          ? 'eviction protection unavailable'
          : null;

  return (
    <footer className="border-border text-muted-foreground mt-4 flex flex-col gap-2 border-t py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <p>
          Stored on this device{entryCount > 0 ? ` · ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}` : ''}
        </p>
        <span aria-hidden="true" className="hidden sm:inline">
          ·
        </span>
        <p>{backup}</p>
        {protection ? (
          <>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <p>{protection}</p>
          </>
        ) : null}
        {lastSnapshotAt ? (
          <>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <p>snapshot {formatDate(lastSnapshotAt)}</p>
          </>
        ) : null}
      </div>

      <p className="font-mono text-[10px] tracking-wide uppercase">Arurem · v{version}</p>
    </footer>
  );
};
