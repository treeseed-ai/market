# Agent Capacity Domain Model

## Seeded local provider policy

An environment-scoped seed capacity prerequisite names a team, a portable provider manifest, selected execution providers, allowed modes, and project resource keys. Reconciliation resolves those keys to durable API identities, keeps credentials in managed provider storage, and materializes a runtime-only connection overlay. The TreeSeed local portfolio uses one approved signed provider membership, one planning-and-acting grant per first-party project, and one shared allocation in which every project has zero minimum, an equal target share, and a 100 percent maximum and hard ceiling. Acting admission still requires approved decisions, readiness, and accepted capacity-plan provenance.

**Status:** Canonical domain model for activity-profile capacity execution
**Last updated:** 2026-07-21
**Audience:** SDK, API, agent runtime, Admin, CLI, and integration implementers

> Completion authority: [Agent Capacity Completion and Production-Readiness Plan](./agent-capacity-completion.md) defines the global provider identity, provider/team membership, broadcast registration key, strict allocation v2, and verified clean-reset implementation described below.

This document defines the shared implementation vocabulary for Treeseed agent capacity. It describes the model that SDK contracts, API records, agent runtime inputs, Admin views, and CLI reports should converge on.

The canonical contract surface is exported from `@treeseed/sdk/agent-capacity`. Durable coordination records are stored by `@treeseed/api` against the SDK-owned Drizzle schema. Every historical additive capacity migration has been deleted. The only Market schema artifact is the regenerated `0000_market_control_plane.sql` clean-reset baseline; no capacity compatibility migration is part of the current contract.

## Boundary Rule

Projects own work semantics. Capacity providers own execution capacity.

Project-owned examples:

- project agents
- agent classes
- activity profiles
- clean handler selection
- prompts and configuration
- TreeDX content access
- allowed tools
- branch policy
- question policy
- planning/acting permissions
- output expectations
- required execution capabilities

Provider-owned examples:

- execution providers
- native quotas and budgets
- local runner concurrency
- availability windows
- provider-local pressure and constraints
- usage observations
- runtime images and lifecycle

The API coordinates the match between project demand and provider supply. The provider manager supervises only one provider's local runtime; it is not the cross-provider planning authority.

Assignment project context is compiled once by the API before admission from the durable project, owning team, architecture, and repository records. Missing ownership or storage uncertainty fails admission; the compiler does not fabricate a team or silently replace an unreadable architecture with defaults.

Human-machine execution providers use this same boundary: projects define work semantics, while AI providers, deterministic workflows, and human issue queues supply execution capacity. See [Human-Machine Execution Providers](./human-machine-providers.md).

## Project And Repository Identity

A capacity `Project` is a durable API control-plane object owned by one team. It carries logical repository architecture (`rootPath`, optional `sitePath`, optional `contentPath`, content runtime/materialization policy) and a project TreeDX library binding. It is not identified by a Market workspace folder or by a provider-local checkout.

Each production project must resolve to an independent Git repository. Acceptance uses the independently versioned `engineering` and `research` starter repositories as source fixtures, then creates a fresh API project for each run and attaches it to the starter's reconciled TreeDX repository. Project agent classes are synchronized from that repository's MDX agent definitions through TreeDX. Engineering assignments additionally receive an immutable repository ref and execute in an isolated exact-ref worktree; research assignments use the isolated TreeDX workspace. This preserves package/project independence while allowing the Market repository to orchestrate integrated verification.

## AllocationSet

An `AllocationSet` is a versioned team policy for distributing capacity across a workday or accounting window.

It includes:

- team id and version id
- effective window
- portfolio allocation across projects
- project allocation across agent classes
- planning/acting split per project or agent class
- soft caps, hard caps, reserves, and borrowing rules
- status, such as draft, active, superseded, or archived
- audit metadata

Admin may edit allocation policy. API persists and applies it. SDK defines the portable contract. Providers cannot mutate it.

Implemented allocation writes create a new allocation set and activate it. Activation supersedes overlapping active sets for the team, while existing reservations keep their original `allocationSetId` and grant metadata. Grants are explicit membership/project enforcement records created and activated independently; membership approval and allocation activation never synthesize a grant.

Every public grant, allocation, workday-envelope, and project-agent-class mutation requires an idempotency key. The API transaction stores the mutation and one `capacity_operation_receipts` row keyed by team, operation, and idempotency key. The receipt binds a canonical request digest to the durable response. Same-key/same-input retries return that response after transport loss or process restart; same-key/different-input retries fail with a stable conflict. This reusable receipt is the single canonical control-plane mutation primitive; concurrent mutation tests prove one durable resource/result wins.

