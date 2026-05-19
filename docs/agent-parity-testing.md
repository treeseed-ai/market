# TreeSeed Processing Agent Engine Parity and Transparent Agent Testing Implementation Plan

## Purpose

This plan implements two related capabilities for TreeSeed Market and the TreeSeed packages:

1. **Local / remote processing engine parity** through a shared containerized processing plane for the API, manager, workers, and workday utility roles.
2. **Transparent agent testing** for Markdown-defined agents, including isolated handler tests, message-chain tests, manager/worker tests, UI/API supervision tests, and full workday dogfood runs.

The goal is to make local, staging, and production behave the same for workday automation while giving contributors a readable way to understand, validate, and review what each agent is expected to do.

## Current Working Assumptions

TreeSeed currently has most of the architectural pieces needed:

* `packages/agent` owns the agent runtime, handlers, manager, worker, processing API routes, services, and runtime tests.
* `packages/sdk` owns shared contracts, task/message/workday stores, operations, graph/context contracts, and dispatch primitives.
* `packages/core` owns content rendering and public Knowledge Hub behavior.
* Top-level `market` owns the integrated product app, operational UI, governance views, seeds, and top-level agent Markdown definitions.
* Top-level agents are content-backed Markdown/MDX records under `src/content/agents`.
* The manager and worker already seed and execute workday tasks, including deterministic system work such as graph refresh and codebase documentation scanning.
* Railway is the intended remote processing host for API/manager/worker-style services, while Cloudflare remains the web/data/queue/provider plane in the current architecture.

The remaining problem is not a lack of pieces. The problem is that local, staging, and production need a stricter parity contract, and agent behavior needs a transparent test system that treats the Markdown specs as executable contracts.

## Target Outcomes

By the end of this work:

* Local parity mode runs the same processing image and role commands used by staging and production.
* Railway staging and production deploy the same processing image with environment-specific configuration only.
* API, manager, worker, workday-start, and workday-report roles are started through explicit role commands from one processing image.
* Build-time and runtime are separated. Runtime services do not run `npm run build:*` before starting.
* Manager lifecycle is consistent across local, staging, and production.
* Worker filesystem layout is consistent across local and remote, using `/data/repositories/...` for repository and worktree state.
* Agent Markdown files are validated as runtime contracts.
* Each handler can be tested in isolation with readable fixtures.
* Multi-agent message chains can be tested without the UI.
* Manager/worker behavior can be tested using the same task/message contracts used in real workdays.
* E2E dogfood tests exercise the docs automation chain and governed mutation path.
* Test results are emitted as Markdown reports that humans can read in the repo or the app.

## Non-goals

* Replacing TreeSeed’s existing agent runtime with a generic agent framework.
* Moving the public web surface off its current deployment model as part of this work.
* Solving all capacity-provider pricing and billing behavior.
* Making production release fully automated. Production release should remain approval-gated.
* Allowing local fast-dev behavior to define production behavior.

## Core Design Principles

1. **Same contracts everywhere.** Local, staging, and production should use the same workday, task, message, artifact, approval, and report contracts.
2. **Same processing image everywhere.** The default parity path should run the same built artifact locally and remotely.
3. **Different environments, not different systems.** Environment-specific differences should be declarative and diffable.
4. **Markdown is the source of agent truth.** Agent specs should be readable by humans and executable by tests.
5. **Handlers are deterministic at the boundary.** External execution providers may vary, but handler inputs, outputs, and permissions should be testable.
6. **Governance is part of correctness.** A workday is not correct just because an agent ran; it is correct when artifacts, approvals, verification, and reports are coherent.
7. **No silent fallbacks.** Stub providers, skipped verification, dry-run mutation, and local-only behavior must be visible in the runtime plan and test output.

---

# Part 1: Processing Agent Engine Parity Through Containerization

## 1.1 Target Processing Plane Architecture

Build one shared processing image from the top-level Market repo.

The image should contain:

* top-level Market API build artifacts needed by the processing API;
* `packages/agent` built distribution;
* `packages/sdk` built distribution;
* any required runtime package outputs from `packages/core` or `packages/cli`;
* migrations and seed assets needed for runtime validation;
* processing role entrypoints;
* healthcheck/diagnostic commands;
* verification utilities needed by the worker.

The same image should be runnable as multiple roles:

```text
api
manager
worker
workday-start
workday-report
migrate
seed
healthcheck
parity-plan
```

Recommended runtime command shape:

```bash
treeseed-processing api
treeseed-processing manager
treeseed-processing worker
treeseed-processing workday-start
treeseed-processing workday-report
treeseed-processing migrate
treeseed-processing seed
treeseed-processing healthcheck
```

