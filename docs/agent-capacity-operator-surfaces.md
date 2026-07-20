# Agent Capacity Operator Surfaces

**Status:** Canonical Admin and CLI surface reference for activity-profile capacity runtime inspection
**Date:** 2026-07-05
**Audience:** Admin, CLI, SDK/API, and agent runtime implementers

> Completion authority: [Agent Capacity Completion and Production-Readiness Plan](./agent-capacity-completion.md) defines the complete API/CLI/configuration parity target. Admin UI implementation is intentionally deferred until that backend contract is service-proven.

Admin and CLI expose agent capacity state to humans and automation. They do not own scheduling, assignment selection, provider runtime internals, or ledger settlement.

## Surface Categories

Every operator surface should identify which kind of state it shows:

- **Configuration:** allocation sets, project agent classes, grants, schedules, provider registration.
- **Live observation:** provider health, runner pressure, execution-provider native observations, local lifecycle status.
- **Durable runtime records:** decision readiness, planning input requests, execution inputs, accepted capacity plans, workday envelopes, provider sessions, assignments, assignment explanations, leases, mode runs, usage actuals, ledger entries.
- **Durable governance/audit records:** provider registration decisions and pre-admission assignment-synthesis denials, filtered by provider, membership, action, or resource.
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

Implemented Architecture Milestone M4 surfaces:

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
- explicit `trsd capacity overrun-approve|overrun-reject` decisions over team-managed API operations; provider credentials cannot make these decisions
- local provider proof

`trsd capacity build/up/status/logs/down/test-local` remain lifecycle commands. Assignment policy and runtime records should be exposed through explicit inspection or diagnostic commands rather than hidden inside lifecycle output.

`trsd capacity workday-run --provider local` is only an operator convenience: the CLI resolves it through approved membership and the unique open local availability session, then sends the stable provider id. Live execution accepts an explicit `--allocation` and fails closed when existing allocation, grant, project, or TreeDX configuration is missing. It does not create policy as a side effect.

Implemented Architecture Milestone M4 commands:

- `trsd capacity allocation-sets --team <team-id> --json`
- `trsd capacity agent-classes --project <project-id> --json`
- `trsd capacity availability-sessions --team <team-id> [--provider <provider-id>] [--status <status>] --json`
- `trsd capacity assignments --team <team-id> [--project <project-id>] [--provider <provider-id>] [--status <status>] --json`
- `trsd capacity mode-runs --project <project-id> [--mode planning|acting] [--assignment <assignment-id>] --json`
- `trsd capacity execution-runs --team <team-id-or-slug> [--project <project-id>] [--provider <provider-id>] [--assignment <assignment-id>] [--workday <workday-id>] [--execution-provider <id>] [--limit <1-200>] --json`
- `trsd capacity workday-log --team <team-id-or-slug> --workday <workday-id> [--provider <provider-id>] [--format timeline|tree|yaml|json] --json`
- `trsd capacity decision-planning --decision <decision-id> --json`
- `trsd capacity execution-inputs --decision <decision-id> [--status <status>] --json`
- `trsd capacity workday --workday <workday-id> --json`
- `trsd capacity workday-summary --workday <workday-id> [--evidence assignments|mode-runs|reservations|usage-actuals|ledger-entries] [--limit <1-200>] [--cursor <opaque>] --json`
- `trsd capacity assignment-explanation --team <team-id> --assignment <assignment-id> --json`
- `trsd capacity audit-events --team <team-id> [--provider <provider-id>] [--membership <membership-id>] [--audit-action <action>] [--resource-type <type>] [--resource-id <id>] [--limit <1-200>] [--cursor <opaque>] --json`

Phase H extends existing inspection commands without adding scheduler commands:

- `trsd capacity assignments --json` includes `executionVisibility` on each assignment record.
- `trsd capacity mode-runs --json` includes `executionVisibility` on each mode-run record.
- Execution-run and workday-log reads are forensic operations: an assignment, execution-run, or mode-run API/storage failure is surfaced as command failure and must never be rendered as an empty successful trace.
- Workday maintenance is operations-runner owned and fail-visible. Assignment/workday read endpoints never run hidden terminalization, and a settlement or lifecycle storage failure must surface rather than appear as a successful zero-change recovery. Operators inspect the still-recoverable assignment, lifecycle code, settlement ledger, mode run, and stable fallback record through the existing bounded commands.
- Expired leases are classified by the API recovery owner, not overwritten during leasing. Safe retries preserve their reservation; exhausted attempts settle and fail; proven completions close; uncertain settlement or side-effect evidence remains visibly expired for operator action. A terminal assignment cannot be requeued while its original reservation remains financially unresolved.
- Assignment inspection and provider polling consume the same typed assignment repository contract. Corrupt durable assignment JSON/mode/version and invalid lease duration are explicit API/CLI failures; operator surfaces must not render them as an empty queue, a planning default, or a successful no-op.
- Admission, grant, and replay inspection share one strict durable-JSON contract. Malformed allocation, grant, workday, session, class, reservation, or assignment evidence is reported with its owner/id/column and never displayed as empty/default policy.
- API and CLI capacity mutations share the API's strict request-object contract. Malformed JSON and null, array, or primitive roots return a stable 400 and never invoke a default mutation; only routes that explicitly declare an optional body accept an empty body.
- Operator task execution is inspected through provider assignments, mode runs, execution runs, usage, and ledger evidence. Retired project-runner task routes and task/event/output records are not compatibility surfaces and must not be recreated in CLI or API clients.
- Provider coordination is inspected through availability sessions, assignment leases, provider-manager status, mode runs, and usage. Retired project-runner manager leases, worker runners, repository claims, runner scale decisions, agent pools, pool registrations, and worker-pool scalers are not operator surfaces and must not be recreated; operations-runner `platform_repository_claims` remain a separate workspace diagnostic.
- Pre-admission synthesis denials are not assignment explanations. The bounded `capacity-audit-events` API and `trsd capacity audit-events` are their sole operator read path; malformed audit metadata is an explicit storage failure.
- Workday demand-source and assignment-function failures are operator-visible control-plane failures. Unknown run status, corrupt demand/run/artifact JSON, TreeDX source failure, missing or ambiguous requested projects, processing-bound overflow, admission conflict, and workspace-provisioning failure must not be rendered as an empty queue or partially successful workday. Team operators can invoke an idempotent tick and can cancel or safely requeue eligible assignments through API and CLI; active leases are fenced from human cancellation.
- Project-context compilation failures are admission failures. Missing owning teams and unreadable architecture/repository state remain visible through API/CLI diagnostics and are never rendered as an assignment with fabricated defaults.
- TreeDX workspace preparation reports stable upstream HTTP, response-size, JSON, and deterministic-identity error codes. Operator clients must preserve these errors and must not retry with a different workspace identity.
- Workday inspection exposes exact run-owned envelope state and scheduling recovery failures. A missing failure event, unconfirmed failed-run transition, or unclosed exact envelope is a failed control-plane operation, never a successful partial schedule or empty result.
- Provider runners report assignment-attempt usage dimensions through `POST /v1/provider/assignments/:assignmentId/usage` before calling terminal settlement. Reports are explicitly informational or incremental; aggregate accounting is terminal-only. Usage and settlement inspection reads one typed bounded evidence contract. Corrupt usage JSON/numeric/accounting state or a database failure is surfaced to CLI/API callers and never rendered as zero usage, an empty successful collection, or an inferred execution-provider kind.
- Renew, return, complete, and fail consume one typed lifecycle contract. A 409 after expiry or a concurrent state-version change is a real lost-authority result; CLI/API clients must not retry it as though the stale runner still owns the assignment.
- `trsd capacity assignment-explanation --json` includes an `executionCapabilityMatch` summary derived from the assignment explanation gates.

Activity-profile era operator surfaces should also show:

- agent slug and project agent class
- assignment mode and activity type
- selected handler (`writer`, `actor`, `estimate`, `releaser`, or `reporter`)
- planning/acting reservation id and reserved credits
- TreeDX content models and tool ids exposed to the run
- branch policy and assignment worktree/branch when applicable
- question policy and unresolved human/team input requirements

Architecture Milestone M5 live proof is invoked through `trsd reconcile test-live`, not through hidden scheduling behavior in `trsd capacity`. The proof creates diagnostic assignments and mode runs tagged with the live-test run id, so operators can inspect them with the existing assignment and mode-run commands after local or hosted acceptance. M4/M5 are roadmap milestones, not completion-plan phase numbers.

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
- distinct allowed read and write path scopes
- durable status, issued/expiry/revocation timestamps
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
- Extracted capacity route modules remain part of the canonical descriptor and acceptance registry. Every public `MarketClient` capacity method must resolve to one active descriptor-backed API route; helper-generated or otherwise descriptor-invisible routes are not acceptable operator parity.
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