Workday scheduling is a read-only consumer of governance policy. Before creating a workday envelope, the API must resolve an approved provider membership, an active allocation that is effective and covers every requested project, and one unambiguous active planning grant per project and environment. Scheduling and maintenance must never create, activate, supersede, pause, revoke, expire, or otherwise rewrite allocation sets or grants.

Every workday envelope created by a governed schedule stores the exact owning workday-run id through an indexed foreign key. Scheduling, terminalization, and recovery query that durable relationship directly; an envelope id prefix, naming convention, or in-memory collection is never ownership evidence. If scheduling fails after partial persistence, recovery attempts exact envelope closure, a failure event, and the failed run transition independently and reports any missing recovery evidence as a control-plane failure.

## ProjectAgentClass

A `ProjectAgentClass` groups project-owned agents by work semantics and capability needs.

It includes:

- project id
- class id and slug
- allowed modes, such as planning, acting, or both
- eligible agent definitions and activity profiles
- required execution capabilities
- output types
- policy defaults
- class-level allocation targets

Provider capabilities are matched against class requirements, but providers do not define the project class vocabulary.

## AgentDefinition

An `AgentDefinition` is an Astro content model entry that binds a project-scoped agent identity to one or more activity profiles.

Root Market agent definitions live in:

```text
src/content/agents/*.mdx
```

Package project agent definitions live in:

```text
docs/src/content/agents/*.mdx
```

The frontmatter must conform to SDK agent-definition contracts. The Markdown body describes the agent's project role for humans and execution providers. Agent definitions should not use legacy top-level runtime fields such as `handler`, `handlerConfig`, `systemPrompt`, `tools`, `contentAccess`, `context`, `execution`, `outputs`, or `requiresApprovedWork`; those concerns belong inside `activityProfiles`.

## AgentActivityProfile

An `AgentActivityProfile` is the runtime contract for one run purpose on one agent.

It includes:

- activity type: `planning`, `estimating`, `acting`, `reviewing`, or `reporting`
- handler: `writer`, `actor`, `estimate`, `releaser`, or `reporter`
- prompt configuration
- TreeDX content access
- allowed/denied tools
- branch policy
- question policy
- execution-provider capability requirements
- path constraints when repository mutation is allowed
- output contracts

Profiles are the source of prompt/tool/content variation. Handler id is implementation routing and cannot widen mode, tool, content, branch, or output scope.

For planning coordination, `signals.subscribesTo` and `signals.publishes` are the only executable graph declarations. The SDK compiles selected activity profiles and immutable `treeseed.agent-signal/v1` contracts into one acyclic planning graph. Profiles without subscriptions and explicit external signals are roots. Every subscription must have an allowed producer; producer class, subscriber activity profile, filters, self-dependencies, joins, and cycles are validated before scheduling. `cardinality: each` instantiates one downstream assignment per matching signal subject. Artifacts remain durable outputs and evidence, never dependency edges.

The API freezes normalized profiles, signal contracts, proposal types, graph nodes, edges, immutable repository refs, and a digest into the workday before admission. Later repository or agent-definition changes cannot alter a running workday. A predecessor satisfies an edge only with a durable signal that validates against the frozen contract and carries its required commit or control-plane evidence. Downstream assignments receive the exact producer node, signal, subject, assignment, immutable reference, and evidence selected for every subscription.

## AgentKernelProfile

An `AgentKernelProfile` describes how a project agent can run inside the kernel.

It includes:

- agent id, slug, class id, and handler id
- selected activity type and activity profile
- supported modes
- supported output contracts
- required and optional capabilities
- estimate behavior
- fallback behavior
- telemetry shape

Profiles are project/runtime metadata consumed by `@treeseed/agent`. Shared profile contracts belong in `@treeseed/sdk`.

## AgentKernelPolicy

An `AgentKernelPolicy` constrains kernel mode selection.

It includes:

- planning/acting budget split
- eligible input queues
- fallback order
- maximum attempts
- output validation requirements
- tool and repository access rules
- mode-specific constraints
- idle behavior

Policy is derived from project configuration, allocation sets, assignment constraints, and API readiness state. Handlers execute inside policy; they do not choose their own scope.

## WorkdayCapacityEnvelope

A `WorkdayCapacityEnvelope` is the TreeSeed-side accounting envelope for a team/project workday.

It includes:

- workday id and time window
- total workday budget and committed usage
- the immutable effective allocation-set reference
- current reservations and actual usage

Project, agent-class, and mode percentages, reserves, and borrowing rules exist only in the referenced `CapacityAllocationSetV2`. Workdays do not copy or override allocation policy.

Workdays are not provider calendars. Providers participate by publishing membership-scoped availability sessions that may overlap all or part of a workday.

## AgentCapacityEnvelope

An `AgentCapacityEnvelope` is the bounded runtime budget passed to the AgentKernel for one selected assignment.

It includes:

