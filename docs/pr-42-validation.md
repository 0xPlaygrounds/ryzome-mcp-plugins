# PR #42 repair validation

The repair retains the shared core, existing client/layout modules, thin adapters,
Zod schemas, generated Hermes manifest, and Changesets release workflow.

## Changes and regression evidence

- Removed automatic replay of canvas edits and initial population. Regression
  tests simulate a committed append or create followed by response loss.
- Preserved parallel edge IDs/labels, including special local keys, through both
  ELK and legacy layout paths.
- Moved graph validation/layout before canvas creation. Case-insensitive ID
  collisions, including new documents versus existing references, fail without
  network writes. Existing document references remain shareable by multiple nodes.
- Removed unsafe content casts. Mutation converters now type-check against the
  generated union; nested canvas content is explicitly limited to empty arrays.
- Preserved structured results through Hermes's final Python adapter. Status and
  availability tests cover missing, API-key, bearer, and combined credentials.
  Hermes manifests use supported optional credential metadata; runtime checks
  select either credential. Full Hermes host installation was not exercised.
- Reported submitted operation count instead of an invented applied receipt;
  tested successful no-op responses. Unlabeled edges are advisory.
- Standardized new arguments/results, removed redundant generated-type overrides,
  updated docs, and added the required release changeset.

Unsafe replay, edge metadata loss, identity collisions, malformed content, and
Hermes boundary failures were reproduced before the corresponding fixes.
A fresh-context adversarial reviewer found the additional new-document/reference
collision; the fix and no-fetch regression were independently verified. No material
findings remained in that focused review.

## Local checks

Run with pnpm 10.31.0 and Node 26.9.0 (GitHub uses Node 24):

- `pnpm build`
- `pnpm lint:check`
- `pnpm typecheck`
- `pnpm test`: 231 TypeScript tests and 17 Python tests
- `pnpm test:integration`: packed OpenClaw stub integration passed; live smoke skipped
- `pnpm changeset status --since=origin/main`: layout patch; core/MCP/OpenClaw/Hermes minor.
  The existing peer-dependency policy also schedules a Claude plugin major because
  its MCP peer range changes. No release policy or versions were changed manually.
- Scoped Biome source formatting and `git diff --check`

Hermes's local HTTP test server requires localhost bind permission. Tests use dummy
credentials and stubs. No live Ryzome calls, deployment verification, or release was
performed. The generated runner is rebuilt by the existing monorepo build and stays
ignored here; the tracked tool manifest is regenerated. GitHub checks at the submitted
tip remain the authority for the Node 24 CI result.