Implementation may delegate these commands to existing package binaries such as `treeseed-agent-api` and `treeseed-agent-service`, but the public deployment surface should be one role-oriented command family.

## 1.2 Manager Lifecycle Decision

### Decision

Use a **bounded reconciliation manager** as the parity target.

The manager should execute one reconciliation cycle and then exit successfully, unless explicitly run in a development-only loop mode.

### Why

This works cleanly with Railway scheduled jobs and keeps behavior consistent with remote deployment constraints. It also avoids a class of bugs where a local always-on manager behaves differently from a remote cron/scheduled manager.

### Required behavior

The manager role should:

1. acquire or renew the manager lease;
2. load project/environment work policy;
3. start or resume active workday when policy allows;
4. seed idempotent startup/planning tasks;
5. materialize eligible agent trigger tasks;
6. evaluate worker capacity and scale decisions;
7. publish workday summary state;
8. close out completed/expired workdays when appropriate;
9. write a manager run summary;
10. exit with a clear code.

### Allowed modes

```text
parity/default:
  manager runs one bounded reconciliation cycle and exits.

fast dev only:
  manager may loop for watch-style development, but the runtime plan must identify this as non-parity mode.
```

## 1.3 Worker Lifecycle Decision

Workers should support a long-running loop and a bounded drain mode.

Recommended parity target:

```text
local parity:
  worker runs the same command as Railway worker, using /data volume.

staging/prod:
  worker service can be always-on, scaled down, or externally managed, but the worker command and task semantics remain identical.
```

Worker behavior must not change by environment except for declared provider adapters, queue bindings, capacity budgets, and credentials.

## 1.4 Filesystem Parity

Workers should use the same filesystem layout everywhere:

```text
/data/repositories/<repository-id>/bare.git
/data/repositories/<repository-id>/worktrees/<task-id>
/data/runners/<runner-id>
/data/tmp
```

Local Docker Compose should mount:

```yaml
volumes:
  - .treeseed/local-processing/data:/data
```

Railway worker services should mount their persistent volume at:

```text
/data
```

Any code that currently infers local-only paths should be migrated behind a runtime path resolver that defaults to `/data` in parity mode.

## 1.5 Environment Parity Contract

Introduce a processing plan command:

```bash
treeseed-processing parity-plan --environment local --json
treeseed-processing parity-plan --environment staging --json
treeseed-processing parity-plan --environment prod --json
```

The plan should include:

* processing image tag or git SHA;
* role commands;
* manager lifecycle mode;
* worker lifecycle mode;
* queue provider;
* database provider;
* artifact provider;
* repository storage root;
* enabled agent specs;
* handler registry summary;
* provider registry summary;
* work policy summary;
* capacity provider/grant summary;
* verification policy;
* mutation policy;
* approval policy;
* known local-only or stub behaviors.

Add a parity diff command:

```bash
treeseed-processing parity-diff --from local --to staging
treeseed-processing parity-diff --from staging --to prod
```

Allowed differences:

* base URLs;
* environment names;
* Railway project/service ids;
* Cloudflare account/database/queue/bucket ids;
* secrets and credentials;
* capacity budgets;
* replica counts;
* stricter production approval policy;
* production-only observability sinks.

Disallowed differences:

* role command shape;
* handler registry;
* agent spec normalization;
* task/message schema versions;
* workday state machine;
* mutation path safety policy;
* verification gates;
* artifact contract shape;
* manager lifecycle mode, unless explicitly marked non-parity;
* worker filesystem root;
* stub provider usage in staging/prod.

## 1.6 Container Build Implementation

### Add or update Dockerfile

Create a production processing Dockerfile, for example:

```text
Dockerfile.processing
```

Requirements:

* use Node 22;
* install dependencies reproducibly;
* build top-level Market API assets required by processing;
* build `packages/sdk`;
* build `packages/agent`;
* copy only runtime-required files into final image;
* run as non-root if practical;
* expose API port through env-driven `PORT`;
* include healthcheck command;
* avoid running package prepare scripts unexpectedly at runtime.

Suggested high-level structure:

```Dockerfile
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/sdk/package*.json packages/sdk/
COPY packages/agent/package*.json packages/agent/
COPY packages/core/package*.json packages/core/
COPY packages/cli/package*.json packages/cli/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build:api
RUN npm -w packages/sdk run build
RUN npm -w packages/agent run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=build /app/packages/agent/dist ./packages/agent/dist
COPY --from=build /app/packages/agent/package.json ./packages/agent/package.json
COPY --from=build /app/packages/sdk/package.json ./packages/sdk/package.json
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/seeds ./seeds
COPY --from=build /app/treeseed.site.yaml ./treeseed.site.yaml
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/bin/treeseed-processing ./bin/treeseed-processing
RUN mkdir -p /data
ENTRYPOINT ["/app/bin/treeseed-processing"]
CMD ["api"]
```

