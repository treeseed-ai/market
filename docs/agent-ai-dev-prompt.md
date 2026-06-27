You are operating inside the TreeSeed `market` workspace through the Codex VS Code extension.

Your mission is to develop, debug, and harden the live local TreeSeed documentation automation workday loop. Do not create generic tests or isolated mocks. Work against the real local product loop: web UI, API/control plane, seed state, workday manager, worker, governance, generated artifacts, docs mutation policy, verification, and workday reports.

The current capacity provider parity contract is package-owned runtime plus
Market-owned tenant specs:

* `@treeseed/agent` owns provider API, provider manager, provider runner,
  handlers, provider plan/doctor, runtime paths, and test harnesses.
* Market owns `src/content/agents`, `src/content/agent-tests`, seeds,
  generated Drizzle migration artifacts, and deployment config.
* Parity mode uses the package-owned provider Docker image and `/data` paths. Fast-dev
  `.agent-worktrees` behavior is non-parity unless a test explicitly exercises
  it.

Current ownership language: `@treeseed/agent` also owns AgentKernel execution
and mode scheduling. `@treeseed/api` owns provider availability sessions,
assignment leases, mode-run records, usage settlement, and project-scoped
TreeDX proxy authorization. See
`docs/agent-capacity-implementation-roadmap.md` for the canonical capacity
architecture.

## Scope

Only work in these TreeSeed project areas unless I explicitly approve broader scope:

- top-level `market` app
- `packages/agent`
- `packages/sdk`
- `packages/cli`
- `packages/core`
- `seeds`
- `docs`
- `src/content`
- `@treeseed/ui/components/astro/app/operations`
- `packages/admin/src/pages/app`
- `packages/admin/src/pages/v1`
- tests directly related to this loop

Do not edit unrelated application features. Do not touch production source paths just to make documentation automation pass unless the issue genuinely belongs there and you explain the reason first.

## Operating Rule

You are not merely writing tests. You are supervising and improving the local TreeSeed docs automation workday until the manager, worker, API, UI, governance, artifacts, and reports all describe the same system.

Make the loop observable, resumable, budget-limited, and approval-gated. “Done” means the acceptance criteria at the end of this prompt are satisfied.

## First: Inspect Current State

Before changing code, inspect the repository and current implementation:

```bash
pwd
git status --short
npx trsd status --json
npx trsd dev --plan --json
npx trsd capacity plan --market local --provider local --json
````

If commands fail because dependencies or local setup are missing, diagnose the smallest setup issue. Ask me before running networked install commands or anything that could spend external API/model budget.

For parity or runtime package work, also inspect:

```bash
npm -w packages/agent run capacity-provider:build
npm -w packages/agent run capacity-provider:test-local
npm -w packages/agent run test:agent-tools
npm -w packages/agent run verify:local
```

For Knowledge Hub content work, use model-aware TreeSeed content tools when they are present. Do not hand-write frontmatter for questions, proposals, notes, decisions, books, knowledge pages, people, or agents when a `treeseed.content.*` or generated model preset tool is available. `contentAccess` controls the models and actions an agent or handler may use; `tools.allowed` controls only the callable tools exposed to an execution provider.

`capacity-provider:test-local` exercises Docker when available. A local container
healthcheck may warn about missing Codex auth; staging and production doctor
checks should remain strict about missing hosted credentials or stub providers.
Live Codex tool proof is opt-in and should only run with explicit budget intent:
`TREESEED_AGENT_LIVE_CODEX=1 npm -w packages/agent run test:agent-tools:live`.
For GitHub Copilot native custom-tool proof, use `TREESEED_AGENT_LIVE_COPILOT=1 npm -w packages/agent run test:agent-tools:live-copilot`; the preferred configured credential is `TREESEED_GITHUB_COPILOT_TOKEN` with Copilot Requests permission. The adapter can fall back to `TREESEED_GITHUB_TOKEN` for compatibility.

## Local Runtime Setup

Use this as the intended local runtime shape:

```text
TreeSeed operational app
  -> local API / control plane
  -> local Treeseed PostgreSQL control-plane store
  -> static-hub D1 form store for unauthenticated submissions only
  -> seeded TreeSeed team
  -> seeded market project
  -> seeded local work policy
  -> seeded local capacity provider, lanes, and grants
  -> local workday manager
  -> local worker runner
  -> generated tasks, events, artifacts, approvals, capacity usage, and reports
