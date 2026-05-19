# Transparent Agent Testing

TreeSeed agent tests treat Markdown agent specs as executable contracts. The
test ladder is:

```text
agent contract tests
agent test catalog
handler fixtures
message chains
manager/worker parity
API/UI supervision
dogfood runs
```

Ownership is split deliberately:

* Market owns tenant-readable specs in `src/content/agents` and
  `src/content/agent-tests`.
* `@treeseed/agent` owns executable runtime code, built-in handlers, manager,
  worker, Agent API, processing role commands, fake SDK/context test harnesses,
  and report writers.

Run the lightweight checks with:

```bash
npm run test:agent-contracts
npm run test:agent-handlers
npm run test:agent-message-chains
npm run test:manager-worker
npm run test:processing-parity-local
```

For runtime package closure, run:

```bash
npm -w packages/agent run build:dist
npm -w packages/agent run test:unit -- test/package/package-shape.test.ts
npm -w packages/agent run verify:local
```

The package-shape tests assert that processing bins and support modules are
present in `dist`, and that `.ts-run-*` source-mode temp files are absent from
both `dist` and `npm pack --dry-run`. `verify:local` installs the packed package
into a temporary project and runs `treeseed-processing healthcheck`,
`api --help`, `manager --dry-run --json`, `worker --dry-run --json`, and direct
imports for manager, worker, processing plan/doctor, runtime paths, and the
built-in handler registry.

## Markdown Catalog

Human-readable test specs live in `src/content/agent-tests`. Each spec names the
agent, kind, fixture directory, trigger, and expected high-level result. The
catalog is non-public content; it exists so reviewers can inspect what each
agent is expected to prove.

The catalog runner validates that each top-level enabled Market agent has a
Markdown-backed test spec and that referenced fixture directories exist. Missing
fixture paths fail clearly instead of silently skipping coverage.

## Reports

The agent test commands emit Markdown and raw JSON under:

```text
.treeseed/test-reports/agent-contracts.md
.treeseed/test-reports/agent-test-catalog.md
.treeseed/test-reports/handler-fixtures.md
.treeseed/test-reports/message-chains.md
.treeseed/test-reports/manager-worker.md
```

Dogfood commands additionally emit:

```text
.treeseed/test-reports/workday-dogfood.md
.treeseed/test-reports/governed-mutation-dogfood.md
```
