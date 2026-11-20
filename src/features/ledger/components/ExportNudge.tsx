import { Button } from '@/shared/ui/Button';
import { formatDate } from '@/shared/lib/format';
import { daysSince } from '../model/exportNudge';
import { HardDriveDownload, X } from 'lucide-react';
import type { ExportNudgeProps } from '@/types/components';

/**
 * The one backup prompt.
 *
 * It states a fact the user can verify (how many entries exist only in this
 * browser, when the last export was) and offers exactly one action. It is not
 * an advertising slot, it reappears at most once a month, and dismissal is
 * explicit rather than a timeout.
 */
export const ExportNudge = ({ nudge, onExport, onDismiss }: ExportNudgeProps) => {
  const entries = `${nudge.entryCount} ${nudge.entryCount === 1 ? 'entry' : 'entries'}`;

  return (
    <section
      aria-labelledby="export-nudge-heading"
      className="border-gold-300/50 bg-accent/60 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="bg-background text-gold-800 dark:text-gold-200 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <HardDriveDownload className="size-4" aria-hidden="true" />
        </span>

        <div>
          <h2
            id="export-nudge-heading"
            className="text-ink-900 dark:text-ink-50 text-sm font-semibold"
          >
            {nudge.reason === 'never-exported'
              ? `${entries} exist only in this browser`
              : 'Your last backup is getting old'}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {nudge.reason === 'never-exported'
              ? 'Clearing browser data would delete them. Download a backup file you control.'
              : `Last exported ${nudge.lastExportedAt ? formatDate(nudge.lastExportedAt) : 'never'} · ${daysSince(nudge.lastExportedAt ?? '')} days ago.`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:pl-3">
        <Button onClick={onExport} className="h-11 gap-1.5 sm:h-9">
          Download backup
        </Button>
        <Button
          variant="ghost"
          onClick={onDismiss}
          aria-label="Dismiss backup reminder"
          className="text-muted-foreground size-11 shrink-0"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
};
