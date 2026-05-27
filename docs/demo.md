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

### 1. Start, Team, and Hosts

Open:

```text
/app
/app/teams
/app/hosts
```

Show the guided start page, seeded team controls, and host forms for repository, web, processing, email, and AI providers.

Narration:

```text
TreeSeed starts with the team and hosting context required to run real projects.
```

### 2. Projects

Open:

```text
/app/projects
/app/projects/new
/app/projects/:projectId/deploy
```

Create or open a hosted project. Show one focused control at a time: settings, hosts, deploy, guidance, decisions, artifacts, or delete.

Narration:

```text
TreeSeed guides project development through explicit controls, not a dashboard maze.
```

### 3. Deploy

Open:

```text
/app/projects/:projectId/deploy
```

Show launch status, readiness, staging and production cards, active timeline, latest monitor status, deployment history, and event inspection. The normal local demo starts everything with:

```bash
npx trsd dev --web-runtime local --force
```

That command supervises the Market API, managed local PostgreSQL, migrations, and the deployment runner. For a focused mocked rehearsal outside the integrated supervisor, queue staging deploy or monitor, then run:

```bash
npm run market:operations-runner -- --market local --once --operation project:web_deployment --mock-external
```

Walk through:

```text
Deploy staging
Monitor staging
Publish content
Deploy production with explicit confirmation
Inspect deployment history and events
```

Narration:

```text
TreeSeed makes deployment a governed project operation: visible, auditable, retryable, and inspectable.
```

### 4. Capacity and Work

Open:

```text
/app/capacity
/app/work/objectives
/app/work/decisions
```

Show capacity providers and grants, then show objectives and the decision queue. If a review item exists, open it and record an approval or rejection.

Narration:

```text
Project changes and publishing stay deliberate because decisions are explicit.
```

### 5. Knowledge

Open:

```text
/app/knowledge/artifacts
/app/knowledge/publish
```

Show generated artifacts and the publish/package controls for templates and knowledge packs.

Narration:

```text
The output of work is institutional memory that remains connected to the workday, repositories, approvals, and releases that produced it.
```

## Good Demo Data

A healthy local demo should show:

* at least one seeded project;
* repository metadata for the market project;
* deployment readiness, staging/prod environment cards, and at least one mocked deployment or monitor record;
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

### Deployment Does Not Progress

Confirm the project has repository and web host readiness. In normal local development, the deployment runner is already supervised by `npx trsd dev --web-runtime local --force`. For focused mocked debugging outside the integrated supervisor, run:

```bash
npm run market:operations-runner -- --market local --once --operation project:web_deployment --mock-external
```

If the runner cannot authenticate, unlock or configure the local Market runner secret. If a real external staging proof is required, use a disposable GitHub/Cloudflare target or document the missing credential/target blocker.

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