- project id and agent class
- mode
- activity type
- budget units and native-unit hints
- lease and reservation ids
- provider and execution-provider ids
- capability grants
- deadline and renewal constraints
- allowed output types
- fallback limits

The kernel must not expand beyond the envelope. Actual usage is reported against the same envelope.

Planning and acting assignments both require reservation-backed envelopes for new work. Planning reservations use `mode: planning` and include planning-source metadata, workday id, allocation set id, project agent class id, agent id, and mode-budget details. Acting reservations remain tied to accepted decision execution work and capacity-plan provenance.

## DecisionExecutionInput

A `DecisionExecutionInput` is the project/governance context selected for a planning or acting run.

It includes:

- objective, question, proposal, or decision references
- readiness state
- required planning inputs or approved acting scope
- repository/workspace context
- relevant notes and prior outputs
- expected output contract
- explicit `workGraphNodeId` provenance for acting input
- audit and trace references

Planning inputs can target unresolved proposals, weak proposals, estimates, comparisons, and summaries. Acting inputs must be tied to approved work. Accepted acting input fails closed unless its `workGraphNodeId` identifies the intended node in the active decision graph; the execution-input id, capacity-plan work-unit id, and graph-node id remain distinct durable identities.

## StructuredEstimate

A `StructuredEstimate` is the machine-readable output of an `estimating` activity profile.

It includes:

- decision, proposal, or work-unit reference
- agent class and agent id
- expected, minimum, and maximum capacity units
- confidence and risk level
- required inputs
- dependency declarations
- expected outputs
- acceptance criteria
- completion evidence requirements
- assumptions and blockers

Estimate prose is allowed as rationale, but deterministic assignment synthesis must rely on structured fields.

## DecisionAssignmentGraph

A `DecisionAssignmentGraph` is the API-compiled execution graph for an approved decision.

It is derived from:

- the approved decision
- accepted structured estimates
- dependency declarations
- deliverable contracts and manifests
- project agent class capability metadata
- capacity policy and readiness rules

Agents may propose dependencies and deliverables. The API owns the executable graph, graph versions, ready-state evaluation, and assignment synthesis. Acting assignments are leased only when their upstream graph dependencies, required deliverables, readiness gates, and reservations are satisfied.

This decision assignment graph is the post-governance acting graph. Before a human decision, a separate workday planning graph coordinates research, proposal synthesis, estimates, independent review, questions, and reporting from activity-profile artifact and signal contracts. An accepted proposal and decision bridge the graphs through immutable governance provenance; acting still requires its decision graph and accepted capacity plan.

The SDK Drizzle schema owns `structured_agent_estimates`, `decision_assignment_graphs`, `deliverable_contracts`, and `deliverable_manifests`; the reset clean baseline must contain this contract. The unlaunched capacity system does not retain an additive capacity compatibility migration path. The retired `runtime_tasks`, `runtime_task_events`, and `runtime_task_outputs` queue is not an alternate graph execution store.

## DeliverableContract And DeliverableManifest

A `DeliverableContract` describes the required artifact type and acceptance contract without forcing exact file paths up front. Examples include architecture spec, API contract, test plan, implementation report, release notes, or review result.

A `DeliverableManifest` is submitted when the producing agent finishes. It maps the contract to concrete TreeDX content refs, repository refs, or generated artifacts.

This keeps authoring simple while preserving deterministic scheduling:

```text
Authoring shorthand:
  engineer depends on architect

Control-plane dependency:
  engineer requires approved architecture_spec deliverable

Runtime handoff:
  architect submits a manifest with the concrete refs
```

## DecisionPlanningStatus And PlanningInputRequest

`DecisionPlanningStatus` records execution readiness beside human approval state. It includes decision id, project id, human approval state when known, execution readiness, planning input status, decision scope hash, stale reason, and readiness timestamps.

`PlanningInputRequest` records missing planning work required before acting. Open planning requests can be synthesized into planning-mode provider assignments. Accepted `DecisionExecutionInput` records with ready or waived planning status can be synthesized into acting-mode provider assignments.

## CapacityPlan

A `CapacityPlan` is an explainable API-side routing and reservation plan.

It includes:

- source allocation set and workday envelope
- eligible demand
- provider availability considered
- selected assignments
- reservations
- rejected or deferred demand with reasons
- predicted usage
- confidence and risk notes

Capacity plans are not provider-local task lists. They are API-side explanations of assignment choices.

## ProviderAvailabilitySession

A `ProviderAvailabilitySession` records one provider's reported availability and supply for a bounded period.

It includes:

- provider and approved membership ids
- open/refresh time, expiry, and availability window
- execution providers and capabilities
- native limits, observations, and confidence
- runner pressure and concurrency
- provider-local constraints
- session status and compare-and-swap sequence

