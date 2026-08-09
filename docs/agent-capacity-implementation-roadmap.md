# Agent Capacity Implementation Roadmap

**Status:** Canonical architecture roadmap; architecture milestones M1-M5, activity profiles, and reservation-backed planning implemented. Milestone numbers are historical architecture groupings, not production-completion phase numbers.
**Last updated:** 2026-07-21
**Audience:** Treeseed SDK, API, agent runtime, provider runtime, Admin, CLI, and package maintainers

> Completion authority: [Agent Capacity Completion and Production-Readiness Plan](./agent-capacity-completion.md) records the audited gaps, replacement architecture, phase status, and evidence required before this roadmap can be described as production-ready. Where an older implemented-status statement conflicts with that document, the completion plan controls.

This roadmap turns the two-mode agent kernel plan and the provider coordination architecture into five architecture milestones. It is the canonical entry point for the architecture shape. Production work order, status, and completion gates are owned only by `docs/agent-capacity-completion.md` phases 0-14.

Related architecture:

- [Agent Kernel Capacity Plan](./agent_kernel_capacity_plan.md)
- [Capacity Provider Agent Coordination Architecture](./capacity_provider_agent_coordination_architecture.md)
- [Agent Capacity Domain Model](./agent-capacity-domain-model.md)
- [Agent Kernel Mode Runtime](./agent-kernel-mode-runtime.md)
- [Human-Machine Execution Providers](./human-machine-providers.md)
- [Agent Capacity Operator Surfaces](./agent-capacity-operator-surfaces.md)
- [Package Ownership](./package-ownership.md)

## Ownership Model

The implementation boundary is:

- `@treeseed/agent` owns the provider runtime, provider manager, provider runner, sole-entrypoint AgentKernel execution, activity-profile resolution, fallback behavior, runtime images, runtime tests, and provider-local lifecycle behavior.
- `@treeseed/sdk` owns portable contracts, domain types, reconciliation contracts, package discovery, config, and provider-neutral helper logic.
- `@treeseed/api` owns durable control-plane state, API routes, request-scoped demand compilation, the assignment function, provider sessions, leases, reservations, usage settlement, decision readiness records, governed workday scheduling, exact run-owned workday envelopes, scheduling-failure recovery, and TreeDX proxy authorization.
- `@treeseed/admin` owns browser operator surfaces over API contracts.
- `@treeseed/cli` owns operator commands over SDK/API/agent public surfaces.
- `@treeseed/core` owns web runtime composition. It does not own provider scheduling, AgentKernel execution, or capacity assignment logic.
- `packages/treedx` remains product-neutral. Treeseed maps project and capacity semantics outside TreeDX.

Human-machine execution provider work follows the same ownership model. `@treeseed/agent` owns executable adapter interfaces and provider-local runtime behavior; `@treeseed/sdk` owns portable DTOs and pure matching helpers; `@treeseed/api` owns assignment selection and durable lifecycle records. See [Human-Machine Execution Providers](./human-machine-providers.md).

## Production Acceptance Project Model

Capacity acceptance tests projects as projects, not as folders in the Market integration checkout. The active first-party fixtures are the independently versioned Git repositories checked out at `starters/engineering` and `starters/research`. Reconciliation publishes each repository into its own TreeDX repository (`treeseed-starter-engineering` or `treeseed-starter-research`) at an immutable commit.

For every live starter run, the verifier:

1. selects one of those explicit starter repositories and resolves its immutable Git/TreeDX ref;
2. creates an isolated, disposable API project under the acceptance team with the starter's logical repository architecture;
3. attaches that project to the corresponding reconciled TreeDX repository;
4. reads the project's MDX agent definitions through TreeDX and synchronizes project-scoped agent classes;
5. creates only run-scoped grant, allocation, workday, workflow, reservation, assignment, and workspace state; and
6. deletes the disposable API project and terminalizes all run state during cleanup.

The verifier does not initialize a fake repository per run and does not treat the Market root as the starter repository. Engineering mutation runs use a fresh provider-owned checkout materialized from the provider's own mirror and must prove the assignment's exact immutable base/effective ref. The provider may inspect its read-only source installation but cannot fall back to or mutate the Market developer checkout. Research content runs mutate only the assignment's independently cloned TreeDX workspace and commit through the project proxy.