```

The seed creates control-plane records. The manager and worker are running processes. The UI reads the records those processes write.

The local dev runtime must not be treated as the creator of local capacity provider state. The provider, lanes, grants, and work policy should come from the local seed, and provider lifecycle should run through `trsd capacity`.

## Start Web/API Supervisor

Start or verify the local web/API runtime. Prefer a log-captured background process so you can keep iterating:

```bash
mkdir -p .treeseed/logs .treeseed/dev-pids

# If no existing web/API supervisor is running, start one:
npx trsd dev start --web-runtime local --setup auto --json \
  > .treeseed/logs/dev-web-api.jsonl 2>&1 &

echo $! > .treeseed/dev-pids/dev-web-api.pid
```

Then inspect logs until the local app/API are ready:

```bash
tail -n 120 .treeseed/logs/dev-web-api.jsonl
```

Expected app URL is usually:

```text
http://127.0.0.1:4321/app
```

If ports are already occupied, inspect existing processes and logs. Do not kill unrelated processes without asking me.

## Seed Local State

Validate and apply the local TreeSeed seed when needed:

```bash
npx trsd seed treeseed --environments local --validate
npx trsd seed treeseed --environments local --plan
npx trsd seed treeseed --environments local --apply --json
```

The local seed should create or reconcile:

* TreeSeed team
* market project
* market GitHub repository metadata
* local capacity provider
* local capacity lanes
* local team grant
* market local work policy
* TreeSeed operational resource and import references

If the UI does not show these records after seed apply, treat that as a seed, store, auth, membership, API, or UI query bug. Do not create demo-only records or routes to fake health.

## Run the Provider Workday Loop

Start conservatively by inspecting the provider lifecycle and running package-owned local provider tests:

```bash
mkdir -p .treeseed/logs .treeseed/dev-pids

npx trsd capacity status --json
npm -w packages/agent run capacity-provider:test-local \
  > .treeseed/logs/capacity-provider-local-docs-1.jsonl 2>&1 &

echo $! > .treeseed/dev-pids/capacity-provider-local-docs-1.pid
```

Follow the manager/worker output:

```bash
tail -n 200 .treeseed/logs/dev-manager-local-docs-1.jsonl
```

When you need to patch code, stop only the relevant TreeSeed local process gracefully using the PID file, then rerun the same command after the fix. Do not restart from a new workday id unless the current state is corrupt or the idempotency behavior itself is the bug.

Use the same workday id repeatedly:

```text
local-docs-1
```

The repeated-run goal is to prove manager resume, idempotent startup task seeding, stale task behavior, and worker task execution.

## Healthy Expected Data Flow

Debug toward this flow:

```text
manager starts or resumes workday
  -> manager ensures work policy
  -> manager refreshes priority inputs
  -> manager seeds startup tasks
  -> manager evaluates task admission and capacity budget
  -> task becomes queued
  -> worker claims task
  -> worker reserves capacity or records capacity metadata
  -> handler executes research, planning, generation, verification, or mutation
  -> worker writes outputs and events
  -> worker records usage
  -> manager observes completion and may seed follow-up work
  -> approvals and reports appear in UI
