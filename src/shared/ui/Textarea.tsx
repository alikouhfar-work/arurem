import * as React from 'react';

import { cn } from '@/shared/lib/utils';

/**
 * Multi-line field. Shares the radius token with Input and Select — it is the
 * same kind of surface, just taller — and keeps 16px text on mobile so iOS does
 * not zoom the viewport on focus.
 */
const Textarea = ({ className, ...props }: React.ComponentProps<'textarea'>) => {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-border bg-input text-foreground placeholder:text-muted-foreground',
        'field-sizing-content flex min-h-16 w-full resize-none rounded-control border px-(--control-gutter) py-3',
        'text-base transition-[color,box-shadow,background-color,border-color] outline-none',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        'md:text-sm',
        'dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
};

export { Textarea };
