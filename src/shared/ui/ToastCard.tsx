import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ToastCardProps, ToastTone } from '@/types/ui';

const TONE = {
  success: { icon: CircleCheck, className: 'text-success bg-success/10' },
  error: { icon: TriangleAlert, className: 'text-destructive bg-destructive/10' },
  info: { icon: Info, className: 'text-ink-600 dark:text-ink-200 bg-ink-100 dark:bg-ink-800' },
} as const satisfies Record<ToastTone, unknown>;

export function ToastCard({ tone, title, description, action, dismiss }: ToastCardProps) {
  const { icon: Icon, className } = TONE[tone];

  return (
    <div
      className={cn(
        'bg-card text-card-foreground shadow-raised pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-3.5 pr-2.5',
        'animate-in slide-in-from-bottom-2 fade-in-0 duration-200',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
          className,
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-ink-900 dark:text-ink-50 text-sm leading-snug font-semibold">{title}</p>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
        ) : null}
        {action ? (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              dismiss();
            }}
            className="text-primary focus-visible:ring-ring mt-2 rounded text-xs font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring -m-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <X className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Dismiss notification</span>
      </button>
    </div>
  );
}
