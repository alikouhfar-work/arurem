import { toast } from 'react-hot-toast';
import { ToastCard } from './ToastCard';
import type { ToastOptions, ToastTone } from '@/types/ui';

/**
 * Toast contract: success auto-dismisses, errors stay until dismissed, and
 * anything carrying an undo action stays long enough to act on. Informational
 * toasts dismiss fastest to keep the stack short on mobile.
 */

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 4000,
  error: Number.POSITIVE_INFINITY,
  info: 3000,
};

const notify = (tone: ToastTone, title: string, options: ToastOptions = {}) =>
  toast.custom(
    (instance) => (
      <ToastCard
        tone={tone}
        title={title}
        description={options.description}
        action={options.action}
        dismiss={() => toast.dismiss(instance.id)}
      />
    ),
    { duration: options.duration ?? DEFAULT_DURATION[tone] },
  );

export const showSuccess = (title: string, options?: ToastOptions) =>
  notify('success', title, options);
export const showError = (title: string, options?: ToastOptions) => notify('error', title, options);
export const showInfo = (title: string, options?: ToastOptions) => notify('info', title, options);