```

The manager owns scheduling and lifecycle. The worker owns task execution. Handlers own task-specific behavior. The UI owns supervision and human decisions.

## Debugging Decision Tree

Use this triage model after every run:

* If manager logs show work but the UI does not, debug the API/store/UI read path.
* If the UI shows records but worker does nothing, debug task state, leases, worker config, runner registration, or queue polling.
* If tasks run but capacity is missing, debug provider/grant/work policy reconciliation, reservation, routing, usage recording, or ledger writes.
* If artifacts exist but approvals do not, debug promotion request creation and governance summary sync.
* If approvals exist but docs mutation does not run, debug approval state transitions, mutation task creation, and task admission.
* If mutation runs but paths are unsafe, fail the mutation and fix path policy enforcement.
* If verification runs but the report is absent, debug report generation and workday summary linkage.
* If report exists but UI does not link it, debug generated artifact, workday report, API, and view-model visibility.

Always classify the first real blocker before patching.

## Documentation Automation Task Model

Normalize the implementation around these task kinds rather than inventing unrelated names.

Startup/planning:

```text
refresh_project_graph
scan_codebase_documentation_surface
detect_documentation_gaps
plan_documentation_workday
```

Research:

```text
research_code_surface
research_runtime_flow
research_package_api
research_cli_command
research_ui_governance_flow
```

Knowledge:

```text
generate_knowledge_draft
optimize_knowledge_draft
review_knowledge_draft
create_promotion_request
```

Mutation:

```text
apply_approved_docs_mutation
verify_docs_mutation
stage_docs_mutation
create_repair_task
```

Governance:

```text
create_approval_request
record_approval_decision
sync_governance_summary
summarize_governance_state
```

Reporting:

```text
write_workday_report
update_operational_summary_snapshot
publish_agent_activity_summary
```

## Code-Aware Knowledge Requirements

Documentation agents must generate real TreeSeed project knowledge, not generic prose.

Research and knowledge outputs should be code-aware across:

* `packages/agent/src/index.ts`
* `packages/agent/src/agents/**`
* `packages/agent/src/services/**`
* `packages/agent/src/api/**`
* `packages/sdk/src/**`
* `packages/cli/src/cli/**`
* `packages/core/src/**`
* `@treeseed/ui/components/astro/app/operations/**`
* `packages/admin/src/pages/app/**`
* `packages/admin/src/pages/v1/**`
* `src/content/**`
* `docs/**`
* `packages/sdk/drizzle/**`

Generate or improve context pack support for:

```text
package surface packs
module surface packs
flow packs
UI governance packs
source map packs
```

Generated content must include source maps. Source maps should reference package-relative paths, not absolute local machine paths.

Seed and test research around these questions:

```text
How does the TreeSeed agent runtime execute a workday?
How does the research-to-knowledge pipeline convert code evidence into docs?
How does Codex docs mutation stay inside worktree and path boundaries?
How does trsd dev supervise local surfaces?
How should the capacity provider assignment loop handle local docs automation work?
How does the TreeSeed app expose operational governance?
How do approval requests move through the system?
How does Work summarize decision needs?
How does the SDK graph/context query system support agent research?
How does the Core Knowledge Hub render and publish content?
```

## Governance and Approval Rules

Manual approval is the default.

Ask me before:

* approving TreeSeed governance decisions
* switching from `--docs-automation dry-run` to `--docs-automation on`
* applying canonical docs mutations
* staging or saving generated documentation changes
* releasing or publishing
* changing migrations
* changing production source paths outside docs automation support
* running networked commands
* spending significant model/API budget
* deleting local state or killing long-running processes you did not start

All canonical knowledge promotion and docs mutation should require human approval in the first implementation.

Supported approval options:

```text
approve
request_changes
defer
reject
escalate_to_implementation
```

## Worktree and Mutation Policy

Documentation mutations should use the existing worktree lifecycle:

```text
normalize docs mutation input
check approval
create or resume agent worktree
run Codex or deterministic writer
collect changed paths
check allowed/forbidden path policy
run verification commands
save snapshot on failure
stage successful changes
close worktree when complete
record task outputs and events
```

Allowed write paths for docs automation:

```text
docs/**
src/content/knowledge/**
src/content/notes/**
src/content/questions/**
src/content/objectives/**
src/content/proposals/**
src/content/decisions/**
src/content/agents/**
src/content/workdays/**
packages/*/README.md
```

Forbidden paths:

```text
.env*
**/.env*
**/.git/**
**/node_modules/**
.treeseed/worktrees/**
.treeseed/exports/**
packages/*/src/**
src/lib/**
src/pages/api/**
packages/sdk/drizzle/**
```

If an agent discovers that documentation cannot be accurate without changing implementation code, do not patch code in the docs workstream. Create an implementation proposal or task with:

```text
problem
source evidence
required code paths
suggested owner agent
risk
verification command
```

## UI Surfaces To Watch

Use the operational app as a first-class oracle, not a separate demo layer.

Open or inspect state for:

```text
http://127.0.0.1:4321/app
/app
/app/teams
/app/hosts
/app/projects
/app/capacity
/app/work/objectives
/app/work/decisions
/app/knowledge/artifacts
```

The UI should show:

* seeded team and project
* capacity provider, lanes, grants, and policy
* active/current workday
* manager/worker readiness
* repository context
* generated artifacts
* research notes
* knowledge drafts
* optimization reports
* pending approvals
* approval decisions
* docs mutation diffs/results
* verification outcomes
* workday report context

## API Endpoints To Validate or Implement

Use existing database concepts and API routes. Fill gaps instead of inventing a parallel store.

Important API surfaces:

```text
GET /v1/projects/:projectId/agents
GET /v1/projects/:projectId/agents/:agentSlug
POST /v1/projects/:projectId/agents/:agentSlug/run
POST /v1/projects/:projectId/agents/:agentSlug/pause
POST /v1/projects/:projectId/agents/:agentSlug/resume

GET /v1/projects/:projectId/workdays
GET /v1/projects/:projectId/workdays/:workdayId
POST /v1/projects/:projectId/workdays/start
POST /v1/projects/:projectId/workdays/:workdayId/close

GET /v1/projects/:projectId/tasks
GET /v1/projects/:projectId/tasks/:taskId
GET /v1/projects/:projectId/tasks/:taskId/events
POST /v1/projects/:projectId/tasks/:taskId/retry
POST /v1/projects/:projectId/tasks/:taskId/cancel

GET /v1/projects/:projectId/agent-artifacts
GET /v1/projects/:projectId/agent-artifacts/:artifactId
GET /v1/projects/:projectId/agent-artifacts/:artifactId/source-map
GET /v1/projects/:projectId/agent-artifacts/:artifactId/diff

GET /v1/projects/:projectId/approvals
GET /v1/projects/:projectId/approvals/:approvalId
POST /v1/projects/:projectId/approvals/:approvalId/decision

GET /v1/projects/:projectId/agents/readiness
GET /v1/projects/:projectId/providers/codex/readiness

GET /v1/teams/:teamId/inbox
POST /v1/teams/:teamId/inbox/:itemId/acknowledge
```

## Persistence Requirements

Persist these, using existing stores/tables/concepts where possible:

```text
workdays
tasks
task events
task outputs
reports
approval requests
approval decisions
governance summary items
operational summary snapshots
capacity estimates
usage actuals
worker runners
manager leases
```

Artifact payload types should include:

```text
codebase_inventory
source_map
research_note
knowledge_draft
optimization_report
review_report
promotion_request
docs_mutation_result
verification_result
workday_report
```

## Workday Report Requirements

Generate workday report content under:

```text
src/content/workdays
```

Use this shape:

```markdown
---
id: workday:<id>
title: TreeSeed Documentation Automation Workday - YYYY-MM-DD
status: completed | partial | failed
work_day_id: <id>
generated_by: treeseed-agent
updated: YYYY-MM-DD
---

# Summary

## What agents analyzed

## Knowledge created

## Drafts pending review

## Approved changes

## Verification outcomes

## Governance decisions

## Open questions

## Next workday recommendations
```

The report must link to tasks, artifacts, approvals, mutations, verification outcomes, and next workday recommendations.

## Testing Strategy

Add or extend tests that prove the real product loop. Do not add generic tests that pass without exercising the manager/worker/governance/artifact/report flow.

Unit tests may cover:

```text
agent spec loading from top-level Market content
codebase scanner
context pack builders
source map validation
knowledge draft validation
optimization report validation
approval request creation
approval decision state transitions
path policy enforcement
workday task seeding idempotency
```

Integration tests should cover:

```text
start local docs automation workday
seed startup tasks
run planner -> researcher -> generator -> optimizer
create approval request
approve request
apply docs mutation
run verification
write workday report
surface artifacts through API state collector
```

UI tests should cover:

```text
Workday detail renders operational phases
Generated Knowledge Review table renders artifacts
Approval modal records decision
Governance queue shows review items
Work shows workday request context
Codex readiness card shows warnings
```

Add or harden an E2E dogfood test around:

```text
market-docs-automation-governance.test.ts
```

Expected E2E flow:

```text
1. create temporary Market-like repo or use the local seeded market project;
2. seed top-level documentation automation agent definitions;
3. run docs automation workday;
4. generate at least one research note;
5. generate at least one knowledge draft;
6. generate at least one optimization report;
7. create approval request;
8. record an approval decision;
9. apply docs mutation only to allowed paths;
10. verify changed paths;
11. ensure forbidden path mutation fails visibly;
12. write workday report;
13. surface the records through API and UI-facing state collectors.
```

## Commands To Run During Iteration

Use these as the main loop commands:

```bash
# inspect fixed local web/API/runtime surfaces
npx trsd dev start --web-runtime local --plan --json

# inspect capacity provider lifecycle separately
npx trsd capacity status --json

# validate seed
npx trsd seed treeseed --environments local --validate
npx trsd seed treeseed --environments local --plan

# apply seed when needed
npx trsd seed treeseed --environments local --apply --json

# run package-owned provider local tests
npm -w packages/agent run capacity-provider:test-local
```

Use targeted test commands based on package ownership. Prefer the smallest meaningful verification first, then the broader suite once the loop is stable.

Examples:

```bash
cd packages/agent && npm test -- --runInBand
cd packages/agent && npm run test:market-knowledge-dogfood
npm test -- market-docs-automation-governance
npm test -- governance
npm test -- workday
npm test -- knowledge
```

If a listed test script does not exist, inspect package scripts and use the closest current command. Do not invent package scripts without checking `package.json` first.

## Iteration Loop

Repeat this loop until acceptance criteria pass:

```text
1. Confirm web/API are running or restart them with logs.
2. Confirm seed state exists.
3. Run or rerun manager + worker with the same workday id in dry-run mode.
4. Tail logs and inspect API/UI/state.
5. Classify the first real blocker.
6. Patch the smallest integrated slice.
7. Run targeted tests.
8. Rerun the same manager + worker command.
9. Update notes in your response with what changed and what remains.
```

Do not switch from `dry-run` to `on` until dry-run is boring and the UI/API/reporting path is understandable.

When dry-run passes, ask me before starting the local capacity provider:

```bash
npx trsd capacity up --execute --json
```

## Stop Conditions

Do not claim success until all of these are true:

* `trsd dev start --web-runtime local --plan --json` works or has a clearly documented blocker.
* Capacity provider lifecycle remains separate through `trsd capacity status|up|down --json`.
* Local seed creates/reconciles team, project, capacity provider, lanes, grant, and work policy.
* Web/API local runtime starts and exposes the operational app.
* Manager starts or resumes workday `local-docs-1`.
* Startup tasks are seeded idempotently.
* Worker claims and completes documentation automation tasks.
* Research notes are persisted.
* Knowledge drafts are persisted.
* Optimization reports are persisted.
* Approval requests are created and visible through API/UI state.
* Approval decision flow works for approve, request changes, defer, and reject where implemented.
* Approved docs mutation writes only allowed documentation/content paths.
* Forbidden path mutation fails visibly and records the policy failure.
* Verification runs and records outcomes.
* Workday report is generated under `src/content/workdays`.
* Work/Knowledge/Decisions UI-facing state shows the same records the manager and worker wrote.
* Rerunning the same workday id does not duplicate startup tasks or corrupt state.
* Capacity budget limits prevent runaway automation.

## Final Response Format

When you report back, include:

```text
What I ran
What I observed
First blocker found
Files changed
Why each change was necessary
Tests run
Current manager/worker/UI status
Remaining risks
Exact next command I should approve or run
```

Keep the focus on making TreeSeed dogfood its core promise: a knowledge coop where open knowledge and capabilities are continuously analyzed, remixed, governed, and improved by agents that remain accountable to human review and project policy.
