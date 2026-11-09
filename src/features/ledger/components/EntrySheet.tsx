import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/Sheet';
import { EntryForm } from './EntryForm';
import type { EntrySheetProps } from '@/types/components';

export function EntrySheet({ open, onOpenChange, purchase, onSubmit }: EntrySheetProps) {
  const isEdit = purchase !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="gap-1 px-4 pt-5 pb-4 sm:px-6">
          <SheetTitle className="text-xl font-semibold tracking-tight">
            {isEdit ? 'Edit entry' : 'New entry'}
          </SheetTitle>
          <SheetDescription className="text-[13px]">
            {isEdit
              ? 'Update the weight, purity, or memo for this holding.'
              : 'Record a purchase. Only the weight and purity affect your totals.'}
          </SheetDescription>
        </SheetHeader>

        {/* Keyed so switching records remounts the form with fresh defaults
            instead of leaking the previous record's dirty state. */}
        <EntryForm
          key={purchase?.id ?? 'new'}
          purchase={purchase}
          submitLabel={isEdit ? 'Save changes' : 'Add entry'}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