The exact copy list should be verified after inspecting built artifacts. Do not over-copy `.git`, local secrets, `.treeseed/worktrees`, or `.treeseed/exports`.

### Add processing entrypoint

Add:

```text
bin/treeseed-processing
```

or a package script exported from `packages/agent`.

The entrypoint should dispatch roles:

```text
api            -> start processing API
manager        -> run bounded manager reconciliation
worker         -> run worker runner
workday-start  -> run workday start helper
workday-report -> run workday closeout/report helper
migrate        -> run migrations against configured store
seed           -> apply configured seeds
healthcheck    -> validate role-specific readiness
parity-plan    -> print processing plan
parity-diff    -> compare plans
```

## 1.7 Docker Compose Parity Mode

Add:

```text
docker-compose.processing.yml
```

Services:

```yaml
services:
  api:
    image: treeseed-processing:local
    build:
      context: .
      dockerfile: Dockerfile.processing
    command: ["api"]
    env_file:
      - .env.local.processing
    ports:
      - "8788:8788"
    volumes:
      - ./.treeseed/local-processing/data:/data

  manager:
    image: treeseed-processing:local
    command: ["manager"]
    env_file:
      - .env.local.processing
    volumes:
      - ./.treeseed/local-processing/data:/data
    depends_on:
      - api

  worker:
    image: treeseed-processing:local
    command: ["worker"]
    env_file:
      - .env.local.processing
    volumes:
      - ./.treeseed/local-processing/data:/data
    depends_on:
      - api
```

Add helper commands:

```bash
npm run processing:build
npm run processing:up
npm run processing:down
npm run processing:logs
npm run processing:parity-plan
npm run processing:test-local
```

## 1.8 Railway Deployment Shape

Each Railway service should use the same Dockerfile/image.

Services:

```text
api:
  command: api
  persistent: yes

manager:
  command: manager
  schedule: configured cron or Railway scheduled service
  bounded: yes

worker-runner:
  command: worker
  persistent or scale-managed
  volume: /data

workday-start:
  command: workday-start
  schedule: optional, if not folded into manager

workday-report:
  command: workday-report
  schedule: optional, if not folded into manager
```

Update `treeseed.site.yaml` and any Railway projection code so service definitions refer to role commands, not build commands.

Bad:

```bash
npm run build:api && node ./packages/agent/dist/services/worker.js
```

Good:

```bash
treeseed-processing worker
```

or, if Railway invokes the Docker entrypoint:

```bash
worker
```

## 1.9 Processing Runtime Configuration

Normalize required environment variables across all environments.

Categories:

* identity:

  * `TREESEED_PROJECT_ID`
  * `TREESEED_TEAM_ID`
  * `TREESEED_ENVIRONMENT`
  * `TREESEED_PROCESSING_ROLE`
* stores:

  * D1 / local sqlite / HTTP D1 binding config
  * queue provider config
  * artifact store config
* worker storage:

  * `TREESEED_DATA_DIR=/data`
  * repository storage root
  * worktree root
* manager:

  * manager id
  * lease ttl
  * reconciliation mode
  * workday schedule policy
* worker:

  * runner id
  * max local workers
  * lease ttl
  * task concurrency
* execution providers:

  * Codex/manual/stub/provider settings
  * approval policy
  * sandbox mode
* verification:

  * verification command
  * timeout
  * required checks
* observability:

  * log level
  * JSON logs on/off
  * trace/report sinks

Add a runtime validation command:

```bash
treeseed-processing doctor --role worker --environment local
```

The doctor should fail if staging/prod uses stub providers unless explicitly permitted.

## 1.10 Seed/Reconcile Parity

Make local, staging, and production seeds use the same manifest shape.

Required seed resources:

* team;
* project;
* project connection;
* work policy;
* capacity provider;
* capacity lanes;
* capacity grants;
* repository host;
* hub repositories;
* project hosting/environment records;
* agent pool or worker runner metadata;
* any required governance policy defaults.

Commands:

```bash
treeseed-processing seed --environment local --plan
treeseed-processing seed --environment local --apply
treeseed-processing seed --environment staging --plan
treeseed-processing seed --environment staging --apply
treeseed-processing seed --environment prod --plan
```

Production apply should remain approval-gated.

## 1.11 Processing Observability

Every role should log structured events with:

* `environment`;
* `projectId`;
* `role`;
* `runId`;
* `workDayId` when applicable;
* `taskId` when applicable;
* `agentSlug` when applicable;
* `messageId` when applicable;
* `eventType`;
* `durationMs`;
* `status`;
* `errorCode` when applicable.

Add Markdown report output for parity runs:

```text
.treeseed/test-reports/processing-parity-local.md
.treeseed/test-reports/processing-parity-staging.md
.treeseed/test-reports/processing-parity-diff.md
```

## 1.12 Acceptance Criteria for Processing Parity

Processing parity is complete when:

* local parity mode builds and runs the processing image;
* Railway staging deploys the same image shape;
* API, manager, and worker roles start through role commands only;
* manager lifecycle is identical between local parity and staging;
* worker data path is `/data` in local parity and Railway;
* parity plan diff allows only declared environment differences;
* local and staging execute the same synthetic workday task/message sequence;
* no staging/prod role uses stub providers silently;
* CI publishes processing parity reports;
* documentation explains fast-dev mode vs parity mode.

---

# Part 2: Transparent Agent Testing Strategy

## 2.1 Test Ladder Overview

Use a layered test ladder:

```text
Markdown spec contract tests
  -> handler fixture tests
  -> message-chain integration tests
  -> manager/worker service tests
  -> API/UI supervision tests
  -> full workday dogfood tests
```

Each layer should emit a human-readable Markdown report.

## 2.2 Markdown Agent Spec Contract Tests

### Goal

Treat every agent Markdown file as an executable contract.

### Test source

```text
src/content/agents/*.mdx
packages/*/.fixtures/**/src/content/agents/*.mdx
```

### Validations

For every enabled agent spec:

* frontmatter parses;
* `slug` is present and unique;
* `handler` resolves to a registered handler;
* `enabled` is explicit or normalized;
* `triggers` are valid;
* message triggers reference known message types;
* output message types are known;
* message-triggered agents have `message:pick` and `message:update` permissions;
* agents that emit messages have `message:create` permission;
* write-capable agents declare execution sandbox settings;
* write-capable agents declare allowed and forbidden paths;
* docs automation agents do not have broad write paths;
* context queries are valid and budgeted;
* execution provider is valid;
* governance requirements are declared for mutation/release agents;
* declared outputs align with handler test expectations.

### Report

Generate:

```text
.treeseed/test-reports/agent-contracts.md
```

Example report section:

```markdown
## treeseed-knowledge-generator

Source: src/content/agents/treeseed-knowledge-generator.mdx
Handler: knowledge_generator
Enabled: true
Triggers:
  - research_note_created
Declared outputs:
  - knowledge_draft_created
Permissions:
  - message:create
  - artifact:read
Context queries:
  - docs-generation-context
Execution:
  provider: codex
  sandbox: read_only or workspace_write as declared
Status: PASS
Warnings:
  - none
```

## 2.3 Content-Backed Agent Test Specs

Add a new content collection:

```text
src/content/agent-tests/
```

Each test spec should be Markdown/MDX and should describe a test in human terms while pointing to executable fixtures.

Example:

```mdx
---
id: agent-test:knowledge-generator-basic
agent: treeseed-knowledge-generator
kind: handler
fixture: packages/agent/test/fixtures/agent-tests/knowledge-generator/basic
trigger:
  messageType: research_note_created
expect:
  status: completed
  messages:
    - knowledge_draft_created
  artifacts:
    - knowledge_draft
  requiresSourceMap: true
---

This test proves that a source-mapped research note becomes a draft knowledge artifact
without promoting canonical content.
```

Supported `kind` values:

```text
spec
handler
message_chain
manager_worker
workday
api
ui
```

## 2.4 Handler Isolation Tests

### Goal

Test each handler without the manager, worker, queue, external Codex provider, or UI.

### Fixture layout

```text
packages/agent/test/fixtures/agent-tests/
  knowledge-generator/
    basic/
      agent.mdx
      trigger-message.json
      sdk-state.json
      context-packs.json
      expected-result.json
      expected-messages.json
      expected-events.json
      expected-artifacts.json
```

### Test harness behavior

The harness should:

1. load the fixture agent spec;
2. normalize it through the same spec loader/normalizer used by runtime;
3. create a fake scoped SDK;
4. create a fake `AgentContext`;
5. call `resolveInputs`;
6. call `execute`;
7. call `emitOutputs`;
8. capture SDK calls, task events, messages, artifacts, and metadata;
9. compare captured outputs with expectations;
10. generate a Markdown result report.

### Required handler cases

#### Planner

* startup/root planning input creates waiting/planning metadata;
* `knowledge_gap_detected` message produces research/planning intent;
* malformed gap message yields typed waiting/failure result.

#### Codebase Cartographer

* `documentation_gap_detected` creates source-mapped research note;
* `research_task_requested` creates source map and research metadata;
* missing source context yields waiting result.

#### Knowledge Generator

* `research_note_created` creates draft artifact and `knowledge_draft_created` message;
* missing source map produces waiting or failure;
* draft includes target book/path/confidence/source ids.

