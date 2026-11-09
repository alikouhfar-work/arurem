import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * File-naming convention check.
 *
 *   Components       → PascalCase.tsx   (LedgerHeader.tsx)
 *   Everything else  → camelCase.ts     (useLedger.ts, purchase.schema.ts)
 *   Test files       → mirror the module they cover (LedgerPage.test.tsx)
 *
 * A file counts as a component when it contains JSX and has a capitalised
 * function or const that it exports — either inline (`export function Foo`) or
 * via a trailing export list (`function Foo() {}` … `export { Foo }`), which is
 * how every shadcn primitive is written.
 *
 * A module that only exports helpers (toast.tsx) stays camelCase even though it
 * lives under ui/.
 *
 * Run directly (`bun scripts/checkFileNaming.ts`) or via the test suite.
 */

const ROOT = process.cwd();
const SRC = resolve(ROOT, 'src');
const IGNORED = new Set<string>(['vite-env.d.ts']);

type Violation = { file: string; reason: string };

const isPascal = (name: string) => /^[A-Z][A-Za-z0-9]*$/.test(name);
const isCamel = (name: string) => /^[a-z][A-Za-z0-9]*$/.test(name);

const toPascal = (stem: string) =>
  stem
    .split(/[-_.]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

/** `purchase.schema.ts` → `purchase`; `LedgerPage.test.tsx` → `LedgerPage` + isTest. */
const parseName = (file: string) => {
  const isTest = /\.(test|spec)\.(ts|tsx)$/.test(file);
  const clean = file.replace(/\.(test|spec)\.(ts|tsx)$/, '');
  const match = /^(.*?)\.(ts|tsx)$/.exec(clean);
  const stem = (match?.[1] ?? clean).replace(/\.(schema|types|utils|config)$/, '');
  const ext = (match?.[2] ?? '') as 'ts' | 'tsx' | '';
  return { stem, ext, isTest };
};

/** Declared components: `function Foo`, `const Foo =`, `class Foo`. */
const declaredComponents = (source: string): string[] => {
  const names = new Set<string>();
  for (const m of source.matchAll(
    /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Z]\w*)/gm,
  )) {
    names.add(m[1]!);
  }
  for (const m of source.matchAll(/^\s*(?:export\s+)?const\s+([A-Z]\w*)\s*[:=]/gm)) {
    names.add(m[1]!);
  }
  return [...names];
};

/** True when the file actually exports at least one of its declared components. */
const exportsComponent = (source: string): boolean => {
  const declaresJsx = /<[A-Za-z][^>]*>|<>|<\/[A-Za-z]/.test(source);
  if (!declaresJsx) return false;

  const declared = declaredComponents(source);
  if (declared.length === 0) return false;

  // Inline export, or a trailing `export { A, B }` list.
  const exportLists = [...source.matchAll(/export\s*\{([^}]*)\}/g)]
    .map((m) => m[1] ?? '')
    .join(',');

  return declared.some(
    (name) =>
      new RegExp(`export\\s+(?:default\\s+)?(?:async\\s+)?(?:function|const|class)\\s+${name}\\b`).test(
        source,
      ) || new RegExp(`\\b${name}\\b`).test(exportLists),
  );
};

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
};

const violations: Violation[] = [];

for (const full of walk(SRC)) {
  const rel = relative(ROOT, full);
  const file = rel.split('/').pop()!;
  if (IGNORED.has(file)) continue;

  const source = readFileSync(full, 'utf8');
  const { stem, ext, isTest } = parseName(file);
  const component = ext === 'tsx' && exportsComponent(source);

  if (isTest) {
    // Test files mirror the module under test. Accept either casing, but the
    // rest of the name must still be a single word-shaped token.
    if (!isPascal(stem) && !isCamel(stem)) {
      violations.push({
        file: rel,
        reason: `test file "${stem}" must be PascalCase or camelCase (no kebab/snake)`,
      });
    }
  } else if (component) {
    if (!isPascal(stem)) {
      violations.push({
        file: rel,
        reason: `exports a component but "${stem}" is not PascalCase → rename to ${toPascal(stem)}.tsx`,
      });
    }
  } else if (!isCamel(stem)) {
    violations.push({
      file: rel,
      reason: `exports no component, so "${stem}" must be camelCase`,
    });
  }

  if (ext === 'ts' && component) {
    violations.push({ file: rel, reason: 'a file containing JSX must use the .tsx extension' });
  }
}

if (violations.length > 0) {
  console.error(`\n✗ ${violations.length} file-naming violation(s):\n`);
  for (const v of violations) console.error(`  ${v.file}\n    ${v.reason}`);
  console.error('\nConvention: components → PascalCase.tsx, everything else → camelCase.ts\n');
  process.exit(1);
}

// eslint-disable-next-line no-console -- CLI script: its stdout is the report
console.log('✓ file naming: components PascalCase, modules camelCase');
