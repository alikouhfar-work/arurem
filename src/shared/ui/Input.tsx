import * as React from 'react';

import { cn } from '@/shared/lib/utils';

/**
 * Text field.
 *
 * Geometry comes from the control tokens in tokens.css, not from local classes:
 * height `--control-height`, radius `--control-radius`, horizontal padding
 * `--control-gutter`, border `--control-border-width`. The toolbar's search
 * field and its select triggers therefore cannot disagree about height again —
 * they previously rendered 44px and 36px side by side in one row.
 *
 * 16px text on mobile is not cosmetic: iOS zooms the whole viewport when a
 * focused input is under 16px, which shifts the layout under the user's finger.
 */
const Input = ({ className, type, ...props }: React.ComponentProps<'input'>) => {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'bg-input border-border text-foreground placeholder:text-muted-foreground',
        'h-(--control-height) w-full min-w-0 rounded-control border px-(--control-gutter) py-0',
        'text-base transition-[color,box-shadow,background-color,border-color] outline-none',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        'md:text-sm',
        'dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
};

export { Input };