#### Knowledge Optimizer

* valid draft produces optimization report and `knowledge_optimization_completed`;
* low score produces revision recommendation;
* missing grounding produces reject/defer behavior.

#### Documentation Reviewer

* valid optimized draft produces review pass or human approval recommendation;
* unsupported claim produces `review_failed` or `revision_requested`;
* changed path outside allowed scope fails.

#### Governance Steward

* promotion request creates approval request;
* policy violation creates visible governance item;
* agent cannot approve its own request.

#### Docs Engineer

* approved mutation applies only allowed paths;
* forbidden path mutation fails;
* verification failure produces failure snapshot and repair task;
* successful mutation emits docs mutation completion metadata.

#### Workday Reporter

* task/approval/mutation events produce workday report;
* report includes incomplete/failure sections;
* no canonical knowledge mutation occurs.

#### Releaser

* docs mutation completion creates release readiness summary;
* missing approval produces waiting-for-approval;
* production release remains human-gated.

## 2.5 Message-Chain Integration Tests

### Goal

Test agents together through the message bus and task contracts, not direct function calls.

### Chain A: research-to-knowledge dogfood

```text
knowledge_gap_detected
  -> treeseed-docs-planner
  -> documentation_gap_detected / research_task_requested
  -> treeseed-codebase-cartographer
  -> research_note_created / source_map_created
  -> treeseed-knowledge-generator
  -> knowledge_draft_created
  -> treeseed-knowledge-optimizer
  -> knowledge_optimization_completed / promotion_request_created
  -> treeseed-governance-steward
  -> approval_request_created
```

Assertions:

* each step emits expected message type;
* payload contains required ids and source references;
* task events are written;
* artifacts are queryable;
* approval request is pending;
* no content mutation occurs.

### Chain B: governed mutation

```text
approval_request approved
  -> treeseed-docs-engineer
  -> docs_mutation_completed or docs_mutation_failed
  -> treeseed-docs-reviewer
  -> review_passed / review_failed
  -> treeseed-workday-reporter
  -> workday_report_created
  -> treeseed-releaser
  -> release_waiting_for_approval
```

Assertions:

* mutation only touches allowed paths;
* forbidden path attempt fails;
* verification runs;
* staged result is recorded;
* workday report references the mutation and approval;
* release remains approval-gated.

## 2.6 Manager/Worker Service Tests

### Goal

Test the real workday control plane behavior.

### Required tests

* manager seeds `refresh_project_graph` idempotently;
* manager seeds `scan_codebase_documentation_surface` idempotently;
* manager seeds agent root/trigger tasks from active specs;
* manager does not duplicate startup tasks on repeated reconciliation;
* worker claims pending tasks;
* worker executes deterministic graph refresh;
* worker executes deterministic codebase documentation scan;
* scan emits capped `knowledge_gap_detected` messages;
* worker invokes kernel for generic agent tasks;
* task lease expiry and retry behavior works;
* failed task writes error metadata;
* successful task writes output metadata;
* capacity reservations/ledger entries are written when enabled;
* manager closeout writes report tasks or workday summary;
* local queue and remote queue semantics produce equivalent task/message order for synthetic cases.

## 2.7 API Supervision Tests

### Goal

Confirm the app can inspect the workday and governance state.

Test API routes for:

* active workday summary;
* task list and task detail;
* task events;
* generated artifacts;
* knowledge drafts;
* optimization reports;
* approval request list/detail;
* approval decision route;
* workday reports;
* infrastructure/worker state;
* capacity diagnostics;
* current user/team/project authorization boundaries.

## 2.8 UI Supervision Tests

### Goal

Confirm non-runtime users can understand and supervise the agents.

Test UI pages/components for:

* workday overview;
* worker queue panel;
* operational timeline;
* governance decision panel;
* knowledge artifact card;
* repository context panel;
* capacity diagnostics panel;
* empty states when no workday exists;
* warning state when provider config is missing;
* approval decision flow;
* workday report visibility.

## 2.9 Full Workday Dogfood Tests

### No-mutation dogfood

Command:

```bash
npm run test:market-knowledge-dogfood
```

Flow:

```text
seed local project
start bounded manager reconciliation
run worker drain
emit knowledge gap
planner runs
cartographer runs
knowledge generator runs
optimizer runs
governance steward creates approval request
assert no content mutation
write Markdown report
```

### Governed mutation dogfood

Command:

```bash
npm run test:market-docs-governed-mutation
```

Flow:

```text
seed local project
create or detect docs gap
create research note and draft
optimize draft
create approval request
approve request as human/test principal
run docs engineer in isolated worktree
verify changed paths
run verification
stage mutation
run reviewer
run reporter
run releaser readiness
write Markdown report
```

