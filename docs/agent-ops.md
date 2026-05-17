# TreeSeed Agent Operations Guide

## Purpose

This guide explains how to develop the TreeSeed agent, workday, capacity, and budgeting system locally.

It is written for two audiences:

* humans running and supervising local workdays;
* AI agents, including Codex, implementing and debugging integrated features across `market`, `core`, `cli`, `sdk`, and `agent`.

The goal is a tight local loop where the Market UI, local control plane, seeded TreeSeed portfolio, workday manager, worker runner, capacity providers, and budget records all describe the same system.

## Local Mental Model

Local development should look like production in shape, but with local infrastructure:

```text
Treeseed Market web UI
  -> local Market API / control plane
  -> local D1 store
  -> seeded TreeSeed team
  -> seeded market project
  -> seeded local work policy
  -> seeded local capacity provider, lanes, and grants
  -> local workday manager
  -> local worker runner
  -> generated tasks, events, artifacts, approvals, capacity usage, and reports
```

The seed creates control-plane records. The manager and worker are running processes. The UI reads the records those processes write.

`trsd dev:manager --with-worker` does not create the capacity provider by itself. The provider, lanes, grants, and work policy should already exist from:

```bash
npx trsd seed treeseed --environments local --apply --json
```

After seeding, the integrated dev runtime resolves the local `market` project from local D1 and sets `TREESEED_PROJECT_ID` for manager and worker processes. That is the binding that makes the local workday visible under the same seeded project in the UI.

## One-Time Local Setup

Run from the market workspace root:

```bash
cd /home/adrian/Projects/treeseed/market
npx trsd status --json
npx trsd install --json
```

Start the local web/API runtime:

```bash
npx trsd dev --surfaces web,api --setup auto
```

Keep that terminal running. It should print the local web URL, usually:

```text
http://127.0.0.1:4321
```

In a second terminal, log the CLI into the local market:

```bash
npx trsd auth:login --market local
```

Then validate and apply the local seed:

```bash
npx trsd seed treeseed --environments local --validate
npx trsd seed treeseed --environments local --plan
npx trsd seed treeseed --environments local --apply --json
```

The local seed should create or reconcile:

* TreeSeed team;
* market project;
* market GitHub repository metadata;
* local capacity provider;
* local capacity lanes;
* local team grant;
* market local work policy;
* TreeSeed market product/catalog references.

If the UI does not show these records after seed apply, treat that as a seed, store, auth, membership, or UI query bug.

## Starting Workdays

Start conservatively with dry-run docs automation:

```bash
npx trsd dev:manager \
  --with-worker \
  --docs-automation dry-run \
  --approval-policy manual \
  --workday-id local-docs-1 \
  --capacity-budget 500
```

When the loop is healthy, turn on local docs automation:

```bash
npx trsd dev:manager \
  --with-worker \
  --docs-automation on \
  --approval-policy manual \
  --workday-id local-docs-1 \
  --capacity-budget 500
```

The local seed's default work policy follows weekday business hours. Use `--workday-id` when you want to force a local development workday outside that schedule. Without an active workday or a pending one-off workday request, the manager will only hold or refresh a lease and the worker will stay idle.

Useful variants:

```bash
npx trsd dev:manager --plan --json
npx trsd dev:manager --with-worker --workday-id local-docs-1
npx trsd dev:manager --with-worker --capacity-budget 100
npx trsd dev:manager --with-worker --approval-policy low-risk-auto
```

Use `manual` approval while developing new behavior. Use low budgets until task admission, reservation, execution, and reporting are easy to understand in the UI.

## UI Surfaces To Watch

Open:

```text
http://127.0.0.1:4321/app
```

Then inspect the TreeSeed team and market project:

```text
/app/teams/treeseed
/app/teams/treeseed/seeds
/app/teams/treeseed/capacity
/app/teams/treeseed/inbox
/app/teams/treeseed/projects/market
```

The ideal local UI should show:

* seeded team and project;
* seeded repository and product metadata;
* local capacity provider, lanes, grants, and budgets;
* active or recent workdays;
* queued, claimed, running, completed, failed, and paused tasks;
* task events and outputs;
* generated artifacts;
* approval requests;
* workday reports;
* capacity reservations, routing decisions, ledger entries, and usage actuals.

If manager logs show work but the UI does not, debug the API/store/UI read path. If UI shows records but worker does nothing, debug task state, leases, worker config, or queue polling. If tasks run but capacity is missing, debug provider/grant/work policy reconciliation and usage recording.

## Expected Data Flow

The healthy workday loop is:

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

## Capacity And Budgeting

Local capacity should be real enough to test the product model:

* provider: `treeseed-local-dev`;
* lanes: `local-codex`, `local-worker`;
* grant: local TreeSeed team grant;
* work policy: `market/local`;
* budget: controlled by seed and optionally overridden by `--capacity-budget`.

When changing budget behavior, inspect:

* work policy resolution;
* task admission decisions;
* capacity plan for the project;
* reservations;
* routing decisions;
* ledger entries;
* worker usage actuals;
* approval thresholds and overflow policy.

