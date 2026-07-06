# Agent Capacity Operator Surfaces

**Status:** Canonical Admin and CLI surface reference for activity-profile capacity runtime inspection
**Date:** 2026-07-05
**Audience:** Admin, CLI, SDK/API, and agent runtime implementers

Admin and CLI expose agent capacity state to humans and automation. They do not own scheduling, assignment selection, provider runtime internals, or ledger settlement.

## Surface Categories

Every operator surface should identify which kind of state it shows:

- **Configuration:** allocation sets, project agent classes, grants, schedules, provider registration.
- **Live observation:** provider health, runner pressure, execution-provider native observations, local lifecycle status.
- **Durable runtime records:** decision readiness, planning input requests, execution inputs, accepted capacity plans, workday envelopes, provider sessions, assignments, assignment explanations, leases, mode runs, usage actuals, ledger entries.
- **Reconciler-backed lifecycle:** provider images, local Docker runtime, hosted runtime, secrets, health checks, cleanup.

Mixing these categories makes debugging difficult. Admin and CLI should label them plainly.

Human-machine execution provider surfaces should render execution provider kind, external refs, adapter status, artifacts, usage, and capability demand/supply explanations without becoming scheduling or execution surfaces. See [Human-Machine Execution Providers](./human-machine-providers.md).

Phase H adds `executionVisibility` as the shared SDK-owned operator projection for those fields. Admin and CLI use it to render selected execution provider kind or id, adapter status, external refs, artifacts, usage, required/available/alias/missing capabilities, selected provider, selected execution provider, and reason codes from existing assignment, explanation, and mode-run records. Full capability drill-down remains in assignment explanation records.

## Admin Surfaces

Admin should provide:

- allocation-set editor and version history
- portfolio allocation by project
- project allocation by agent class
- planning/acting split controls
- provider registration and grants
- provider availability sessions
- assignment queue and lease status
- assignment activity type and selected agent activity profile
- planning and acting reservation state
- mode-run timeline
- usage and ledger settlement views
- blockers, returned assignments, and failed assignments
- explanation panels for why work was assigned, deferred, or blocked

Admin may use reusable controls from `@treeseed/ui`, but product-specific capacity policy and view models belong in `@treeseed/admin`.

Implemented Phase 4 surfaces:

- `/app/capacity/allocation` remains the allocation and project agent-class allocation surface.
- `/app/capacity/providers` remains the provider registration, native capacity, grants, and lifecycle overview surface.
- `/app/capacity/runtime` shows allocation-set versions, selected-project agent classes, provider availability sessions, provider assignments, mode-run telemetry, execution-provider refs, adapter status, artifacts, usage, and capability coverage as separate read-only sections.
- Admin API facades call the public API routes for those records and for focused decision-readiness, execution-input, assignment-explanation, and workday-summary drill-downs; they do not import API store code or provider runner code.

## CLI Surfaces

CLI should provide JSON-first commands for:

- capacity plan inspection
- allocation-set inspection and export
- provider lifecycle: build, up, status, logs, down, test-local
- provider session inspection
- assignment inspection
- assignment return/fail diagnostics when authorized
- mode-run inspection
- decision planning status inspection
- decision execution input inspection
- workday envelope and settlement summary inspection
- assignment explanation inspection
- usage and ledger summaries
- local provider proof

`trsd capacity build/up/status/logs/down/test-local` remain lifecycle commands. Assignment policy and runtime records should be exposed through explicit inspection or diagnostic commands rather than hidden inside lifecycle output.

Implemented Phase 4 commands:

- `trsd capacity allocation-sets --team <team-id> --json`
- `trsd capacity agent-classes --project <project-id> --json`
- `trsd capacity provider-sessions --team <team-id> [--provider <provider-id>] [--status <status>] --json`
- `trsd capacity assignments --team <team-id> [--project <project-id>] [--provider <provider-id>] [--status <status>] --json`
- `trsd capacity mode-runs --project <project-id> [--mode planning|acting] [--assignment <assignment-id>] --json`
- `trsd capacity decision-planning --decision <decision-id> --json`
- `trsd capacity execution-inputs --decision <decision-id> [--status <status>] --json`
- `trsd capacity workday --workday <workday-id> --json`
- `trsd capacity workday-summary --workday <workday-id> --json`
- `trsd capacity assignment-explanation --team <team-id> --assignment <assignment-id> --json`

Phase H extends existing inspection commands without adding scheduler commands:

- `trsd capacity assignments --json` includes `executionVisibility` on each assignment record.
- `trsd capacity mode-runs --json` includes `executionVisibility` on each mode-run record.
- `trsd capacity assignment-explanation --json` includes an `executionCapabilityMatch` summary derived from the assignment explanation gates.

Activity-profile era operator surfaces should also show:

- agent slug and project agent class
- assignment mode and activity type
- selected handler (`writer`, `actor`, `estimate`, `releaser`, or `reporter`)
- planning/acting reservation id and reserved credits
- TreeDX content models and tool ids exposed to the run
- branch policy and assignment worktree/branch when applicable
- question policy and unresolved human/team input requirements

Phase 5 live proof is invoked through `trsd reconcile test-live`, not through hidden scheduling behavior in `trsd capacity`. The proof creates diagnostic assignments and mode runs tagged with the live-test run id, so operators can inspect them with the existing assignment and mode-run commands after local or hosted acceptance.

## Explanation Requirements

When an assignment is selected, deferred, or blocked, operator surfaces should be able to show:

- eligible demand considered
- allocation set and workday envelope used
- provider session used
- capability matches and mismatches
- budget/reservation result
- planning or acting reservation id
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
- provider actor and assignment id
- result status and observed timestamp

Implemented surfaces:

- Admin `/app/capacity/runtime` shows TreeDX proxy audit rows for the selected project.
- CLI `trsd capacity treedx-proxy-audit --project <project-id> [--assignment <assignment-id>] --json` reads the same audit rows.
- CLI `trsd capacity fallback-outputs --project <project-id> [--mode <planning|acting>] [--status <status>] --json` reads bounded fallback output records.

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

## Guarantee Observability

API endpoint reliability is represented by endpoint-family guarantees backed by route descriptor matrices. UI/Admin guarantees should depend on API endpoint guarantees through `dependsOnGuarantees` instead of duplicating endpoint proof. Agent guarantee output must identify the selected execution-provider mode (`mock`, `live-codex`, or `auto`) and whether local dev/acceptance seed preflight was used.
