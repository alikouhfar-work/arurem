import { useTheme } from '@/shared/hooks/useTheme';
import { cn } from '@/shared/lib/utils';
import { Moon, Sun } from 'lucide-react';
import type { ThemeToggleProps } from '@/types/ui';

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring',
        'inline-flex size-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
