# Agent Capacity Operator Surfaces

**Status:** Canonical Admin and CLI surface reference for activity-profile capacity runtime inspection
**Last updated:** 2026-08-03
**Audience:** Admin, CLI, SDK/API, and agent runtime implementers

> Completion authority: [Agent Capacity Completion and Production-Readiness Plan](./agent-capacity-completion.md) defines the complete API/CLI/configuration parity target. Agent Lab browser work proceeds in bounded slices over service-proven API projections and does not assume scheduler or provider ownership.

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

The implemented `executionVisibility` projection is the shared SDK-owned operator view for those fields. Admin and CLI use it to render selected execution provider kind or id, adapter status, external refs, artifacts, usage, required/available/alias/missing capabilities, selected provider, selected execution provider, and reason codes from existing assignment, explanation, and mode-run records. Full capability drill-down remains in assignment explanation records.

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

### Agent Lab monitoring foundation

`/app/work` is the team Agent Lab and remains inside the authenticated Product Shell and Command mode. Its first browser slice is deliberately monitoring-only:

- API owns the revisioned operating-day overview, activity delta, metric-series delta, and typed entity-summary projections.
- SDK owns the portable projection and account-preference contracts.
- UI owns the compact status bar, nine-metric rail, monitor toggles, responsive chart dock, Agent Activity Gantt, metric-history chart, entity cards, filters, and one non-overlapping polling coordinator.
- Admin owns authenticated server snapshots, active-team authorization, metric destinations, route composition, and Agent Lab terminology.

Real-time cadence is an account preference with enabled/off and 2, 5, 15, or 30 second base intervals. Off means server-rendered snapshot only. Polling pauses while hidden or offline, uses ETags and opaque cursors, applies durable keyed changes without page replacement, and preserves focus, scroll, filters, dialogs, and chart state. Closed charts do not request their heavier projections. The activity chart groups project and agent identity while reserving one stable lane for each activity profile.

The same monitoring header appears on the Agent Lab root, workday detail, agents, workdays, events, assignments, executions, and artifacts routes. These initial collection routes are intentionally card-based shells; specialized entity dialogs and authoring/governance operations remain later slices.

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

The execution-visibility work extends existing inspection commands without adding scheduler commands:

- `trsd capacity assignments --json` includes `executionVisibility` on each assignment record.
- `trsd capacity mode-runs --json` includes `executionVisibility` on each mode-run record.
- Execution-run and workday-log reads are forensic operations: an assignment, execution-run, or mode-run API/storage failure is surfaced as command failure and must never be rendered as an empty successful trace.
- Workday maintenance is operations-runner owned and fail-visible. Assignment/workday read endpoints never run hidden terminalization, and a settlement or lifecycle storage failure must surface rather than appear as a successful zero-change recovery. Operators inspect the still-recoverable assignment, lifecycle code, settlement ledger, mode run, and stable fallback record through the existing bounded commands.
- Expired leases are classified by the API recovery owner, not overwritten during leasing. Safe retries preserve their reservation; exhausted attempts settle and fail; proven completions close; uncertain settlement or side-effect evidence remains visibly expired for operator action. A terminal assignment cannot be requeued while its original reservation remains financially unresolved.
- Assignment inspection and provider polling consume the same typed assignment repository contract. Corrupt durable assignment JSON/mode/version and invalid lease duration are explicit API/CLI failures; operator surfaces must not render them as an empty queue, a planning default, or a successful no-op.
- Admission, grant, and replay inspection share one strict durable-JSON contract. Malformed allocation, grant, workday, session, class, reservation, or assignment evidence is reported with its owner/id/column and never displayed as empty/default policy.
- API and CLI capacity mutations share the API's strict request-object contract. Malformed JSON and null, array, or primitive roots return a stable 400 and never invoke a default mutation; only routes that explicitly declare an optional body accept an empty body.
- Operator task execution is inspected through provider assignments, mode runs, execution runs, usage, and ledger evidence. Retired project-runner task routes and task/event/output records are not compatibility surfaces and must not be recreated in CLI or API clients.
- Provider coordination is inspected through availability sessions, assignment leases, provider-manager status, mode runs, and usage. Retired project-runner manager leases, worker runners, repository claims, runner scale decisions, agent pools, pool registrations, and worker-pool scalers are not operator surfaces and must not be recreated. The operations runner owns no repository checkout.
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
- planning/acting reservation id plus requested, reserved, active, elapsed, released, and overrun agent time
- input, cached-input, reasoning, and output tokens; cost and provider-native quota remain separate dimensions
- TreeDX content models and tool ids exposed to the run
- branch policy and assignment worktree/branch when applicable
- question policy and unresolved human/team input requirements

Starter/workday forensic views should additionally correlate:

- the disposable API project with its independent repository identity, TreeDX repository id, and immutable selected ref
- assignment `modeRunId` with the canonical lifecycle row, while displaying provider phase/message events separately
- engineering graph node, predecessor manifest ids, base/effective/final-checkpoint refs, verification receipts, and review/revision policy
- research workflow stage, canonical question ref, effective source domains, authenticated citation/claim/review receipts and attempt history, current revision count and maximum, latest rejection reason, reopened or limit-blocked state, publication, and report refs
- reservation, dimensional usage, aggregate terminal usage, ledger settlement, handle revocation, and cleanup status

Architecture Milestone M5 live proof is invoked through `trsd reconcile test-live`, not through hidden scheduling behavior in `trsd capacity`. The proof creates real governed assignments and mode runs tagged with the live-test run id, so operators can inspect them with the existing assignment and mode-run commands during the isolated run. M4/M5 are roadmap milestones, not completion-plan phase numbers.

Local acceptance is not a mock smoke test. It selects the reconciled independent engineering and research starter repositories, creates isolated project/governance scopes, runs real Codex through manager/runner/kernel, and validates durable workflow and financial evidence. Before a local guarantee run, the CLI reconciles the managed web/API source closures as well as endpoint health; a healthy endpoint backed by an older source digest is restarted and cannot certify the gate. Cleanup must cancel or terminalize the workday before removing assignments and project state; `completed`, `cancelled`, `failed`, and `degraded` are terminal run states. Because project deletion is an asynchronous aggregate operation, isolated-team cleanup waits on the authoritative team-deletion-blocker read before deleting the team and reports exact persistent blocker identities. A passing cleanup reports zero isolated-resource drift.

Artifact inspection follows manifest provenance rather than privileged tool names: every displayed content reference correlates its `receiptId` and `toolEventId` to a completed `content_created` event, while one completed `content_committed` event and exact TreeDX read-back authenticate the assignment commit. Model-aware creates and scoped raw TreeDX writes are equivalent only when those receipts and assignment scopes agree.

The production manager and runner are concurrent roles: the manager keeps short-lived availability authority fresh while runners execute. The synchronous acceptance executor preserves that invariant with an exact-session refresh-only heartbeat. It does not keep the scheduling manager alive after the requested dispatch is selected, so the heartbeat cannot claim the next graph node.

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

## Discussion And Platform Manager Surfaces

`trsd run [seed...]` is the local platform manager: it validates one conflict-checked exact seed set, invokes configuration when required, converges the full local topology, verifies readiness, installs login/reboot supervision, and returns detached unless `--foreground` is selected. `trsd config` may create a new immutable generation while the platform runs and waits for the supervisor result. `trsd platform status|logs|stop` owns inspection and shutdown. The supervisor observes the tracked branch with polling recovery, accepts only clean fast-forward convergence, drains dispatch through the local reconciler, and reports dirty/diverged/unavailable state as blocked drift.

The authenticated shell exposes a non-overlapping Discussion dock beside Feedback. It loads sessions, messages, and assignment history from TreeDX, supports topic/agent/file search, reusable Markdown editing and preview, file refs, mentioned-agent dispatch, resizable composition, terminal status, and time/token/cost/native meters. Discuss, Propose, and Act communicate different governance intent; the UI never bypasses API readiness or allocation checks.

## Transition From Acceptance To Supervised Internal Development

The first production use of the local Codex capacity provider is supervised development of the independently versioned Market and package projects. Starter acceptance is a prerequisite, not authority to start portfolio work. The transition begins only after the local production gate in the completion plan passes. Hosted-production readiness may remain blocked while hosted deployment is suspended, but local development must retain the same admission, execution, evidence, settlement, and cleanup contracts.

Before the first real workday, operators must establish durable non-acceptance state through canonical API/CLI operations:

1. Join the local provider to the TreeSeed team, approve the membership, exchange the one-time credential, and persist the resulting connection in Provider Manifest V2. Acceptance-created memberships, sessions, grants, allocations, and projects are disposable and must never be reused.
2. Reconcile the Market and eight first-party package projects, their independent repository identities, exact local materializations, TreeDX repositories, and project-library bindings. A package assignment operates on that package repository and exact ref; the Market checkout is orchestration context, not a substitute repository.
3. Synchronize project agent classes from each project's TreeDX-backed MDX agent definitions and inspect the resulting activity profiles, tool policies, output contracts, path scopes, and planning/acting modes.
4. Create team-owned project grants and one active versioned allocation set covering only the initially selected projects. Start with explicit hard caps, no borrowing, one global runner, and one concurrent assignment per project.
5. Keep planning broadly available but acting fail-closed. Acting requires an approved decision, accepted estimate, accepted/scheduled/active capacity plan, immutable exact-ref provenance, and an authorized acting activity profile.
6. Confirm Codex readiness, provider/session availability, operations-runner health, TreeDX health, repository cleanliness/materialization, and the relevant package's standalone test commands before admitting work.