Providers create and refresh membership-scoped sessions through outbound availability-session operations. The API must not require inbound access to provider machines.

Session expiry is a short provider-liveness boundary, not a workday-duration substitute. The provider manager continues full-snapshot sequence-checked refreshes while runners execute; a runner may renew only while its exact bound session remains open and current. Isolated acceptance mirrors that service topology with a refresh-only heartbeat during synchronous runner execution. That heartbeat cannot poll, synthesize, select, or pre-lease another assignment.

Availability sessions are opened through `POST /v1/provider/availability-sessions`, replaced with a full sequence-checked snapshot through `PUT /v1/provider/availability-sessions/:sessionId`, and closed through `POST /v1/provider/availability-sessions/:sessionId/close`. They record supply facts only: availability, execution providers, native limits, capabilities, runner pressure, and provider-local constraints. Provider-asserted grants are never accepted; API-owned active grants are authoritative. The API performs bounded request-scoped synthesis from existing workday/readiness/planning records before leasing work. Providers still do not invent project work.

Provider sessions and assignments replace the retired project-runner manager-lease, worker-runner, repository-claim, and runner-scale models. Those duplicate records are not compatibility contracts. The operations runner does not own repository checkouts.

Synthesis is authorized only under an approved membership, active provider identity, and one exact open membership-scoped session whose time window and environment match the request. Unknown explicit sessions are rejected rather than replaced by a different session. Storage uncertainty is an error, never an empty grant set, zero active usage, or implicit authorization. The lease-authority service is the sole lease-time evaluator; obsolete provider eligibility evaluators are not retained.

## ProviderAssignment

A `ProviderAssignment` is a leased unit of work matched by the API and executed by a provider runner.

It includes:

- assignment id and lease state
- lease token, runner id, lease expiry, and lease renewal timestamp
- provider session id
- project id and agent class
- selected project agent/handler
- mode
- capacity envelope
- decision/proposal context
- TreeDX proxy handle when repository access is needed
- allowed outputs
- status, attempts, renewals, return reason, completion, or failure
- lifecycle reason, code, and output summary

Assignments replace ambiguous task-claim language. Capacity task-claim compatibility APIs must not remain; all provider execution uses assignment/session semantics.

Assignments are created only by the canonical admission transaction. Fixtures and acceptance workflows must use the same transaction. One request-scoped demand compiler normalizes TreeDX-backed objectives, questions, proposals, decision reviews, and knowledge gaps; durable planning inputs; assignment completion/blockage; release-readiness, summary, handoff, and configured idle intents; and strictly gated capacity-plan work units into `capacity_workday_demands`. Authenticated next-assignment polling and explicit idempotent workday ticks may invoke the compiler; there is no process-local/background synthesis queue. One assignment function atomically claims demand before admission, creates the assignment through the sole admission transaction, and then provisions its deterministic TreeDX workspace through a recoverable `provisioning` to `issued` handle lifecycle. Accepted decision execution inputs remain planning artifacts until aggregated into an accepted durable capacity plan. An admitted assignment owns its current explanation; a denied pre-admission demand is recorded in the capacity audit ledger because no assignment exists yet.

Allocation, grant, workday, availability-session, project-agent-class, reservation, and assignment JSON used by admission or replay is strict durable state. One API decoding primitive enforces required object/array shape; malformed evidence is a control-plane error and never becomes empty/default policy.

Capacity control-plane input has the same single-owner rule. One API request-object primitive distinguishes an explicitly optional empty body from malformed JSON and rejects null, array, and primitive roots before authorization-dependent service or persistence work. Extracted governance, allocation, workday, admission, and operator routes and the remaining inline planning, capacity-plan, provider-assignment, mode-run, and assignment-operation routes use that primitive; no capacity mutation may catch parser failure and substitute `{}`.

When a TreeDX proxy handle is present, the same admission transaction writes its durable API-owned authorization row. The assignment copy is execution context for the provider; it is not an authorization fallback. API proxy authorization requires the durable row and enforces its team, project, assignment, repository, workspace, expiry, revocation, operation, token-hash, read-path, and write-path constraints. The clean-reset baseline requires this row from the first admitted assignment; there is no embedded-handle compatibility or backfill path.