## Current Agent Architecture

The current runtime uses activity-profile frontmatter on Astro content model agent definitions. Root Market agents live under `src/content/agents/`; package agents live under `docs/src/content/agents/`. The standard first-party agent set is currently:

- `architect`
- `technical-writer`
- `tester`
- `engineer`
- `researcher`
- `reviewer`
- `releaser`
- `reporter`

Agent slugs are not project-prefixed because the content path and project scope provide identity. The same agent templates are used across the root Market project and first-party package projects until project-specific variants are intentionally introduced.

Each agent definition owns activity profiles for some or all of:

- `planning`
- `estimating`
- `acting`
- `reviewing`
- `reporting`

Each profile may define prompt text, handler, TreeDX content access, allowed tools, branch policy, question policy, execution requirements, and output contracts. The clean handler set is `writer`, `actor`, `estimate`, `releaser`, and `reporter`. Removed handler names such as `plan`, `research`, `act`, `review`, and `report` are not runtime handler ids.

There is no planner agent. Planning exists in two places only:

- API-side deterministic assignment planning, based on accepted estimates, readiness, the effective immutable allocation set, and decision assignment graphs.
- Agent-local activity planning inside each bounded run, where the selected agent uses its activity profile to inspect inputs, ask TreeDX questions, create notes/proposals/estimates, or execute assigned work.

Estimating is a separate handler/activity path. It produces structured estimates and dependency/dependency-deliverable declarations that the API can compile into decision assignment graphs without open-ended AI scheduling.

## Architecture Milestone M1: Contracts And Durable Records

Status: implemented as the contracts-and-persistence foundation. The current implementation adds the SDK contract surface and durable API records used by the assignment-only provider runtime.

Goal: create the shared language and persistence substrate before changing runtime behavior.

Implemented boundaries:

- SDK-owned contracts are exported from `@treeseed/sdk/agent-capacity` for allocation sets, project agent classes, agent kernel policy/profile, capacity envelopes, decision execution input, capacity plans, provider availability sessions, provider assignments, mode runs, and usage settlement.
- Historical migration `0005_agent_capacity_coordination.sql` and every later additive capacity migration have been deleted. The sole current migration contract is the regenerated clean-reset `0000_market_control_plane.sql` baseline.
- API route descriptors and `MarketClient` methods cover allocation sets, project agent classes, provider sessions, assignments, and mode runs.
- Legacy provider task-claim protocol compatibility has been removed from the provider runtime contract. Provider execution is coordinated through provider sessions and assignment lifecycle APIs only.
- Conversion helpers define boundaries from existing `CapacityProvider`, `CapacityGrant`, current `CapacityPlan`, reservations, and usage actuals into the new domain model.
- Fixture coverage creates one team, two projects, two project agent classes, one local provider, one OpenAI-like execution provider, one planning assignment, one acting assignment, and linked mode-run usage telemetry.

Acceptance criteria:

- SDK exports the new types from canonical paths without importing agent runtime code.
- API can persist and read allocation sets, provider sessions, assignments, and mode runs.
- Existing capacity provider tests still pass while the new records are present.

Completed by later phases and gap closure:

- Architecture Milestone M2 implemented provider next-assignment polling, lease renewal, return, complete, and fail semantics.
- Architecture Milestone M3 implemented AgentKernel mode execution and bounded fallback behavior.
- Gap closure added decision readiness, planning input requests, accepted execution inputs, durable capacity plans, workday envelopes, durable demand/participation records, one request-scoped compiler and assignment function, assignment-owned explanations, pre-admission capacity audit evidence, TreeDX proxy audit/handles, fallback outputs, and settlement summaries.

## Architecture Milestone M2: Provider Availability And Assignment Lifecycle

Status: implemented as a membership-scoped availability-session and assignment-lease lifecycle. Availability snapshots record supply facts, and provider runners poll `ProviderAssignment` records through outbound API calls. Bounded synthesis creates assignments from API-owned workday/readiness/planning records and rejects ineligible assignments at both synthesis and lease time.

Goal: move coordination from task claiming toward provider-initiated availability sessions and leased assignments.

Implemented boundaries:

