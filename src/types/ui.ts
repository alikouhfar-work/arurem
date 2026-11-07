/** Shared UI primitive contracts. */

export type FieldContextValue = {
  id: string;
  errorId: string;
  hintId: string;
  hasError: boolean;
  disabled?: boolean;
};

export type FieldProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** Set by the input so the label renders the error affordance. */
  invalid?: boolean;
};

export type FieldControlProps = {
  children: React.ReactNode;
};

export type FieldHintProps = {
  children: React.ReactNode;
  className?: string;
};

export type FieldErrorProps = {
  children?: React.ReactNode;
};

export type FieldLabelProps = React.ComponentProps<'label'> & {
  /** Right-aligned metadata (unit, character count, "optional"). */
  hint?: React.ReactNode;
  required?: boolean;
};

export type ToastTone = 'success' | 'error' | 'info';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastOptions = {
  description?: string;
  action?: ToastAction;
  duration?: number;
};

export type ToastCardProps = {
  tone: ToastTone;
  title: string;
  description?: string;
  action?: ToastAction;
  dismiss: () => void;
};

export type ThemeToggleProps = {
  className?: string;
};

export type Theme = 'light' | 'dark' | 'system';

export type ResolvedTheme = 'light' | 'dark';