This test may be slower and should run on nightly CI or explicit workflow dispatch if too expensive for every PR.

## 2.10 Transparent Test Reports

Generate reports under:

```text
.treeseed/test-reports/
```

Required reports:

```text
agent-contracts.md
handler-fixtures.md
message-chains.md
manager-worker.md
processing-parity-local.md
processing-parity-staging.md
workday-dogfood.md
governed-mutation-dogfood.md
```

Each report should include:

* git SHA;
* environment;
* image tag/digest if applicable;
* test scenario id;
* agent specs tested;
* handlers tested;
* messages emitted;
* artifacts created;
* approvals created/decided;
* changed paths;
* verification results;
* failures/warnings;
* links or paths to raw JSON result files.

## 2.11 CI Matrix

### Pull request default

Run:

```bash
npm run verify:direct
npm run test:agent-contracts
npm run test:agent-handlers
npm run test:agent-message-chains
npm run test:manager-worker
npm run test:processing-parity-local
```

### Agent spec changes

If `src/content/agents/**` changes:

```bash
npm run test:agent-contracts
npm run test:agent-message-chains
npm run test:market-knowledge-dogfood
```

### Handler/runtime changes

If `packages/agent/src/agents/**` or `packages/agent/src/services/**` changes:

```bash
npm run test:agent-handlers
npm run test:manager-worker
npm run test:market-knowledge-dogfood
```

### Worker/manager changes

If `packages/agent/src/services/workday-manager.ts`, `worker.ts`, queue, task, or capacity code changes:

```bash
npm run test:manager-worker
npm run test:processing-parity-local
npm run test:market-knowledge-dogfood
```

### Container/deploy changes

If Dockerfile, Railway config, processing env registry, or deploy workflows change:

```bash
npm run processing:build
npm run test:processing-parity-local
npm run test:processing-plan-diff
```

### Nightly or workflow dispatch

Run:

```bash
npm run test:market-docs-governed-mutation
npm run test:processing-parity-staging
npm run test:e2e-workday
```

---

# Part 3: Implementation Phases

## Phase 0: Inventory and Decisions

### Tasks

* Document current local, staging, and production processing commands.
* Document current manager lifecycle in each environment.
* Document current worker filesystem paths in each environment.
* Document current agent specs, triggers, handlers, outputs, and permissions.
* Decide bounded manager lifecycle as the parity target.
* Decide one processing image with role-specific commands.
* Decide `/data` as the worker repository/worktree root.

### Deliverables

* `docs/processing-parity.md`
* `docs/agent-testing.md`
* initial `.treeseed/test-reports/processing-inventory.md`

### Acceptance

* There is a written diff of current local vs staging vs production behavior.
* The team has accepted the lifecycle decisions.

## Phase 1: Processing Entrypoint and Runtime Plan

### Tasks

* Add `treeseed-processing` role dispatcher.
* Wire role dispatcher to existing API/manager/worker services.
* Add `parity-plan` command.
* Add `doctor` command for role readiness.
* Add runtime config normalization for processing roles.
* Add structured logging baseline.

### Acceptance

* `treeseed-processing api --help` works.
* `treeseed-processing manager --dry-run` prints a manager plan.
* `treeseed-processing worker --dry-run` prints worker config and storage root.
* `treeseed-processing parity-plan --environment local --json` works.

## Phase 2: Containerized Processing Image

### Tasks

* Add `Dockerfile.processing`.
* Add `.dockerignore` tuned for processing image.
* Add local image build script.
* Add healthcheck command.
* Ensure runtime image does not include secrets or worktrees.
* Separate build-time and runtime commands.

### Acceptance

* `npm run processing:build` builds the image.
* `docker run treeseed-processing:local healthcheck` passes with minimal env.
* `docker run treeseed-processing:local parity-plan --environment local --json` works.

## Phase 3: Local Docker Compose Parity Mode

### Tasks

* Add `docker-compose.processing.yml`.
* Add `.env.local.processing.example`.
* Mount `/data` from `.treeseed/local-processing/data`.
* Add helper scripts for up/down/logs/seed/test.
* Add local seed parity command.

### Acceptance

* `npm run processing:up` starts API, manager, and worker roles.
* `npm run processing:parity-plan` prints a full local plan.
* Local worker writes repository/worktree state under `.treeseed/local-processing/data`.
* Local parity dogfood workday runs without source-mode fallbacks.

## Phase 4: Railway Role Deployment Parity

### Tasks

* Update Railway projection/config to use one processing image and role commands.
* Remove build commands from service start commands.
* Add manager scheduled/bounded role configuration.
* Add worker volume at `/data`.
* Add staging parity plan artifact.
* Add deployment smoke command.