- Availability-session create/refresh/close routes record availability, execution providers, native limits, capabilities, runner pressure, and provider-local constraints. Provider-asserted grants are not accepted.
- Provider synthesis resolves one exact membership-scoped open session through a typed fail-closed service. It requires approved membership and active provider authority, validates time/environment scope, rejects substitution of an unknown explicit session, and propagates storage failure. Lease-time policy remains solely owned by the canonical lease-authority service.
- Provider next-assignment route leases eligible `ProviderAssignment` records and first performs bounded request-scoped synthesis from active live workdays, open planning input requests, and accepted capacity-plan work units.
- Availability refresh and assignment terminal transitions do not enqueue synthesis. Authenticated next-assignment polling is the single trigger, so failures remain request-visible and cannot disappear with an in-memory timer queue.
- One typed admission service owns the synthesis-to-admission transaction boundary. Typed planning/capacity-plan synthesis strictly decodes persisted JSON, propagates reads, and records denied pre-admission candidates in `capacity_audit_events`; assignment explanations are written only after admission.
- Admission state, grants, and committed replay use one strict durable-JSON primitive for allocation, grant, workday, session, class, reservation, and assignment evidence. Malformed required state fails with a stable control-plane error instead of becoming empty/default policy.
- Capacity mutation input uses one strict request-object primitive across extracted routes and remaining inline agent/capacity composition routes. Optional empty bodies remain explicit, while malformed JSON and null, array, or primitive roots fail with stable 400 codes before service or persistence work; catch-and-default request parsing is forbidden.
- The typed workday demand compiler owns active-run selection, project selection, TreeDX/source resolution, and durable participation-cycle demand. A separate assignment function owns durable demand claim, canonical admission, and recoverable post-admission workspace provisioning. Both reject corrupt durable state, missing or ambiguous projects, source uncertainty, and explicit processing-bound overflow instead of truncating or returning empty success.
- One pre-admission project-context compiler serves direct and synthesized assignments. It requires the durable project and owning team and propagates architecture/repository read failure rather than fabricating fallback runtime context.
- Deterministic TreeDX workspace preparation validates its brokered inputs, streams a bounded response, strictly decodes the upstream envelope, and requires the assignment-derived workspace id. Oversized, malformed, failed, or mismatched responses are explicit synthesis failures.
- Assignment list/get persistence and strict row serialization are owned by one typed repository. Next-assignment validation, bounded ordering, diagnostics, and lease CAS are owned by one typed service that invokes the sole lease-authority evaluator; corrupt persisted state and invalid lease duration fail before authorization or mutation.
- The shared assignment eligibility function requires an active provider, approved membership, an open membership session inside its availability window, an API-owned active matching grant, required capabilities, active workday state, accepted/scheduled/active capacity-plan provenance for acting, ready or waived readiness for acting, and available runner concurrency.
- Lease-renewal, return, complete, and fail routes delegate to one typed lifecycle service that updates `ProviderAssignment` state with runner id, lease token, lifecycle reason/code, output summary, and ledger settlement. All four require current membership/provider ownership, token, unexpired lease, and state-version CAS; completion requires consumed reservation state and terminal fail settles before transition.
- Successful settlement is the runner-local terminal renewal boundary: informational usage is reported first, timer/execution renewal authority closes before settlement consumes the reservation, and workspace close plus assignment completion follow. Detached renewal rejection after that boundary is suppressed, while the API continues to deny renewals against consumed reservations.
- Explicit workday closure, deadline maintenance, terminal-run recovery, and local-workday supersession share one typed settlement-before-transition terminalizer. The former provider-scoped expiry and supersede mutation paths are deleted; maintenance failures remain visible, state transitions use assignment-version CAS, and read endpoints do not run hidden recovery mutations.
- Exactly-once reservation settlement is the only task-usage writer. The unused direct writer and its fail-open fixed-window execution-provider scan are deleted; one typed repository owns strict bounded usage evidence reads for summaries, diagnostics, and learning inputs.
- Workday demand compilation and assignment selection are no longer embedded in the untyped store or split by source. Every capacity domain now uses the focused demand, participation, admission, audit, workday/assignment repositories, lease-authority, lifecycle, settlement, fallback-evidence, and terminalization primitives; static architecture gates reject a return to composition-file ownership.
- The provider runner in `@treeseed/agent` is assignment-only. Legacy provider task HTTP routes and provider-client task methods have been removed.
- Provider runners consume scoped project-agent assignment context and emit mode-run telemetry through the assignment route.
- Provider images run provider manager and provider runner roles only. The retired provider-local API role is not part of the deployment service role set; provider coordination is outbound to the TreeSeed API.
- Workday scheduling consumes pre-existing active allocations, planning grants, and TreeDX bindings. It cannot synthesize temporary policy or rewrite project configuration; failed scheduling persists failed-run evidence and closes any partial envelopes.
- Governed schedules persist an indexed exact workday-run foreign key on every envelope. Typed recovery closes only those exact envelopes in bounded batches, attempts required envelope/event/run evidence independently after partial failure, and fails visibly when any recovery postcondition remains uncertain; id prefixes are not ownership contracts.
- Local TreeDX seed reconciliation commits the desired MD/MDX seed set to each project's declared canonical ref; disposable synchronization branches are not valid readiness evidence. Provider runners read agent definitions only through the assignment-scoped proxy. Project-specific handler code, when required, is discovered only from `src/agent-handlers/` so ordinary agent runtime modules cannot be mistaken for handler extensions.

