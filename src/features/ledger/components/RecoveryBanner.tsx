import { Button } from '@/shared/ui/Button';
import { formatDate } from '@/shared/lib/format';
import { AlertTriangle, X } from 'lucide-react';
import type { RecoveryBannerProps } from '@/types/components';

/**
 * Shown when the live ledger payload could not be read but a local snapshot
 * can be. Nothing is applied automatically — replacing a ledger is the user's
 * decision, and an older copy is not obviously better than a fresh empty one
 * unless they can see what it holds.
 */
export const RecoveryBanner = ({ snapshot, onRestore, onDismiss }: RecoveryBannerProps) => {
  const entries = `${snapshot.entryCount} ${snapshot.entryCount === 1 ? 'entry' : 'entries'}`;

  return (
    <section
      role="alert"
      aria-labelledby="recovery-heading"
      className="border-destructive/30 bg-destructive/5 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="text-destructive flex size-8 shrink-0 items-center justify-center">
          <AlertTriangle className="size-4" aria-hidden="true" />
        </span>

        <div>
          <h2 id="recovery-heading" className="text-destructive text-sm font-semibold">
            Your saved ledger could not be read
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            A local snapshot from {formatDate(snapshot.savedAt)} holds {entries}. Restoring it
            replaces what is on screen now.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:pl-3">
        <Button onClick={onRestore} variant="destructive" className="h-11 sm:h-9">
          Restore snapshot
        </Button>
        <Button
          variant="ghost"
          onClick={onDismiss}
          aria-label="Dismiss recovery prompt"
          className="text-muted-foreground size-11 shrink-0"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
};
