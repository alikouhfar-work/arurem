import { Button } from '@/shared/ui/Button';
import { Field, FieldControl, FieldError, FieldHint, FieldLabel } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/Sheet';
import { Textarea } from '@/shared/ui/Textarea';
import { Check, Loader2 } from 'lucide-react';
import { useWalletForm } from '../hooks/useWalletForm';
import { useState } from 'react';
import type { WalletFormProps, WalletSheetProps } from '@/types/components';
import type { WalletDraft } from '@/types/wallet';

const WalletForm = ({ wallet, wallets, submitLabel, onSubmit, onCancel }: WalletFormProps) => {
  const { form, submit, errors } = useWalletForm(wallet, wallets, onSubmit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    watch,
    setFocus,
    formState: { isDirty },
  } = form;

  const note = watch('note') ?? '';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    await submit(event);
    setIsSubmitting(false);
    const firstError = Object.keys(errors)[0];
    if (firstError) setFocus(firstError as keyof WalletDraft);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-region flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
        <Field invalid={Boolean(errors.name)}>
          <FieldLabel required>Name</FieldLabel>
          <FieldControl>
            <Input
              {...register('name')}
              autoComplete="off"
              placeholder="e.g. Home safe, Bank box, Parents' house"
              aria-required="true"
            />
          </FieldControl>
          {errors.name ? (
            <FieldError>{errors.name.message}</FieldError>
          ) : (
            <FieldHint>
              A place your gold is kept. Each entry can belong to one wallet.
            </FieldHint>
          )}
        </Field>

        <Field invalid={Boolean(errors.note)}>
          <FieldLabel hint={`${note.length}/500`}>Note</FieldLabel>
          <FieldControl>
            <Textarea
              {...register('note')}
              rows={3}
              placeholder="Access instructions, address, who else knows…"
              className="field-sizing-fixed resize-y"
            />
          </FieldControl>
          <FieldError>{errors.note?.message}</FieldError>
        </Field>
      </div>

      <div className="bg-card/95 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] supports-backdrop-filter:backdrop-blur sm:px-6 sm:pb-3">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} className="h-11 sm:h-10">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (wallet !== null && !isDirty)}
            className="h-11 gap-2 sm:h-10 sm:min-w-36"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            {wallet !== null && !isDirty ? 'No changes' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
};

export const WalletSheet = ({
  open,
  onOpenChange,
  wallet,
  wallets,
  onSubmit,
}: WalletSheetProps) => {
  const isEdit = wallet !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="gap-1 px-4 pt-5 pb-4 sm:px-6">
          <SheetTitle className="text-xl font-semibold tracking-tight">
            {isEdit ? 'Edit wallet' : 'New wallet'}
          </SheetTitle>
          <SheetDescription className="text-[13px]">
            {isEdit
              ? 'Rename the wallet or change its note. Entries assigned to it stay where they are.'
              : 'Name a place your gold is kept, then assign entries to it.'}
          </SheetDescription>
        </SheetHeader>

        <WalletForm
          key={wallet?.id ?? 'new'}
          wallet={wallet}
          wallets={wallets}
          submitLabel={isEdit ? 'Save changes' : 'Create wallet'}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
};
