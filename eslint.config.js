import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        // Injected by vite.config.ts `define`.
        __APP_VERSION__: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // shadcn primitives legitimately co-export variants alongside components.
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['buttonVariants', 'badgeVariants', 'navigationMenuTriggerStyle'] },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The type directory is where declarations belong, so the blanket ban
    // applies everywhere else.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/types/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSInterfaceDeclaration',
          message: 'Use a `type` alias instead of `interface`, declared in src/types/.',
        },
        {
          selector: 'TSEnumDeclaration',
          message: 'Use a const object plus a derived union type, declared in src/types/.',
        },
        {
          selector: ':matches(ExportNamedDeclaration, Program) > TSTypeAliasDeclaration',
          message: 'Declare types in src/types/ and import them here.',
        },
      ],
    },
  },
  {
    // Feature boundaries: a feature may depend on `shared` and on its own
    // internals, never on another feature's internals. Enforced at lint time so
    // the module graph cannot decay back into a flat pile.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*'],
              message: 'Features must not import from the app shell. Compose in src/app instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/app/*'],
              message:
                'shared/ is the bottom of the graph — it may not import features or the app shell.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
]);