Acceptance criteria:

- A local provider can create and refresh availability from an outbound-only environment.
- The API can issue an assignment lease without calling the provider inbound.
- A provider runner can complete or return a leased assignment and report usage.

Completed by Architecture Milestone M3 and gap closure:

- Architecture Milestone M3 implemented AgentKernel-native planning/acting execution and fallback behavior.
- Gap closure added deterministic synthesis from open planning input requests and accepted capacity-plan work units. Accepted decision execution inputs must first be aggregated into a durable capacity plan and accepted before acting assignments are synthesized. The newest accepted, scheduled, or active plan owns decision readiness; an inactive transition of an older plan cannot overwrite a newer active plan, and readiness becomes blocked when no active plan remains. Synthesis from legacy task queues and long-running scheduler daemons remains out of scope.
- Project-scoped TreeDX proxy handles attached to synthesized assignments are recorded atomically as API-owned durable handle records by admission. The embedded assignment copy is provider execution context only and is never an authorization fallback. Membership access-token TreeDX proxy calls require a matching active assignment lease and authoritative durable proxy handle id on every request; the shared SDK policy enforces repository, workspace, operation, distinct read/write path, expiry, and revocation constraints where present. Successful and denied provider proxy calls are recorded as project-visible audit rows without exposing raw TreeDX credentials.

## Architecture Milestone M3: Agent Kernel Mode Runtime

Status: implemented as a bounded assignment execution layer in `@treeseed/agent`. Provider assignments now execute through `AgentKernel.runAssignment`, and the provider runner no longer adapts assignment work into the legacy task execution path.

Goal: make planning and acting capacity first-class runtime modes.

Implemented boundaries:

