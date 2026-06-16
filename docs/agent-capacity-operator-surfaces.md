# Agent Capacity Operator Surfaces

**Status:** Canonical Admin and CLI surface plan  
**Date:** 2026-06-16  
**Audience:** Admin, CLI, SDK/API, and agent runtime implementers  

Admin and CLI expose agent capacity state to humans and automation. They do not own scheduling, assignment selection, provider runtime internals, or ledger settlement.

## Surface Categories

Every operator surface should identify which kind of state it shows:

- **Configuration:** allocation sets, project agent classes, grants, schedules, provider registration.
- **Live observation:** provider health, runner pressure, execution-provider native observations, local lifecycle status.
- **Durable runtime records:** provider sessions, assignments, leases, mode runs, usage actuals, ledger entries.
- **Reconciler-backed lifecycle:** provider images, local Docker runtime, hosted runtime, secrets, health checks, cleanup.

Mixing these categories makes debugging difficult. Admin and CLI should label them plainly.

## Admin Surfaces

Admin should provide:

- allocation-set editor and version history
- portfolio allocation by project
- project allocation by agent class
- planning/acting split controls
- provider registration and grants
- provider availability sessions
- assignment queue and lease status
- mode-run timeline
- usage and ledger settlement views
- blockers, returned assignments, and failed assignments
- explanation panels for why work was assigned, deferred, or blocked

Admin may use reusable controls from `@treeseed/ui`, but product-specific capacity policy and view models belong in `@treeseed/admin`.

## CLI Surfaces

CLI should provide JSON-first commands for:

- capacity plan inspection
- allocation-set inspection and export
- provider lifecycle: build, up, status, logs, down, test-local
- provider session inspection
- assignment inspection
- assignment return/fail diagnostics when authorized
- mode-run inspection
- usage and ledger summaries
- local provider proof

`trsd capacity build/up/status/logs/down/test-local` remain lifecycle commands. Assignment policy and runtime records should be exposed through explicit inspection or diagnostic commands rather than hidden inside lifecycle output.

## Explanation Requirements

When an assignment is selected, deferred, or blocked, operator surfaces should be able to show:

- eligible demand considered
- allocation set and workday envelope used
- provider session used
- capability matches and mismatches
- budget/reservation result
- lease status
- fallback or return reason
- usage actuals after completion

The API assignment function owns the explanation data. Admin and CLI render it.

## TreeDX Proxy Visibility

Operator surfaces may show that an assignment uses a project-scoped TreeDX proxy handle. They must not display raw TreeDX service tokens, node credentials, or provider secrets.

The useful operator fields are:

- project id
- repository/workspace id
- proxy base path
- allowed operations
- audit references

## Package Responsibilities

- `@treeseed/admin` owns browser views and view models.
- `@treeseed/ui` owns reusable controls, charts, forms, and status components.
- `@treeseed/cli` owns command parsing, JSON reports, and terminal rendering.
- `@treeseed/sdk` owns shared contracts and client helpers.
- `@treeseed/api` owns source-of-truth records and explanation payloads.
- `@treeseed/agent` owns provider-local lifecycle and runtime diagnostics.

## Acceptance Criteria

The operator surface work is complete when:

- a steward can explain allocation, assignment, and usage by project, agent class, mode, provider, and execution provider
- a developer can debug a local provider without reading provider-local state files directly
- Admin and CLI display configuration, live observation, runtime records, and reconciliation lifecycle as separate concepts
- no UI or CLI command becomes a hidden scheduler or provider orchestration path
