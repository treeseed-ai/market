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
  runner, provider API, capacity lifecycle commands, fake SDK/context test harnesses,
  and report writers.

Run the lightweight checks with:

```bash
npm run test:agent-contracts
npm run test:agent-handlers
npm run test:agent-message-chains
npm run test:provider-runtime
npm -w packages/agent run test:capacity-provider-runtime
npm -w packages/agent run test:agent-tools
```

For runtime package closure, run:

```bash
npm -w packages/agent run build:dist
npm -w packages/agent run test:unit -- test/package/package-shape.test.ts
npm -w packages/agent run verify:local
```

The package-shape tests assert that provider runtime files are present in
`dist`, and that `.ts-run-*` source-mode temp files are absent from both `dist`
and `npm pack --plan`. `verify:local` installs the packed package into a
temporary project and validates the provider entrypoint, runtime paths, and
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
.treeseed/test-reports/message-chains.md
```

Dogfood commands additionally emit:

```text
.treeseed/test-reports/workday-dogfood.md
.treeseed/test-reports/governed-mutation-dogfood.md
```

## Agent Tool Tests

Agent tool tests prove that `tools.allowed` is the only execution-provider callable tool source, that `contentAccess` gates model-aware content actions, that missing runtime requirements omit tools, and that MCP calls validate input before dispatch. Normal verification is deterministic and does not require Docker or live Codex auth.

Model-aware content tool tests cover generic `treeseed.content.*` commands and generated presets such as `treeseed.questions.create`. They assert that SDK rendering owns frontmatter shape, provider catalogs omit tools outside `contentAccess`, TreeDX proxy descriptors do not leak credentials, and commit tools require explicit agent commit policy.

Opt-in live proof is available for local authenticated Codex environments:

```bash
TREESEED_AGENT_LIVE_CODEX=1 \
npm -w packages/agent run test:agent-tools:live
```

The live proof copies Codex auth into an isolated temporary `CODEX_HOME`, writes a sanitized config, runs direct Codex MCP tool calls, and writes evidence to `.treeseed/test-reports/agent-tools-live/latest.json`. It must not mutate the user's real Codex config. It also proves the installed Codex execution provider can surface configured MCP tools to `codex exec`; if that provider build does not expose the tools, the test fails with a missing-tool diagnostic instead of falling back to shell access.

Opt-in GitHub Copilot proof uses the Copilot SDK's native custom tools rather than a local MCP subprocess:

```bash
TREESEED_AGENT_LIVE_COPILOT=1 \
npm -w packages/agent run test:agent-tools:live-copilot
```

The Copilot live proof loads the local Treeseed launch environment, translates `TREESEED_GITHUB_COPILOT_TOKEN` to Copilot's provider-native auth variables at the tool boundary, creates a temporary repository, exposes TreeSeed tools as Copilot SDK custom tools, and writes evidence to `.treeseed/test-reports/agent-tools-live-copilot/latest.json`. If `TREESEED_GITHUB_COPILOT_TOKEN` is absent, the adapter can fall back to `TREESEED_GITHUB_TOKEN` for compatibility, but the preferred setup is an account-scoped GitHub fine-grained personal access token with the **Copilot Requests** permission stored as `TREESEED_GITHUB_COPILOT_TOKEN` with `npx trsd config`.