Durable `AgentCapacityPlanRecord` entries are API-owned acceptance gates. They aggregate accepted `DecisionExecutionInput` records into work units with expected/high agent-seconds, independent token/cost/native limits, capability needs, dependencies, blockers, assumptions, risk, scoped capacity envelopes, and explicit graph-node provenance. Acting synthesis uses only accepted, scheduled, or active plan work units whose referenced active graph node is ready, acting-mode, class/handler compatible, dependency-ready, and covered by approved deliverable contracts. Validated engineering workflow promotion configuration is consumed by the API-owned workday coordinator before demand compilation: it waits for human approval and a linked accepted estimate, then idempotently creates the active graph, graph-scoped accepted inputs, and accepted plan through their canonical service owners. `decision_execution_inputs.work_graph_node_id` defines the supersession slot, so sibling graph nodes coexist while a changed scope for the same node supersedes its predecessor and affected plan. Decision readiness is projected from the newest accepted, scheduled, or active plan. Transitioning an older plan to superseded or another inactive state cannot overwrite readiness owned by a newer active plan; when no active plan remains, readiness fails closed as blocked.

The lifecycle leases assignments through `/v1/provider/assignments/next` and updates state through renew, return, complete, and fail routes. Leased assignments execute through `@treeseed/agent` `AgentKernel.runAssignment`.

Lease selection records its current explanation in the same compare-and-swap that claims the assignment. Workday terminalization is a single API-owned primitive shared by explicit closure, deadline maintenance, terminal-run recovery, and supersession. It settles the admission reservation before changing assignment or mode-run state, advances the assignment state version conditionally, and propagates storage failure so maintenance can retry. Fallback output identity is stable for assignment, mode, code, and attempt; replay cannot replace evidence owned by another execution.

Lease selection considers only `pending` and `returned` assignments. Expired `leased` rows first pass through the bounded API recovery owner invoked by scoped provider polling and the API transactional scheduling scan. Settlement, usage, successful or active mode runs, TreeDX proxy events, fallback evidence, retry limit, and reservation transition tokens determine one explicit safe-retry, terminal-failure, completed, or operator-action disposition. Safe retry keeps the reservation; retry exhaustion settles it exactly once; completed recovery requires successful mode-run plus settlement evidence; uncertain side effects or financial transition remain `expired`. Assignment CAS, orphan mode-run closure, demand/participation status, and audit evidence share one database batch, and a previously committed recovery settlement converges on replay.

The API assignment repository is the only durable row serializer and list/get owner. It rejects corrupt JSON, unknown modes, and invalid state versions. The focused lease service owns candidate ordering, diagnostics, and lease CAS but delegates authorization to the sole lease-authority evaluator; it does not duplicate grant, allocation, session, reservation, membership, provider, or workday eligibility policy.

The typed assignment-admission service is the only synthesis-to-admission bridge. Typed planning-input/capacity-plan synthesis strictly decodes persisted source JSON and propagates storage uncertainty. Team operators inspect bounded pre-admission evidence through `GET /v1/teams/:teamId/capacity-audit-events` or `trsd capacity audit-events`; synthesis never writes an explanation for a nonexistent assignment.

Workday demand and assignment have one typed request-scoped owner each. A strict workday-run repository rejects unknown status, invalid required fields, malformed JSON, and an active-run collection beyond its explicit bound. Project policy rejects missing or ambiguous requested projects. Durable participation cycles and entries record pending, assigned, completed, excluded, and blocked outcomes and prevent a new cycle while an eligible entry remains uncovered. TreeDX content reads and artifact-context reads propagate transport, storage, and decoding failure. The compiler writes idempotent positive demand only; the assignment function claims one demand, calls the sole assignment-admission service, and provisions the deterministic TreeDX workspace only after admission.

Workspace preparation derives one replay-stable id from the assignment, validates brokered repository/token/TTL input, and consumes a strictly bounded TreeDX response. HTTP failure, oversized content, malformed JSON, and a returned id that differs from the deterministic id are stable fail-closed control-plane errors; no assignment is admitted from uncertain workspace state.

Provider task claim/event/complete/fail routes are not part of this model. The provider runtime contract is availability-session create/refresh/close, next assignment, renew lease, create mode run, complete/return/fail assignment, and settlement/usage reporting.

Lease rules:

- `pending/unleased`, `returned/released`, and expired `leased` assignments are eligible for next-assignment polling.
- A next-assignment response leases one existing assignment for the authenticated provider and returns a lease token.
- Renew, return, complete, and fail operations require the current membership-scoped provider access token and the active lease token.
- The active lease must still be unexpired when renew, return, complete, or fail commits. Matching stale token material does not confer terminal mutation authority.
- Retryable failures return the assignment to the eligible pool; non-retryable failures end as failed.

## ProviderAssignmentExplanation

An assignment explanation records why a candidate was eligible or blocked. It includes source, source record id, eligibility result, readiness, capability, grant, allocation and policy gates, allocation policy version when known, and human-readable reasons.

Providers can read their assignment explanation through membership-scoped access-token routes. Operators can read the same explanation through team-scoped routes.

## AgentModeRun

An `AgentModeRun` records one bounded kernel execution attempt.

It includes:

- assignment id
- agent id, class id, mode, and handler id
- started, completed, failed, or returned timestamps
- selected input
- output references
- trace references
- usage actuals
- validation results
- fallback reason when applicable

