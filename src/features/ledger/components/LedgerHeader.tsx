import { Button } from '@/shared/ui/Button';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { BrandMark } from '@/shared/components/AppShell';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover';
import { Download, MoreHorizontal, Plus, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import type { LedgerHeaderProps } from '@/types/components';

/**
 * Import lives in a menu, not beside export: it replaces the entire ledger, so
 * it should not sit one slip away from a harmless action with equal weight.
 */
export function LedgerHeader({ version, onExport, onImport, onCreate }: LedgerHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (file) onImport(file);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <BrandMark version={version} />

      <div className="flex items-center gap-1 sm:gap-1.5">
        <ThemeToggle />

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Data options">
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-64 p-1.5">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onExport();
              }}
              className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Download className="text-muted-foreground size-4" aria-hidden="true" />
              Export backup
              <span className="text-muted-foreground ml-auto font-mono text-[10px]">.json</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Upload className="text-muted-foreground size-4" aria-hidden="true" />
              Import backup
            </button>

            <p className="text-muted-foreground border-t px-2.5 pt-2 pb-1 text-[11px] leading-relaxed">
              Importing replaces every entry in this ledger.
            </p>
          </PopoverContent>
        </Popover>

        <Button onClick={onCreate} className="ml-1 h-11 gap-2 rounded-full px-4 sm:px-5">
          <Plus className="size-4.5" aria-hidden="true" />
          <span className="hidden sm:inline">New entry</span>
          <span className="sr-only sm:hidden">New entry</span>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </header>
  );
}
