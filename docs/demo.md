# TreeSeed Strategic Demo Runbook

## Purpose

This runbook describes how to demonstrate TreeSeed through the real local operating system:

* seeded TreeSeed portfolio;
* local Market API and web UI;
* workday manager;
* worker runner;
* capacity provider, lanes, grants, and work policy;
* governance records;
* generated artifacts and operational knowledge.

The demo is not a special app mode. It is a rehearsed walkthrough of the same surfaces operators use.

## Demo Principle

The core message is:

```text
TreeSeed coordinates durable organizational work through execution, governance, and accumulated memory.
```

Do not lead with prompting, code generation, autonomous agent behavior, or implementation topology. Lead with operational continuity.

## Required Local Setup

Run from the market workspace root:

```bash
cd /home/adrian/Projects/treeseed/market
npx trsd status --json
npx trsd install --json
```

Start the local web and API runtime:

```bash
npx trsd dev --surfaces web,api --setup auto
```

Keep that terminal running. The web UI should be available at:

```text
http://127.0.0.1:4321
```

In a second terminal, authenticate the CLI against the local market:

```bash
npx trsd auth:login --market local
```

## Seeded Project Prerequisites

The canonical demo uses the existing `treeseed` seed. Do not create a separate demo seed.

Validate, plan, and apply the local seed:

```bash
npx trsd seed treeseed --environments local --validate
npx trsd seed treeseed --environments local --plan
npx trsd seed treeseed --environments local --apply --json
```

The seed should reconcile:

* TreeSeed team;
* market project;
* repository metadata;
* local capacity provider;
* local capacity lanes;
* local capacity grants;
* local work policy;
* TreeSeed operational resources.

If these records do not appear in the app, treat that as a seed, store, auth, membership, or UI read-path bug.

## Workday Runtime

Start with dry-run automation for a reliable demo rehearsal:

```bash
npx trsd dev:manager \
  --with-worker \
  --docs-automation dry-run \
  --approval-policy manual \
  --workday-id local-docs-1 \
  --capacity-budget 500
```

Use the same command with `--docs-automation on` only when the local loop is healthy and you want real generated output.

The manager and worker should write real records: workdays, tasks, task events, task outputs, approvals, capacity usage, reports, and generated artifacts. The app should read those records directly.

## 20-Minute Demo Flow

### 1. Mission Control

Open:

```text
/app
```

Show the seeded operational context, current objective, active workdays, pending approvals, repository health, recent knowledge, decisions, and releases.

Narration:

```text
TreeSeed starts from an operational objective, not from a chat prompt.
```

### 2. Workdays

Open:

```text
/app/workdays
```

Then open the active workday.

Show the objective, state, current phase, risk classification, budget, operational timeline, artifacts, repository context, governance, knowledge outputs, and capacity trace.

Narration:

```text
A workday is the durable record of coordinated work across research, execution, verification, governance, and knowledge.
```

### 3. Governance

Open:

```text
/app/governance
```

Show pending approvals, escalations, review timeline, audit trail, policies, and capacity constraints. If a review item exists, open its detail page and show the deliberate decision surface.

Narration:

```text
Execution is supervised. Governance is part of the work record, not an afterthought.
```

### 4. Knowledge

Open:

```text
/app/knowledge
```

Show reports, decisions, release notes, research summaries, implementation artifacts, imports, and their operational relationships.

Narration:

```text
The output of work is institutional memory that remains connected to the workday, repositories, approvals, and releases that produced it.
```

### 5. Infrastructure

Open:

```text
/app/infrastructure
```

Show seeded projects, repositories, deployments, capacity and budget state, workers, hosts, resources, seeds, policies, and diagnostics.

Narration:

```text
Infrastructure exists for operators. It is visible and inspectable without becoming the primary user journey.
```

## Good Demo Data

A healthy local demo should show:

* at least one seeded project;
* repository metadata for the market project;
* local capacity provider, lanes, grants, and work policy;
* one active or recent workday;
* task events and outputs from the manager or worker;
* at least one approval request or governance event;
* generated artifacts, reports, or knowledge drafts;
* capacity ledger, reservation, or routing records;
* Infrastructure diagnostics that reflect real local state.

Do not manually fabricate app records for the demo. If the data is missing, fix the local seed/runtime loop.

## Troubleshooting

### Seed Records Are Missing

Run:

```bash
npx trsd seed treeseed --environments local --plan --json
npx trsd seed treeseed --environments local --apply --json
```

Confirm the logged-in local user is a member or owner of the seeded team.

### Workday Is Missing

Run:

```bash
npx trsd dev:manager --plan --json
```

Then restart the workday manager with an explicit workday id:

```bash
npx trsd dev:manager --with-worker --docs-automation dry-run --approval-policy manual --workday-id local-docs-1 --capacity-budget 500
```

### Tasks Do Not Run

Inspect capacity readiness, worker runner logs, task state, and queue polling. The local seed must provide capacity provider, lanes, grants, and work policy before the worker loop can look healthy.

### UI Shows Nothing

Debug the API/store/UI read path. Do not create a demo-only fallback.

## Non-Goals

The demo must not add or rely on:

* `/app/demo`;
* `GET /api/demo`;
* fake demo projections;
* a demo seed manifest;
* simulated agent chatter;
* raw prompts or task payloads;
* manually fabricated operational state.

## Closing Statement

End the walkthrough on:

```text
Every workday improves organizational memory.
```