Architecture Milestone M1 records mode-run telemetry and can link it to usage actuals. Architecture Milestone M3 emits mode-run telemetry from the AgentKernel assignment runtime: a running attempt when bounded execution begins and a terminal attempt when the handler succeeds, fails, cancels, or the kernel produces a bounded fallback. These are roadmap milestone labels, not completion-plan phase numbers.

The assignment carries one canonical `modeRunId` for the authoritative kernel lifecycle row. Kernel running and terminal writes update that same row, and the artifact manifest must name it. Provider phase/message telemetry uses separately derived event identities and cannot substitute for the canonical run. Same-assignment delivery replay updates its intended record; cross-assignment identity reuse is a conflict and cannot move forensic evidence. Usage linkage is atomic and is accepted only when the usage actual belongs to the same team and assignment. Provider delivery is required and bounded: buffered messages are acknowledged only after persistence, and exhausted delivery deterministically returns or fails the lease with explicit diagnostics.

Assignment lifecycle settlement is API-owned. Lease/start emits `task_started`; completion emits one reservation-scoped `task_completed_actual_settlement` plus release of unused reserved seconds; return and retryable fail emit `reservation_released`; nonretryable fail emits the terminal failed settlement. An explicit settlement token selects the only writer, and a unique reservation/phase ledger constraint prevents a second actual settlement even when callers race with different idempotency keys. Reservation state, active/elapsed time, tokens, native usage, and cost are updated from the same transaction. Replays return the canonical settlement; conflicting actual usage is rejected.

Terminal settlement is also the provider runner's local lease-renewal boundary. Informational usage may be reported while renewal remains active, but the runner closes timer and execution-lifecycle renewal authority before invoking settlement because successful settlement consumes the reservation before the subsequent completion transition releases the lease. A renewal already in flight may finish; any detached rejection observed after that boundary is suppressed locally, while the API continues to reject renewals against consumed reservations.

Every usage actual carries a report idempotency key, durable assignment attempt, stable usage dimension, and an `informational`, `incremental`, or `aggregate` accounting mode. A reservation-owned report token serializes partial ingestion against terminal settlement. The terminal aggregate must cover every accepted incremental active-second report; an underreported aggregate produces no ledger/counter mutation and can be corrected idempotently. An overrun creates an append-only hold and `overran_pending_approval` reservation state. Only a team-management API/CLI decision may approve the bounded exception or reject and release it; provider credentials cannot self-approve an overrun.

One focused usage service owns the sole usage insert operation used by both the provider partial-report endpoint and settlement. Settlement remains the sole owner of ledger, counter, and reservation accounting. There is no alternative usage writer or global JSON scan that infers execution-provider kind from a fixed availability-session window. Typed usage repositories expose bounded keyset or explicitly scoped recent reads, strictly decode persisted evidence, and propagate database uncertainty.

`AgentRunTrace` remains useful as lower-level handler/runtime trace detail. `AgentModeRun` is the durable control-plane record that connects mode, assignment, capacity envelope, output, and usage.

## Usage And Ledger Settlement

Usage actuals connect native provider observations to TreeSeed accounting.

They include:

- assignment id, assignment attempt, usage dimension, report idempotency key, mode run id, reservation id, provider id, execution-provider id
- native units consumed
- requested, reserved, active, elapsed, released, and overrun seconds
- input, cached-input, reasoning, and output tokens
- cost and provider-native usage without conversion into agent time
- confidence level
- unused/returned capacity
- errors, retries, and partial outputs
- ledger entry ids

The API settles usage into the capacity ledger. Providers report native observations; TreeSeed derives and records provider-neutral accounting.

### Native accounting windows

Native availability is never calculated from lifetime reservation history. Each execution-provider limit is evaluated inside one explicit accounting window keyed by capacity provider, execution provider, native unit, limit scope, and window start/end. The window comes from a fresh provider observation when available, otherwise from a supported configured reset cadence. An opaque or unsupported reset cadence produces unknown derived capacity and a diagnostic reason; it must not silently assume an unlimited window.

For an observed-remaining source, the observation is authoritative at `observedAt`: TreeSeed subtracts current reserved/consuming commitments and only terminal usage newer than that observation. For a configured-limit source, TreeSeed subtracts reserved commitments plus terminal usage inside the current reset window. Reset rollover excludes prior-window terminal usage while preserving immutable reservations, usage actuals, and ledger evidence. SQL aggregates own totals; operator diagnostics return only an explicit bounded evidence window with continuation metadata.

Window selection and arithmetic are SDK-owned pure primitives. API admission and summaries use the same primitive and persisted facts. Required tests cover daily/weekly/monthly rollover, observation refresh, late and duplicate settlement, concurrent reservations, missing cadence, provider/session scope, and restart/replay.