- SDK exports M3 kernel-mode contracts and pure helpers from `@treeseed/sdk/agent-capacity`, including assignment-to-envelope conversion, assignment-to-decision-input conversion, mode validation, and bounded fallback helpers.
- `AgentContext` carries optional assignment capacity context for provider-assigned work: selected mode, capacity envelope, decision input, project agent class/profile/policy, assignment id, provider id, readiness, and TreeDX proxy handle metadata.
- `AgentContext.treeDx` exposes a first-class assignment-scoped TreeDX adapter when a provider assignment carries a valid proxy handle. The adapter applies handle defaults and rejects out-of-scope repository, workspace, operation, and path requests before calling the API. Handlers use it for context build, repository file readback, workspace search, workspace file mutation, and commit operations instead of receiving raw TreeDX credentials.
- `AgentKernel.runAssignment` validates mode, lease, class/profile bounds, envelope scope, reserved acting capacity, decision-input scope, acting readiness, accepted capacity-plan provenance for acting, assignment capability eligibility metadata, TreeDX proxy handle scope, retry policy, and explicit output contracts before resolving or accepting a project-owned handler result.
- `@treeseed/agent` exposes one thin `AgentKernel.runAssignment` coordinator over focused preflight, activity-profile resolution, context loading, tool policy, execution dispatch, output validation, artifact-manifest, telemetry, and failure-classification modules. The deleted mode scheduler, queue observer, and priority resolver are not public or production paths.
- The provider runner executes leased assignments through `AgentKernel.runAssignment` and delivers mode-run telemetry through one bounded required-delivery primitive. Each logical phase uses a stable assignment/event identity, buffered messages remain pending until acknowledged, and exhausted delivery safely returns or fails the lease with explicit diagnostics.
- API mode-run persistence permits same-assignment replay, rejects cross-assignment identity reuse, atomically links matching usage, and records running and terminal attempts with selected input, capacity envelope, validation/fallback detail, and lower-level `AgentRunTrace` references when handler execution reaches the trace path.
- Invalid or unsupported assignments are bounded and observable. Retryable runtime gaps can be returned when the provider client supports return semantics; non-retryable mode/profile violations fail without executing handlers.
- Legacy provider and project-runner task routes, clients, store methods, task tables, and operations-runner repository claims are intentionally absent. Provider availability sessions, assignments, and provider-manager telemetry own execution; TreeDX owns content repositories; `trsd` owns developer checkout workflows.
- Availability expiry remains a short liveness fence. The provider manager refreshes exact sessions while runners execute; acceptance must preserve that concurrency with a refresh-only heartbeat and must not replace it with a workday-long TTL or a background scheduler that can pre-lease later work.
- The package-local legacy worker runtime and codebase documentation scan task have been removed from the general-purpose agent runtime. Specialized agents may still implement repository inspection as assignment-scoped handler/tool capability.

Acceptance criteria:

- Planning and acting assignments are distinguishable in telemetry and usage.
- Handlers execute under a kernel-selected mode and cannot silently widen their allowed work.
- Fallback mode behavior is observable and bounded.

Still out of scope:

- Long-running scheduler daemons and synthesis from legacy task queues.
- Full optimization across all candidate demand queues and provider pressure.
- Product-specific fallback proposal drafting beyond durable fallback-output records and bounded kernel outcomes.
- Cross-queue assignment optimization remains a Phase 5 assignment-function concern; allocation admission and borrowing are already owned by the SDK evaluator and API transaction.

## Planning Allocation Runtime

Planning work is duration- and budget-bounded, not one-assignment-per-agent. The API-side assignment function is responsible for synthesizing repeated eligible planning assignments while a workday is open and planning capacity remains. Agent classes can carry planning allocation percentages; agents within the same class share that class allocation. Planning assignments are allowed to coordinate, ask and answer questions, create proposals, add estimates and feedback notes, and update agent-owned knowledge through scoped tools. Research is question-triggered agent work, not built-in deterministic question seeding.

Planning capacity is first-class. New planning assignments receive `capacity_reservations` with `mode: planning`, a planning reservation id, positive reserved agent-seconds, workday/allocation provenance, and hierarchical allocation explanation data. Requested time comes from an explicit override, profile timebox, comparable historical p90, or a conservative default. Active time settles through the same lifecycle as acting usage; elapsed time, tokens, cost, and provider-native quota remain separately inspectable dimensions. Acting assignments continue to require approved decision/readiness/capacity-plan provenance plus acting reservation capacity.

The API assignment function continuously considers both lanes during an active workday:

- required planning inputs, especially estimates and readiness analysis
- autonomous planning for eligible configured agents
- ready acting work units from accepted/scheduled/active capacity plans with explicit active work-graph-node provenance
- review/report work generated by assignment completion, blockage, or workday boundaries

Planning and acting are not separate global periods. They are budget lanes inside one workday envelope.

Engineering promotion is request-scoped and tick-driven. A schema-validated workday workflow entry identifies the project, approved decision, objective, immutable base commit, and project-owned role classes. Before compiling demand, the API waits for approval and a linked accepted estimate, then calls the canonical graph, planning-state, and capacity-plan owners idempotently. The coordinator does not lease work or duplicate assignment/admission logic; the existing demand compiler and assignment function remain the only path from a ready graph node to a reservation-backed assignment.