### Acceptance

* Railway staging deploys API, manager, and worker from the same image shape.
* Staging manager runs one bounded reconciliation and exits.
* Staging worker uses `/data` volume.
* Staging parity plan diff against local shows only allowed differences.

## Phase 5: Agent Spec Contract Test Runner

### Tasks

* Add agent contract test runner.
* Load `src/content/agents/*.mdx`.
* Normalize through runtime spec loader.
* Validate handler, triggers, outputs, permissions, execution, path policy, and context queries.
* Generate Markdown report.
* Add CI command.

### Acceptance

* `npm run test:agent-contracts` passes.
* Unknown output message type fails the test.
* Message-triggered agent without message pick/update fails the test.
* Write-capable agent without path policy fails or warns according to configured severity.

## Phase 6: Content-Backed Agent Test Specs

### Tasks

* Add `src/content/agent-tests` collection.
* Define schema for test specs.
* Add initial tests for each top-level Market agent.
* Build runner that maps test specs to fixtures.
* Generate test catalog report.

### Acceptance

* Agent tests are readable as Markdown.
* Test specs can be listed in the app or docs.
* Missing fixture path fails clearly.

## Phase 7: Handler Fixture Harness

### Tasks

* Add fake scoped SDK test harness.
* Add `AgentContext` fixture builder.
* Add output capture for messages/events/artifacts.
* Add fixture comparison helpers.
* Add fixtures for generator, optimizer, reviewer, governance steward, engineer, reporter, releaser, planner, and cartographer.

### Acceptance

* `npm run test:agent-handlers` passes.
* Each handler has at least one success and one failure/waiting fixture.
* Emitted messages are checked against spec-declared outputs.
* Handler report is generated.

## Phase 8: Message-Chain Tests

### Tasks

* Add in-memory message/task/artifact store harness.
* Add no-mutation research-to-knowledge chain.
* Add governed mutation chain with approval.
* Add failure chain tests for revision/reject/forbidden path.

### Acceptance

* `npm run test:agent-message-chains` passes.
* Research-to-knowledge chain creates approval request and no mutation.
* Governed mutation chain requires approval before docs engineer runs.
* Message-chain report is generated.

## Phase 9: Manager/Worker Parity Tests

### Tasks

* Add manager seed idempotency tests.
* Add worker deterministic task tests.
* Add kernel invocation from worker task tests.
* Add capacity/admission test cases.
* Add local vs container parity comparison for a synthetic workday.

### Acceptance

* `npm run test:manager-worker` passes.
* `refresh_project_graph` is idempotent.
* `scan_codebase_documentation_surface` is idempotent and emits capped gaps.
* Worker local queue and remote-like queue harness produce equivalent results.

## Phase 10: API/UI Supervision Tests

### Tasks

* Add API tests for workday, tasks, artifacts, approvals, and reports.
* Add UI tests for operational panels and governance decision flows.
* Add fixtures from dogfood runs.
* Ensure empty/warning/error states are covered.

### Acceptance

* Users can inspect generated artifacts and pending approvals.
* Workday report is visible.
* Provider/config warnings are visible.
* Approval decision flow works.

## Phase 11: Full Dogfood and Staging Parity

### Tasks

* Add no-mutation dogfood command.
* Add governed mutation dogfood command.
* Add staging parity workflow dispatch.
* Add artifact upload for Markdown reports.
* Add runbook for interpreting failures.

### Acceptance

* Local dogfood no-mutation path passes.
* Local governed mutation path passes.
* Staging parity test passes on workflow dispatch.
* Reports are readable and link raw JSON outputs.

---

# Part 4: Suggested File/Command Changes

## New or changed docs

```text
docs/processing-parity.md
docs/agent-testing.md
docs/workday-parity-runbook.md
docs/railway-processing-deploy.md
```

## New processing files

```text
Dockerfile.processing
.dockerignore
docker-compose.processing.yml
.env.local.processing.example
bin/treeseed-processing
```

## Package changes

```text
packages/agent/src/services/processing-entrypoint.ts
packages/agent/src/services/processing-plan.ts
packages/agent/src/services/processing-doctor.ts
packages/agent/src/services/manager-reconcile.ts
packages/agent/src/services/runtime-paths.ts
packages/agent/src/testing/agent-contracts.ts
packages/agent/src/testing/handler-fixtures.ts
packages/agent/src/testing/message-chain.ts
packages/agent/src/testing/workday-dogfood.ts
```

## Market content changes

```text
src/content/agent-tests/
src/content/agent-tests/knowledge-generator-basic.mdx
src/content/agent-tests/optimizer-basic.mdx
src/content/agent-tests/governed-mutation-basic.mdx
```

## Test fixture changes