`WorkdayCapacityEnvelope` records can be started, paused, completed, and summarized through `/v1/workdays`. Summaries combine envelope policy with aggregate assignment, mode-run, reservation, usage, and ledger totals, release/refund calculations, native usage snapshots, provider-confidence warnings, and five bounded evidence windows. Each evidence collection is continued explicitly with `evidence`, `limit`, and opaque `cursor`; a summary never embeds an unbounded forensic history. The summary is an API control-plane read model; it is not reconciled infrastructure.

## Discussion Content And Capacity Boundary

`discussion`, `discussion-message`, and `discussion-event` are Git-backed Astro content models. A user message is committed through TreeDX before an assignment is eligible. The content commit SHA and message path freeze the shared snapshot used by every mentioned agent. Assignment receipt, reservation, lease, provider lifecycle, mode-run messages, tools/output summaries, artifacts, usage, settlement, completion, failure, and recovery are projected as immutable Discussion events; terminal agent responses are Discussion messages.

Discussion content is never a PostgreSQL aggregate. The API database may retain a Discussion identifier and committed content reference on otherwise generic operational records so that lifecycle evidence can be projected and recovered, but it does not own session state, message bodies, event history, search, or navigation.

Every assignment carries `treeseed.capacity-budget/v2`: requested/reserved/active/elapsed/released/overrun time, one immutable hard deadline, token classes and ceilings, cost/currency, provider-native units, concurrency, attempts, pricing generation, and enforcement confidence. Terminal disposition is one of `completed`, `completed_early`, `deadline_exhausted`, `budget_exhausted`, `blocked`, `cancelled`, or `failed`. `completed_early` additionally proves passed acceptance checks, durable artifact refs, remaining budget, a completion reason, and `noUsefulScopedWorkRemaining: true`.

## TreeDX Proxy Handle

Assignments may carry a project-scoped `TreeDxProxyHandle`. The handle identifies project, assignment, repository/workspace scope, allowed operations, and expiry. It is not a TreeDX service credential.

Provider runners call `/v1/dx/projects/:projectId/...` with the connection's short-lived membership access token plus `x-treeseed-assignment-id` and `x-treeseed-treedx-proxy-handle-id`. The API verifies the membership, provider, team, project, active assignment lease, handle id, handle state, expiry, repository, workspace, allowed operation, and allowed path before resolving the TreeDX node. Successful and denied calls write `TreeDxProjectProxyAuditRecord` rows that can be read by project operators. Raw TreeDX credentials, membership credentials, and access tokens must not appear in assignment payloads, logs, Admin, CLI, or provider reports.

## Assignment Capability Handles

Assignments may also carry a redacted `capabilityHandles` bundle. The bundle records the workspace access mode plus repository access handles, TreeDX workspace handles, workflow-operation handles, and secret-use references. These are policy handles, not credentials. Write-capable handles require acting mode with readiness and accepted/scheduled/active capacity-plan provenance. When the execution input carries `exactBaseRef`, write-capable repository authority contains exactly that allowed ref; TreeDX workspace provisioning uses it as the base, and the provider creates or resumes only an isolated worktree that proves the same commit ancestry. Provider runners hydrate `AgentContext.capacity.capabilityHandles` and dispatch approved workflow operations only through assignment-scoped API routes; generic workflow dispatch and raw GitHub App tokens remain outside provider payloads.

Source checkpointing is an SDK-owned assignment operation, not the general workspace save workflow. It inventories the assigned worktree, enforces the effective allowed and forbidden paths, creates a local commit, and emits a source-commit receipt; it has no push, merge, tag, stage, release, deployment, or provider authority. On acting completion, the API validates the canonical artifact manifest against assignment scope and the graph node's exact output contract. Required source commits, passing verification, and explicit review disposition are stage-specific gates. A deterministic assignment manifest id makes concurrent/repeated completion converge before the API advances or revises the graph.

Content provenance is tool-implementation neutral but receipt strict. Each `AgentContentReference` names the completed manifest tool event whose authenticated derived event is `content_created`; that event may originate from a model-aware content create or an assignment-scoped TreeDX write. One authenticated `content_committed` event and exact path/ref/SHA read-back prove the shared workspace commit. Counting literal tool names is not provenance and must not reject legitimate project-configured content paths.

Every engineering deliverable manifest carries typed `sourceAuthority`: assignment and mode-run identity, the governed base commit, the effective commit, and the checkpoint commit when the stage created one. Contract approval selects that exact manifest. When a downstream graph node becomes ready, the API resolves its repository authority from the selected manifests of its completed predecessor nodes; all predecessors must converge on one immutable commit. Missing manifests, cross-project or cross-decision evidence, mutable refs, and divergent predecessor commits fail closed. The provider then proves the downstream worktree was created from that resolved commit, so test, implementation, verification, review, and revision stages cannot silently restart from the workflow's original source.

