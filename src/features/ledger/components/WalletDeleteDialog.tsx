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
import type { WalletDeleteDialogProps } from '@/types/components';

/**
 * Destructive confirmation for a wallet.
 *
 * The wording is the product rule, stated plainly: the wallet goes, its entries
 * stay. Telling the user what *will not* happen is what stops them assuming a
 * cascade or skipping the action out of fear.
 */
export const WalletDeleteDialog = ({
  wallet,
  entryCount,
  onOpenChange,
  onConfirm,
}: WalletDeleteDialogProps) => {
  const entries = `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`;

  return (
    <AlertDialog open={wallet !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this wallet?</AlertDialogTitle>
          <AlertDialogDescription>
            {wallet ? (
              <>
                <span className="text-foreground font-semibold">{wallet.name}</span> holds {entries}.
                Deleting the wallet does not delete them — they stay in your ledger and become
                unassigned.
              </>
            ) : (
              'The wallet will be removed. Its entries stay in your ledger.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Keep wallet</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (wallet) onConfirm(wallet);
            }}
          >
            Delete wallet
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