The immutable base commit is also an execution authority, not prompt metadata. Assignment admission carries it into TreeDX workspace provisioning and an exact-ref repository handle. The provider must resolve and prove that ref before workspace-write execution and may not branch from ambient provider `HEAD` or reuse a worktree with incompatible ancestry.

Tester and Engineer persist source evidence through the narrow SDK assignment-checkpoint operation, which commits only path-authorized changes locally. Terminal acting completion is the single deliverable projection point: it validates the artifact kind and assignment scope, applies stage-specific commit/verification/review evidence rules, records one idempotent deliverable manifest, and advances or revises the durable graph. The general `save`, push, merge, stage, release, deployment, and provider workflows are not agent checkpoint implementations.

That deliverable manifest is also the sole source-ref handoff record. It stores typed base/effective/checkpoint authority correlated to the completing assignment and mode run; approval selects the manifest id on the contract. Acting-demand compilation resolves a ready node from its completed predecessor manifests and requires one converged immutable effective commit before replacing the node's originally promoted base ref. The runner's exact-ref worktree check then proves ancestry. No scheduler, starter handler, or provider may infer an integration ref from ambient `HEAD`.

The operator-side handoff is now explicit rather than inferred. The API exposes the selected deliverable manifest as a project-authorized read; the CLI loads it with the assignment, graph, and repository topology and calls the SDK-owned checkpoint integration operation. Plan and execute are mutually exclusive and explicit. Execute is replay-safe only when the current task-branch tree already equals the selected checkpoint; any other divergence, dirty state, protected branch, repository mismatch, superseded implementation, failed evidence, or authority mismatch blocks. The handoff stops before `trsd save`, push, stage, release, or deployment.

Local release acceptance begins its real-provider starter section with a two-project gate so portfolio failures stop before the long baselines. One provider-bound workday creates independent engineering and research envelopes; one shared provider connection advertises exactly two Codex slots, one shared allocation contains separate project slices, and project grants remain independently capped at one. Two same-provider local workday runs would invoke the intentional successor contract and are not used to model project concurrency. The manager must lease both ready assignments, runners execute through AgentKernel concurrently, and terminal proof requires overlapping durable intervals plus isolated workspaces, artifacts, dimensional usage, exactly-once aggregate/ledger settlement, and cleanup. Existing one-slot ordering and deterministic failure/concurrency tests remain required rather than being replaced by the faster parallel case.

## Architecture Milestone M4: Admin And CLI Operator Surfaces

Status: Implemented as read-only operator visibility over capacity coordination records. Admin and CLI consume API/SDK surfaces; they do not schedule, synthesize, or lease work.

Goal: give operators enough visibility to trust allocation, assignment, and runtime behavior.

Implemented boundaries:

- Admin displays allocation-set versions, portfolio/project/agent-class allocation, planning/acting splits, provider sessions, assignment status, mode runs, usage, fallback outputs, TreeDX proxy audit rows, blockers, and drift between policy and actual usage.
- Agent Lab composes the API-owned Atlas projection into live portfolio and immutable historical replay views, with scoped durable events, assignment lineage, TreeDX authoring, and evidence-bound Discussion context.
- CLI exposes JSON-first commands for capacity plan inspection, provider status, session/assignment diagnostics, decision readiness, execution inputs, workday summaries, assignment explanations, fallback outputs, TreeDX proxy audits, local runtime proof, and mode-run inspection.
- UI and CLI must distinguish configuration, live observation, reconciler-backed lifecycle, and durable runtime records.
- Avoid making Admin or CLI own scheduling logic; both consume API/SDK contracts.

Acceptance criteria:

- Admin exposes `/app/capacity/runtime` with allocation-set versions, project agent classes, provider sessions, provider assignments, project mode-run telemetry, fallback outputs, and TreeDX proxy audit evidence.
- Admin exposes one reusable `/app/work` Atlas workspace in standard, compact-vitals, and research modes; no metric-dashboard or alternate Atlas implementation owns the homepage in parallel.
- CLI exposes `trsd capacity allocation-sets`, `agent-classes`, `availability-sessions`, `assignments`, `mode-runs`, `execution-runs`, `workday-log`, `decision-planning`, `execution-inputs`, `workday`, `workday-summary`, `assignment-explanation`, `fallback-outputs`, and `treedx-proxy-audit` as JSON-first read commands beside the existing lifecycle verbs. Forensic reads fail visibly on API or storage uncertainty rather than substituting an empty trace.
- A developer can debug local provider lifecycle from CLI and inspect API-owned coordination records without reading provider-local files directly.
- Allocation policy and actual usage can be compared by project, agent class, mode, provider, and execution provider as the API emits those records.
- Team/project capacity summaries use SDK-owned native accounting-window policy and API SQL aggregates. Fresh observations establish an observation boundary; configured limits require a supported reset cadence. Historical reservations remain auditable through paginated collections but are not loaded into summary responses or subtracted across reset windows.