Rollout is evidence-gated:

- **Stage A — shadow planning:** run one short, budget-bounded planning-only workday against one low-risk package. Agents may create questions, proposals, estimates, linked notes, reviews, and a report, but may not mutate implementation files. Humans compare the output with the repository and reject low-quality or ungrounded work.
- **Stage B — supervised acting canary:** approve one small decision in one package with narrow source/test paths and explicit acceptance behavior. The internal Tester/Engineer/Reviewer loop may create isolated checkpoints, but cannot merge, push, stage, release, deploy, alter provider policy, or widen its own authority. A human/Codex supervisor reviews the exact diff, verification receipts, lineage, artifact manifest, usage, and settlement, runs `trsd capacity checkpoint-integrate --team <team-id> --assignment <assignment-id> --plan --json`, and only then may explicitly repeat with `--execute`. The command consumes the API-selected manifest and repository topology, accepts only the latest reviewed checkpoint on a clean exact-base task branch, and stops before publication. The supervisor independently verifies the package and invokes `trsd save`; stage/release remain separate and hosted release stays unavailable during deployment suspension. The package canary and replay evidence remain a gate before broader acting is enabled.
- **Stage C — repeated single-project workdays:** require several consecutive clean canaries, including rejection/revision, interruption recovery, replay, no orphaned leases/reservations/workspaces, and package-standalone verification. Increase duration or budget only after reviewing measured usage and output quality.
- **Stage D — bounded multi-project work:** enable two global runner slots only after the real two-project concurrency acceptance proves overlapping leases, one shared allocation with independent project slices, project/worktree/TreeDX isolation, per-project settlement, failure isolation, and zero-residue cleanup. Select projects without overlapping repository or dependency mutation for the first parallel runs.
- **Stage E — supervised daily portfolio operation:** schedule planning across the portfolio, curate proposals and questions into an approved queue, admit bounded acting work from that queue, and review a daily forensic report. Releases and hosted deployment remain human-controlled `trsd` operations even after implementation autonomy expands.

The supervisor is an operator, not another scheduler. The supervisor reviews and prioritizes Knowledge Hub content, approves or rejects decisions and overruns, selects project/budget/concurrency envelopes, observes workday and assignment evidence, stops degraded runs, and invokes governed integration commands. The API assignment function and provider manager remain the only scheduling and dispatch owners.

Initial stop conditions are intentionally strict: any cross-project write, unlinked content, missing tool/verification/checkpoint receipt, unsupported research claim, stale or divergent ref, unexplained provider retry, uncertain settlement, orphaned workspace, budget overrun, package-boundary violation, or failed standalone package gate halts new acting admission until the evidence is reviewed and the owning defect is corrected.

The minimum daily evidence bundle contains the workday report, selected/blocked demand, assignment explanations, mode runs, exact refs and checkpoints, TreeDX content references, verification and review receipts, usage actuals, ledger entries, retries/recovery actions, unresolved questions, and explicit human approvals. A successful assignment is not automatically an accepted code change.

The two-project production gate is not implemented by launching two independent provider processes or two same-provider local workday runs. Acceptance runs this gate before the serial baselines, provisions both projects as independently governed envelopes in one portfolio workday, opens one two-slot availability session, activates one allocation with two independent project slices, and lets the provider manager claim two assignments before the runner pool executes them concurrently. Evidence must show two projects, two assignments, two runners, two TreeDX workspaces, positive interval overlap, dimensional usage evidence, and exactly one aggregate actual and ledger settlement per assignment. The deterministic failure-concurrency workflow remains paired with this real overlap evidence.

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

API endpoint reliability is represented by endpoint-family guarantees backed by route descriptor matrices. UI/Admin guarantees should depend on API endpoint guarantees through `dependsOnGuarantees` instead of duplicating endpoint proof. Agent guarantee output must identify the selected real-provider mode (`live-codex` or `auto`) and whether local dev/acceptance seed preflight was used. `auto` fails closed when real provider authentication is unavailable.

Root capacity guarantees follow the same composition rule. The lifecycle guarantee owns the expensive real-provider workday; parity depends on that guarantee and owns only API/SDK/CLI/configuration contract checks. A full capacity or release run executes the lifecycle once and reuses its verifier result within the run. A focused parity correction may use `--no-dependencies` only when an admissible lifecycle report from the same source state is already preserved and cited. Workday `durationSeconds` and guarantee timeouts are hard ceilings, not minimum runtimes: acceptance exits as soon as its required graphs, settlement, and cleanup finish. Shortening the ceiling therefore does not accelerate a healthy graph; smaller focused guarantees and dependency-based verifier reuse do.