If a stage emits multiple successful source checkpoints, the final successful checkpoint in execution order is the terminal source authority. Review demand includes only authenticated artifact manifests from completed graph ancestors. Documentation, release, reporting, usage, or settlement artifacts that are graph-blocked downstream of review are never prerequisites for the review decision. A governed `requireRevisionCycle` policy may require one concrete initial rejection; after revision and reverification, review returns to evidence-based approval or rejection.

Supervised integration is a separate SDK operation over that durable authority. `trsd capacity checkpoint-integrate --team <team-id> --assignment <assignment-id> --plan|--execute` reads the completed assignment, completed graph, API-selected deliverable manifest, and API-owned project repository topology. It accepts only the latest approved implementation node after final verification, independent review, and release-readiness completion; rechecks assignment/mode-run/base/checkpoint scope, repository origin, exact Git diff paths, a clean unprotected task branch, and an unchanged base; and copies the exact checkpoint commit lineage into that branch. Exact-tree replay is idempotent. The operation cannot push, merge a remote branch, stage, release, deploy, or alter capacity policy. `trsd save` remains the next explicit operator action and retains its own package and integration gates.

## ResearchWorkflow

A `ResearchWorkflow` is the API-owned compare-and-swap state machine for cited research. Its eleven ordered stages are question decomposition, source-selection criteria, governed source search, independent source fetch, linked evidence notes, claim synthesis, citation-review rejection, revision, citation-review approval, cited knowledge publication, and workday reporting.

The workflow carries the canonical objective/question refs, current stage, required role, `minimumIndependentSources` (at least two), `maxRevisionCycles` (one through ten, default three), citations, claims, review dispositions, revision count, publication/report refs, and state version. Demand projection carries the workflow's question ref, current `researchStage`, source minimum, revision limit, and latest authenticated review reason into the assignment work package.

The eleven stages describe the canonical gates, not an exactly-once role sequence. If the independent Reviewer rejects the post-revision approval stage with an authenticated reason, the compare-and-swap transition records that review attempt, reopens `revision`, returns approval to pending, and keeps publication blocked. The next Researcher assignment receives that reason and must change the claim wording itself to match the cited evidence; changing only status or citation identifiers is not a revision. Every completed revision increments `revisionCount`. A later authenticated approval releases publication; rejection at `maxRevisionCycles` marks the approval node failed and the workflow `blocked` with the final review reason, so assignment timeboxes and independent token/cost/native limits are outer bounds rather than the only protection against an unproductive feedback loop.

Research source authority is the intersection of project activity policy and the selected execution provider's `researchSourcePolicy`. The assignment catalog omits research search/fetch tools when that intersection is empty and transports only the effective domains. A successful governed fetch produces an authenticated `research_citation_fetched` receipt containing URL, publisher, retrieval time, content hash, claim ids, and confidence. Claims and review dispositions likewise come from authenticated tool receipts. Stage transitions reject missing/erased source evidence, insufficient independent publishers, unlinked evidence notes, unsupported publication claims, or approval without the required independent review and revision provenance.

## Fallback Output

`AgentFallbackOutput` records bounded fallback outputs, such as planning documentation drafts or weakness proposal drafts. The record carries mode, fallback code, output payload, provenance, quota information, and duplicate/quota state. Product-specific fallback drafting remains handler/policy-owned; the capacity layer only records and gates it.

## Execution Provider Proof Modes

Capacity provider records expose only real execution providers. Local and CI acceptance must fail closed when no configured provider is available; there is no mock, synthetic, or deterministic fallback that fabricates assignment completion. Codex advertises the activity operation vocabulary `planning`, `estimating`, `acting`, `reviewing`, `reporting`, and `release`.

The production local acceptance runs a distinct bounded two-slot scenario before the deterministic one-slot engineering-then-research baselines, so cross-project defects fail before the long graphs. The scenario creates both independent starter projects before dispatch and schedules them as one provider-bound portfolio workday with one independently governed envelope per project. It uses one availability session and one active allocation with separate project slices, limits each grant to one assignment, and requires two distinct assignments, runners, project ids, TreeDX workspace ids, overlapping claimed-to-completed intervals, artifact sets, dimensional usage evidence, exactly one aggregate actual and ledger settlement per assignment, and zero-residue cleanup. Two local workday runs are not the concurrency model: local successor semantics intentionally replace an older same-provider run. Project-agent-class mutation idempotency remains team/operation scoped, so every portfolio transition key also includes project identity. The deterministic service concurrency matrix remains the failure-isolation proof; real Codex overlap does not replace it.