Good local capacity changes should be visible in both logs and UI. Do not treat local budget logic as a test-only stub. It is the model for staged and hosted behavior.

## Developing With Codex

The most effective loop is small, integrated, and observable:

1. Start `npx trsd dev --surfaces web,api --setup auto`.
2. Apply the local seed.
3. Start `npx trsd dev:manager --with-worker --docs-automation dry-run --approval-policy manual --capacity-budget 500`.
4. Reproduce one specific issue.
5. Ask Codex to inspect the relevant logs, store/API path, UI view, and package boundary.
6. Let Codex patch the smallest integrated slice.
7. Run targeted tests.
8. Rerun the same local workday command.
9. Save only after the loop is understandable and verified.

Good prompts for Codex:

```text
The manager seeded tasks but the UI project workstream is empty. Trace the data path and patch the smallest missing integration.
```

```text
The worker claims a task but no capacity usage appears. Inspect task execution, reservation, and ledger writes.
```

```text
The seed created the provider but the capacity page does not show lanes. Verify store serialization, API response, and UI model.
```

```text
The workday report was generated but not linked from the project UI. Trace generated artifact and workday report visibility.
```

Codex should work across packages when the feature crosses package boundaries:

* `packages/sdk`: shared types, planning, operations, capacity algorithms, local DB helpers;
* `packages/agent`: manager, worker, handlers, workday reports, runtime readiness;
* `packages/core`: integrated dev supervisor and runtime wiring;
* `packages/cli`: command parsing, help, local workflow entrypoints;
* `src/api`: market control-plane API and store;
* `src/pages` and `src/components`: Market UI supervision surfaces;
* `seeds`: desired local/staging/prod portfolio shape.

Do not copy logic between packages. Move shared contracts into SDK, keep runtime behavior in agent or market, and keep the CLI as the operator entrypoint.

## Debugging Checklist

When something is wrong, classify it first.

### Seed State

```bash
npx trsd seed treeseed --environments local --plan --json
npx trsd seed treeseed --environments local --apply --json
```

Check whether the logged-in local user is a member or owner of the seeded team. If the seed reports success but the UI cannot see the team, inspect local auth, team membership, and UI access filters.

### Runtime Plan

```bash
npx trsd dev:manager --plan --json
```

Verify:

* selected surfaces;
* `TREESEED_PROJECT_ID`;
* local D1 path;
* docs automation mode;
* capacity budget;
* approval policy;
* manager and worker commands.

### Manager

Look for:

* active workday created or resumed;
* manager lease acquired;
* work policy found or created;
* priority snapshot created;
* startup tasks seeded;
* admission decisions;
* scale decisions;
* report generation.

### Worker

Look for:

* worker started;
* task claimed;
* handler selected;
* capacity reservation or metadata;
* output written;
* task completed, failed, paused, or retried;
* usage recorded.

### UI/API

If records exist but the UI is empty, inspect:

* API route;
* store method;
* serialized payload;
* team/project access check;
* section data loader;
* component props.

### Database Locks Or Foreign Keys

If local D1 reports SQLite locks or foreign key failures:

1. Stop local dev and manager processes.
2. Restart only web/API.
3. Re-apply the local seed.
4. Start manager with a low budget.
5. Reproduce with one worker.

Do not patch around foreign key failures by writing raw SQL from the CLI. Fix the API/store/service path that creates inconsistent records.

## Verification

Use the narrowest useful checks first:

```bash
npm run test:unit -- --run test/lib/seed-apply.test.ts
npm run test:unit -- --run test/api/market-api.test.ts
cd packages/agent && npm run test:unit
cd packages/cli && npm test
npm run check
```

For package-local changes:

```bash
cd packages/sdk && npm run verify:local
cd packages/core && npm run verify:local
cd packages/cli && npm run verify:local
cd packages/agent && npm run verify:local
```

Before saving a coherent integrated change:

```bash
npx trsd status --json
npx trsd save --json
```

Use `npx trsd save` only when the local behavior and targeted checks support the change.

## Safe Mutation Policy

For local development, agents may help generate documentation and code changes, but shared-repository mutation should remain handler-controlled.

The preferred path is:

```text
approved local task
  -> isolated worktree or explicit allowed files
  -> agent proposes edits
  -> deterministic verification
  -> human review
  -> save
  -> stage or release only by explicit human command
```

Production release remains human-approved. Agents may plan, summarize, prepare, and request approval. They should not approve their own work or bypass production gates.

## What Good Looks Like

A successful local agent development session has these properties:

* seed apply is idempotent;
* web/API, manager, and worker all use the same local D1 state;
* the TreeSeed team and market project are visible to the logged-in user;
* manager activity appears in the project UI;
* worker execution changes task state and writes events;
* capacity provider, lanes, grants, reservations, and usage are visible;
* generated outputs are traceable to source context;
* approvals are visible and actionable;
* workday reports explain what happened and what should happen next;
* targeted tests cover the changed slice;
* Codex can reproduce, patch, verify, and explain the integrated behavior without inventing parallel systems.