Completed by Architecture Milestone M5 and gap closure:

- Architecture Milestone M5 implemented local capacity-runtime acceptance and retained hosted probe contracts. Hosted execution is not current completion evidence while deployment is suspended.
- Assignment explanation records now show why synthesized or explicit work was eligible, including readiness gates and source records.
- Mutating operator workflows for assignment repair beyond existing controlled API fixture creation.
- Native accounting-window aggregates, bounded diagnostic evidence, reset-rollover concurrency tests, and CLI/API visibility are implemented and service-proven under resolved CAP-053.

## Architecture Milestone M5: Reconciliation And Live Proof

Status: local live-test primitives exist inside the SDK reconciliation acceptance framework, but production acceptance is not complete. Hosted Railway/Cloudflare acceptance is blocked by the intentional deployment suspension and may not be claimed or run until the reviewed infrastructure rebuild restores it.

Goal: keep provider lifecycle exact-state and prove the runtime through local and hosted checks.

Implemented boundaries:

- Keep `trsd capacity build/up/status/logs/down/test-local` focused on provider runtime lifecycle and diagnostics.
- Reconcile provider registration, secrets, local Docker runtime, hosted runtime, images, health, and cleanup through SDK reconciliation.
- Do not reconcile provider sessions, assignments, leases, mode runs, or usage actuals as infrastructure resources. Those are API control-plane records.
- Infrastructure acceptance retains narrow provider-runtime probes, but production capacity proof is the real local engineering-plus-research starter sequence. It uses the public API, provider manager, provider runner, sole AgentKernel entrypoint, real Codex, TreeDX, isolated source worktrees, usage reporting, exactly-once settlement, and terminal cleanup.
- Every long starter boundary exchanges the durable membership credential for a fresh short-lived access token. Cleanup performs its own exchange before closing an availability session; a token captured during initial bootstrap is not lifecycle authority for a later starter.
- Engineering proof requires proposal and estimate planning, authenticated preparation artifacts, red test, implementation, passing verification, governed rejection/revision/reverification/approval, documentation, release-readiness output, reporting, exact-ref handoff, and settlement.
- Research proof requires the complete API-owned eleven-stage workflow, two authenticated independent-source fetch receipts, linked evidence notes, claim synthesis, rejection, semantic revision, independent approval, cited publication, reporting, and settlement. A legitimate post-revision rejection must durably preserve its reason and reopen revision below the typed `maxRevisionCycles` limit. The next Researcher assignment must revise claim wording to fit the authenticated evidence. Rejection at the limit blocks the workflow rather than issuing unbounded work; publication remains blocked until approval.
- Real-workday duration and guarantee timeout values are outer failure bounds, not delays. Verification terminates when the required workflow and cleanup postconditions complete. Expensive lifecycle evidence belongs to the lifecycle guarantee and is dependency-reused by focused parity checks, so contract-only corrections do not require another full workday when an admissible source-matched lifecycle report already exists.
- Terminal verification authenticates the assignment's canonical mode run and artifact manifest; every returned content reference must name its receipt and the completed manifest tool-event id that emitted `content_created`, independent of whether the project used a model-aware create tool or a scoped TreeDX write; the manifest must also contain an authenticated `content_committed` event and exact TreeDX path/ref/SHA read-back. Revoked handles, one consumed reservation, one aggregate usage actual, and one ledger settlement remain mandatory.
- Runtime records remain forensic API evidence while their isolated project exists. Cleanup cancels or terminalizes the API-owned workday first, closes the session, revokes the grant, requests deletion of every isolated project, waits for each asynchronous project aggregate, then waits for the authoritative team-deletion-blocker read to become empty before deleting the team. Persistent blockers are reported by exact code and identity. `completed`, `cancelled`, `failed`, and `degraded` are terminal run states; cleanup must finish with no isolated resource drift.
- Hosted acceptance remains specified but disabled: after reviewed OpenTofu deployment automation is restored, run cleanup before and after full Railway acceptance. Until then CAP-024 remains fail-closed and local proof must not dispatch or impersonate hosted deployment.

