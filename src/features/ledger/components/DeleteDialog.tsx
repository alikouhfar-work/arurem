import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';
import { formatGrams } from '@/shared/lib/format';
import type { DeleteDialogProps } from '@/types/components';

/**
 * Destructive confirmation. Names the record and its weight so the user can
 * verify they picked the right row, and the destructive action is not the
 * default focus (Radix focuses Cancel).
 */
export function DeleteDialog({ purchase, onOpenChange, onConfirm }: DeleteDialogProps) {
  return (
    <AlertDialog open={purchase !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            {purchase ? (
              <>
                <span className="text-foreground font-semibold">{purchase.sellerName}</span> —{' '}
                {formatGrams(purchase.weight)} g at {purchase.purity}. This removes it from your
                totals and cannot be undone, but you will get a chance to undo it right after.
              </>
            ) : (
              'This entry will be removed from your ledger.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Keep entry</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (purchase) onConfirm(purchase);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
