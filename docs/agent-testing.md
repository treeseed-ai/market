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

## Canonical guarantee proofs

`trsd guarantees catalog-status --catalog agent.system --json` is the readiness
surface for agent development. Each entry exposes its required CLI commands,
named semantic predicates, minimum repository postconditions, missing run
variants, and exact candidate invocation. Dynamic context owns its complete
proof internally. Every later capability requires an explicit workspace-relative
`treeseed.agent-guarantee-proof/v1` JSON input so no verifier resolves an
ambient latest workday, assignment, artifact, or Git ref.

A proof input lists only `trsd` argument arrays. The harness executes them
without a shell, appends `--json`, redacts credentials, and stores each command
and authoritative response separately. Commands are classified as `read`,
`operator-mutation`, `simulated-human-mutation`, or `recovery`. Operator
mutations require `--execute` and `--idempotency-key`. Simulated-human mutations
also require `--simulate-human`, exact `--workday`, evidence `--reason`, and
`--yes` for binding governance. Recovery commands are restricted to an explicit
application restart during the `interruption-resume` variant. Save, stage, and
release commands are not admitted.

The simulated-human `--workday` is evidence provenance, not implicit
communication containment. Tests pass `--parent-workday` or
`--parent-assignment` separately when a conversation is intentionally
contained. Omitting both must create a standalone hidden conversation and must
never resolve an ambient or evidence workday as its parent.

Before the first mutating proof command, run `trsd guarantees preflight --json`
and require `ok: true`. This single read-only gate checks the managed API and
operations-runner source closures, API health, provider-manager and TreeDX
reconciliation, Codex authentication, project/provider bindings, disk reserve,
and remote read access. Its JSON evidence is deliberately redacted and never
includes managed-process environment variables. A fresh API communication
readiness projection is not sufficient by itself: stale processes, images, or
provider manifests block ingress rather than producing invalid evidence.

Each outcome maps its authoritative entity identities and required named
predicates to exact paths in command responses. Supported predicate operations
are `exists`, `equals`, `not-equals`, `includes`, `matches`,
`length-at-least`, and `distinct`. Repository-writing capabilities must also
map exact base, effective, target, changed-path, and read-back fields. Cleanup
must map every residue counter and prove all are zero. Missing predicates,
commands, identities, repository proof, evidence files, or cleanup fail before
activation evidence is credited.

Generate and validate the exact skeleton before spending provider capacity:

```bash
npx trsd guarantees proof-template \
  --id guarantee.agent.architecture.enforce-activity-profile-tool-scope.303 \
  --variant baseline \
  --output .treeseed/guarantees/inputs/profile-selection-baseline.json \
  --json

npx trsd guarantees proof-validate \
  --id guarantee.agent.architecture.enforce-activity-profile-tool-scope.303 \
  --variant baseline \
  --proof-input .treeseed/guarantees/inputs/profile-selection-baseline.json \
  --json
```

The generated file deliberately contains unresolved paths and scope arguments.
`proof-validate` remains red until the operator replaces every placeholder with
the exact workday, assignment, artifact, repository, and cleanup read-back path.

For live campaigns, prefer authoritative capture over manual replacement:

```bash
npx trsd guarantees proof-capture \
  --market local --team treeseed \
  --id <guarantee-id> --variant baseline \
  --input <proof-recipe.json> --output <proof.json> \
  --assignment <exact-assignment-id> --agent-test <immutable-test-id> --json
```

Capture fails until the assignment is completed, its exact TreeDX artifacts
pass the frozen semantic test, integrated receipts pass authoritative read-back,
and cleanup reports zero residue. Query payloads and artifact bodies are read
live for verification and are not persisted in campaign evidence.

## Fast pinned campaign loop

Run `trsd guarantees preflight` once per generation to pin the exact provider
sessions, source-closure digests, image identities, and rendered configuration.
Every later variant re-observes that pin and blocks on drift; it does not rebuild
or restart a provider inside an activation streak.

Use `trsd guarantees watch --team <team> --workday <exact-run-id> --generation
<digest>` for a coordinated workday, or omit `--team` only for an exact
capacity-envelope id. The watcher emits transitions only and returns at
semantic review/integration, failure repair, or proof collection. Artifact-
producing providers call the API semantic completion preflight immediately after
checkpoint creation and before cleanup, signals, usage, settlement, or completion.

Agent Lab runs freeze `admissionPolicy: single-scenario`. After exact semantic
verification and governed integration, `trsd capacity workday-close-admission`
closes new demand and forces an authoritative terminal reread rather than waiting
for the nominal workday duration.

Use `trsd guarantees campaign-run --file <manifest> --execute` to execute
baseline, clean-repeat, and interruption-resume in order. A valid manifest must
include compact watch, exact artifact verification, the admission fence,
authoritative proof capture, and replayable cleanup in every variant; the
interruption variant must include managed provider down/up operations. Captured
JSON fields may be referenced by later argument-array commands. Re-run cleanup
with `trsd guarantees campaign-cleanup --campaign <id> --execute`.

Run one prepared proof with:

```bash
npx trsd guarantees run \
  --id guarantee.agent.architecture.enforce-activity-profile-tool-scope.303 \
  --prove-planned \
  --variant baseline \
  --proof-input .treeseed/guarantees/inputs/profile-selection-baseline.json \
  --no-dependencies \
  --json
```

Use `--no-dependencies` only while proving one dependency-ordered catalog
capability. Normal catalog runs retain dependency expansion. A clean-repeat or
interruption run must use the same code/configuration generation; changing the
proof executor, agent definitions, query definitions, permissions, workflows,
or verifier contracts resets the streak.

Outcomes may be variant-scoped. Source rejection/revision is required only in
the interruption variant. Guide activation maps baseline to the first ephemeral
project, clean-repeat to the canonical Guide integration, and
interruption-resume to a second ephemeral project. Catalog activation also
checks that the two ephemeral project identities are present and distinct; one
reused disposable project cannot satisfy both runs.

## Agent Tool Tests

Agent tool tests prove that `tools.allowed` is the only execution-provider callable tool source, that frozen per-model permissions gate content actions, that missing runtime requirements omit tools, and that MCP calls validate input before dispatch. Normal verification is deterministic and does not require Docker or live Codex auth.

Model-aware content tool tests cover generic `treeseed.content.*` commands and generated presets such as `treeseed.questions.create`. They assert that SDK rendering owns frontmatter shape, provider catalogs omit tools outside the frozen model-operation permission matrix, TreeDX proxy descriptors do not leak credentials, and commit tools require explicit agent commit policy.

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