```text
packages/agent/test/fixtures/agent-tests/
packages/agent/test/agents/agent-contracts.test.ts
packages/agent/test/agents/handler-fixtures.test.ts
packages/agent/test/agents/message-chain.test.ts
packages/agent/test/services/processing-parity.test.ts
packages/agent/test/services/manager-worker-parity.test.ts
```

## Package scripts

```json
{
  "scripts": {
    "processing:build": "docker build -f Dockerfile.processing -t treeseed-processing:local .",
    "processing:up": "docker compose -f docker-compose.processing.yml up --build",
    "processing:down": "docker compose -f docker-compose.processing.yml down",
    "processing:logs": "docker compose -f docker-compose.processing.yml logs -f",
    "processing:parity-plan": "docker run --env-file .env.local.processing treeseed-processing:local parity-plan --environment local",
    "test:agent-contracts": "npm -w packages/agent run test:agent-contracts",
    "test:agent-handlers": "npm -w packages/agent run test:agent-handlers",
    "test:agent-message-chains": "npm -w packages/agent run test:agent-message-chains",
    "test:manager-worker": "npm -w packages/agent run test:manager-worker",
    "test:processing-parity-local": "npm -w packages/agent run test:processing-parity-local",
    "test:market-knowledge-dogfood": "npm -w packages/agent run test:market-knowledge-dogfood",
    "test:market-docs-governed-mutation": "npm -w packages/agent run test:market-docs-governed-mutation"
  }
}
```

---

# Part 5: Risks and Mitigations

## Risk: containerization hides config drift

Mitigation:

* require parity plan output;
* require local/staging/prod parity diff;
* fail CI when disallowed drift appears.

## Risk: local fast-dev continues to be treated as truth

Mitigation:

* clearly label fast-dev as non-parity;
* require parity mode before merging manager/worker/runtime changes;
* publish reports from container parity runs.

## Risk: Railway cron manager semantics differ from local manager loop

Mitigation:

* make bounded manager reconciliation the shared default;
* keep loop mode development-only;
* test manager idempotency across repeated bounded runs.

## Risk: one image becomes too large

Mitigation:

* start with one image for parity;
* later split images only if each image is generated from the same build pipeline and passes parity diff;
* keep role commands identical.

## Risk: handler tests become opaque JSON snapshots

Mitigation:

* keep test specs in Markdown;
* generate Markdown reports;
* limit raw JSON snapshots to fixtures and attach summaries.

## Risk: agent specs declare outputs that handlers do not emit

Mitigation:

* enforce output coverage in handler fixture tests;
* report declared vs observed outputs per agent.

## Risk: deterministic worker tasks and generic agent handlers remain confusing

Mitigation:

* document task taxonomy:

  * system deterministic task;
  * deterministic worker task with agent context;
  * generic agent handler task;
  * approval-gated mutation task;
* report which path executed each task.

## Risk: staging dogfood mutates real content unexpectedly

Mitigation:

* use test project/environment;
* require explicit test namespace;
* default staging dogfood mutation to generated fixture branches/worktrees;
* require human approval for production mutation.

---

# Part 6: Definition of Done

This implementation is done when:

* local parity, staging, and production have a shared processing image strategy;
* API, manager, worker, workday-start, and workday-report roles use explicit role commands;
* manager lifecycle is consistent and bounded by default;
* worker storage path is consistent at `/data`;
* processing parity plan and diff commands exist;
* local parity mode can run a complete synthetic workday;
* staging parity workflow can run a complete synthetic workday;
* all top-level Market agent specs pass contract tests;
* every top-level Market agent has at least one transparent Markdown-backed test spec;
* every built-in handler used by top-level Market agents has fixture tests;
* message-chain tests cover research-to-knowledge and governed mutation flows;
* manager/worker service tests cover startup seeding, deterministic tasks, generic agent tasks, and idempotency;
* UI/API tests prove workday and governance state is inspectable;
* dogfood tests generate readable Markdown reports;
* CI gates relevant changes with the appropriate subset of tests;
* docs explain how to run fast dev, local parity, staging parity, and dogfood tests.

## Recommended First PR Breakdown

1. **PR 1: Processing role entrypoint and parity plan.**
2. **PR 2: Dockerfile and local Docker Compose parity mode.**
3. **PR 3: Railway service command cleanup and manager lifecycle alignment.**
4. **PR 4: Agent contract test runner and report.**
5. **PR 5: Markdown agent-test collection and handler fixture harness.**
6. **PR 6: Message-chain tests for research-to-knowledge.**
7. **PR 7: Governed mutation chain and manager/worker parity tests.**
8. **PR 8: API/UI supervision tests and workday dogfood reports.**
9. **PR 9: Staging parity workflow and final runbook.**