Hosted acceptance configuration (local acceptance discovers or creates its isolated scope through public APIs):

- `TREESEED_CAPACITY_ACCEPTANCE_API_URL`
- `TREESEED_CAPACITY_ACCEPTANCE_ADMIN_TOKEN`
- `TREESEED_CAPACITY_ACCEPTANCE_TEAM_ID`
- `TREESEED_CAPACITY_ACCEPTANCE_PROJECT_ID`
- `TREESEED_CAPACITY_ACCEPTANCE_PROVIDER_ID`
- `TREESEED_CAPACITY_ACCEPTANCE_AGENT_CLASS_ID`
- `TREESEED_CAPACITY_PROVIDER_MANIFEST`
- provider identity and membership credential secret references named by that manifest

Acceptance criteria:

- Provider infrastructure reports `ok: true` only after live postconditions pass.
- Runtime assignment proof is separate from infrastructure convergence but can be invoked by the capacity provider acceptance suite.
- Cleanup leaves no undeclared Treeseed-owned provider resources.

## Documentation Requirements

Architecture-changing capacity work is not complete until the relevant canonical docs are updated:

- Domain or contract changes update [Agent Capacity Domain Model](./agent-capacity-domain-model.md).
- Provider runtime/protocol changes update [Capacity Provider Runtime](../packages/agent/docs/capacity-provider-runtime.md).
- Kernel mode behavior changes update [Agent Kernel Mode Runtime](./agent-kernel-mode-runtime.md).
- Admin or CLI surface changes update [Agent Capacity Operator Surfaces](./agent-capacity-operator-surfaces.md).
- Package boundary changes update [Package Ownership](./package-ownership.md) and [AGENTS.md](../AGENTS.md).

## Discussion And Internal-Development Foundation

The next local milestone moves the development control loop behind the running platform. `trsd config` owns validated immutable desired generations; `trsd run [seed...]` owns the exact local seed graph, complete runtime reconciliation, readiness, detached supervision, and tracked-branch convergence. `trsd platform status|logs|stop` owns inspection and shutdown. Configuration candidates that fail validation restore the prior machine configuration, and a live supervisor records whether the pending generation converged.

Discussion sessions, messages, and append-only execution events are Astro content models in project Git and are read or committed only through TreeDX. PostgreSQL stores generic workday, assignment, lease, mode-run, reservation, usage, and settlement records plus opaque Discussion references needed to project their lifecycle into TreeDX. Mentioned agents are admitted from one committed snapshot through their explicit `chat` profiles. Discuss and Propose stay in planning authority; Act additionally requires approved decision readiness and accepted capacity-plan provenance.

Capacity-budget v2 is required at admission for every activity profile. A single hard deadline is frozen before dispatch and lease renewal cannot extend it. Time, aggregate token ceilings with input/cached/reasoning/output actuals, cost/currency, native units, concurrency, and attempts remain independent dimensions. Completion releases unused claims exactly once. Calibration may recommend p50/p90 time, token, and cost estimates by task signature and provider/model, but it cannot widen team hard limits.

## Current Starter And Guarantee Gates

The active first-party starters are `engineering` and `research`. The former `information-hub` starter is folded into `research` until knowledge-pack packaging has distinct deterministic workflow semantics.

Release-grade capacity and agent work must prove:

- API endpoint-family guarantees backed by complete route descriptor matrices.
- Agent execution-provider guarantees that fail closed unless a real provider is available, with live Codex proof for the current built-in autonomous runtime.
- Live Codex agent guarantees for local/staging when Codex auth is present.
- Managed local source-closure reconciliation, server readiness, and acceptance seed before local guarantee runs. Endpoint health alone cannot reuse an API or operations runner whose started source digest is stale.
