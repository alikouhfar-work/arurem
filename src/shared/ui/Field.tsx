import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import type {
  FieldContextValue,
  FieldControlProps,
  FieldErrorProps,
  FieldHintProps,
  FieldLabelProps,
  FieldProps,
} from '@/types/ui';

/**
 * Accessible field shell.
 *
 * The previous implementation used bare <label> elements with no `htmlFor`,
 * so no input in the app had an accessible name (axe flagged every one).
 * Everything here wires id + aria-describedby + aria-invalid together, and the
 * error slot is `role="alert"` so screen readers announce it on submit.
 */

const FieldContext = React.createContext<FieldContextValue | null>(null);

const useFieldContext = (component: string) => {
  const context = React.useContext(FieldContext);
  if (!context) {
    throw new Error(`<${component}> must be rendered inside <Field>.`);
  }
  return context;
};

export function Field({ children, className, disabled, invalid }: FieldProps) {
  const reactId = React.useId();
  const ctx = React.useMemo<FieldContextValue>(
    () => ({
      id: `field-${reactId}`,
      errorId: `field-${reactId}-error`,
      hintId: `field-${reactId}-hint`,
      hasError: Boolean(invalid),
      disabled,
    }),
    [reactId, invalid, disabled],
  );

  return (
    <FieldContext.Provider value={ctx}>
      <div className={cn('flex flex-col gap-2', className)}>{children}</div>
    </FieldContext.Provider>
  );
}

export function FieldLabel({ children, className, hint, required, ...props }: FieldLabelProps) {
  const { id, hasError } = useFieldContext('FieldLabel');
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label
        htmlFor={id}
        className={cn(
          'text-[13px] leading-tight font-medium tracking-wide',
          hasError ? 'text-destructive' : 'text-ink-700 dark:text-ink-200',
          className,
        )}
        {...props}
      >
        {children}
        {required ? (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-muted-foreground ml-1 text-xs font-normal">(optional)</span>
        )}
      </label>
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </div>
  );
}

export function FieldControl({ children }: FieldControlProps) {
  const { id, errorId, hintId, hasError } = useFieldContext('FieldControl');
  return (
    <div data-field-control className="contents">
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            'aria-describedby': hasError ? errorId : hintId,
            'aria-invalid': hasError || undefined,
          })
        : children}
    </div>
  );
}

export function FieldHint({ children, className }: FieldHintProps) {
  const { hintId } = useFieldContext('FieldHint');
  return (
    <p id={hintId} className={cn('text-muted-foreground text-xs leading-relaxed', className)}>
      {children}
    </p>
  );
}

export function FieldError({ children }: FieldErrorProps) {
  const { errorId, hasError } = useFieldContext('FieldError');
  if (!hasError || !children) return null;
  return (
    <p
      id={errorId}
      role="alert"
      className="text-destructive flex items-start gap-1.5 text-xs leading-relaxed"
    >
      {children}
    </p>
  );
}
