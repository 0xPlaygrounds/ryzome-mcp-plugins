# Vendored padding-line-between-statements

Source: [ESLint Stylistic](https://github.com/eslint-stylistic/eslint-stylistic), commit `435c3ea0fd26a5fef9042c4b36b6e165fbbf8d08`.

Copied files:

- `packages/eslint-plugin/rules/padding-line-between-statements/padding-line-between-statements.ts`
- `packages/eslint-plugin/rules/padding-line-between-statements/types.d.ts` → `padding-line-options.d.ts`
- Root `LICENSE`, retained verbatim. Both OpenJS Foundation and ESLint Stylistic notices apply.

The rule is MIT-licensed. Keep `LICENSE` with every redistributed copy, including skill assets. No Stylistic, ESLint, TypeScript-ESLint, or additional parser runtime dependency is required.

## Adaptations inherited from anti-slop

- Replace upstream type aliases with Oxlint's ESTree, context, token/comment, and rule types. Upstream's token type includes comments; Oxlint exposes those separately.
- Replace `AST_NODE_TYPES` enum members with identical string literals.
- Guard indexed reads for consuming repositories with `noUncheckedIndexedAccess`. Impossible missing AST/configuration entries raise explicit invariant errors rather than introducing new non-null assertions.
- Replace the repository-specific `createRule` factory with `createPaddingLineRule(options)`. The anti-slop wrapper supplies typed options directly; it exposes no user configuration options.
- Implement the small required AST helper surface in `padding-line-ast.ts` using Oxlint's public source-code/token API. `isParenthesized` only needs the one-pair check used to exclude parenthesized directive strings, not the upstream general-purpose overloads.
- Retain the upstream statement matchers, scope tracking, comment-aware insertion/removal, selector support, and diagnostic text. Upstream naming and non-null assumptions remain localized here to keep future diffs reviewable; the file is not a model for new application code.

The opinionated policy lives outside this directory in `../../rules/require-readable-spacing.ts`. It adds spacing without collapsing existing blank lines. Short local bindings, consecutive imports, and adjacent overload signatures/implementation remain grouped. Spacing is syntactic, not an inference of business-logic boundaries.

## Updating and verification

Fetch an explicit upstream revision, compare the original rule and types against this revision, and port relevant fixes while retaining the adapters above. Update this record and preserve the license. Validate changes in the anti-slop repository before copying refreshed skill assets into this repository.

The pinned anti-slop revision contains focused [RuleTester tests](https://github.com/dmmulroy/anti-slop/blob/c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b/src/rules/require-readable-spacing.test.ts) and [native Oxlint CLI tests](https://github.com/dmmulroy/anti-slop/blob/c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b/src/rules/require-readable-spacing-cli.test.ts). Those tests belong to the upstream repository; they are not vendored here or run by this repository's CI. The complete ESLint Stylistic JS/TS test suites have not been ported into anti-slop.

In this repository, `pnpm lint:anti-slop` runs the vendored plugin against package and script sources. It reports existing policy violations and is not a regression test suite for the rule implementation.
