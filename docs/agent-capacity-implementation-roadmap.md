# Agent Capacity Implementation Roadmap

**Status:** Canonical implementation roadmap; phases 1-5 plus architecture gap closure implemented
**Date:** 2026-06-16  
**Audience:** Treeseed SDK, API, agent runtime, provider runtime, Admin, CLI, and package maintainers  

This roadmap turns the two-mode agent kernel plan and the provider coordination architecture into implementation phases. It is the canonical entry point for work that changes Treeseed agent capacity behavior.

Related architecture:

- [Agent Kernel Capacity Plan](./agent_kernel_capacity_plan.md)
- [Capacity Provider Agent Coordination Architecture](./capacity_provider_agent_coordination_architecture.md)
- [Agent Capacity Domain Model](./agent-capacity-domain-model.md)
- [Agent Kernel Mode Runtime](./agent-kernel-mode-runtime.md)
- [Agent Capacity Operator Surfaces](./agent-capacity-operator-surfaces.md)
- [Package Ownership](./package-ownership.md)

## Ownership Model

The implementation boundary is:

- `@treeseed/agent` owns the provider runtime, provider manager, provider runner, AgentKernel execution, mode scheduling, fallback behavior, runtime images, runtime tests, and provider-local lifecycle behavior.
- `@treeseed/sdk` owns portable contracts, domain types, reconciliation contracts, package discovery, config, and provider-neutral helper logic.
- `@treeseed/api` owns durable control-plane state, API routes, request-scoped assignment synthesis, assignment selection, provider sessions, leases, reservations, usage settlement, decision readiness records, workday envelopes, and TreeDX proxy authorization.
- `@treeseed/admin` owns browser operator surfaces over API contracts.
- `@treeseed/cli` owns operator commands over SDK/API/agent public surfaces.
- `@treeseed/core` owns web runtime composition. It does not own provider scheduling, AgentKernel execution, or capacity assignment logic.
- `packages/treedx` remains product-neutral. Treeseed maps project and capacity semantics outside TreeDX.

## Phase 1: Contracts And Durable Records

Status: implemented as the contracts-and-persistence foundation. The current implementation adds the SDK contract surface and durable API records while preserving the legacy provider task-claim path.

Goal: create the shared language and persistence substrate before changing runtime behavior.

Implemented boundaries:

- SDK-owned contracts are exported from `@treeseed/sdk/agent-capacity` for allocation sets, project agent classes, agent kernel policy/profile, capacity envelopes, decision execution input, capacity plans, provider availability sessions, provider assignments, mode runs, and usage settlement.
- API migration `0005_agent_capacity_coordination.sql` adds durable allocation-set, project-agent-class, provider-session, assignment, and mode-run tables plus nullable bridge columns for reservations, ledger entries, and usage actuals.
- API route descriptors and `MarketClient` methods cover allocation sets, project agent classes, provider sessions, assignments, and mode runs.
- Compatibility with the current task-claim provider protocol is preserved. New records exist beside existing task records; Phase 2 moves runtime coordination toward assignment/session semantics.
- Conversion helpers define boundaries from existing `CapacityProvider`, `CapacityGrant`, current `CapacityPlan`, reservations, and usage actuals into the new domain model.
- Fixture coverage creates one team, two projects, two project agent classes, one local provider, one OpenAI-like execution provider, one planning assignment, one acting assignment, and linked mode-run usage telemetry.

Acceptance criteria:

- SDK exports the new types from canonical paths without importing agent runtime code.
- API can persist and read allocation sets, provider sessions, assignments, and mode runs.
- Existing capacity provider tests still pass while the new records are present.

Completed by later phases and gap closure:

- Phase 2 implemented provider next-assignment polling, lease renewal, return, complete, and fail semantics.
- Phase 3 implemented AgentKernel mode execution and bounded fallback behavior.
- Gap closure added decision readiness, planning input requests, accepted execution inputs, durable capacity plan records, workday envelopes, assignment synthesis/explanations, TreeDX proxy audit/handles, fallback outputs, and settlement summaries.

## Phase 2: Provider Check-In And Assignment Lifecycle

Status: implemented as a provider check-in and assignment lease lifecycle. Provider check-in records generic supply, and provider runners poll `ProviderAssignment` records through outbound API calls. Gap closure extends check-in/next-assignment to synthesize deterministic assignments from explicit readiness and planning records.

Goal: move coordination from task claiming toward provider-initiated availability sessions and leased assignments.

Implemented boundaries:

- Provider check-in route records availability, grants, execution providers, native limits, runner pressure, and provider-local constraints.
- Provider next-assignment route leases eligible `ProviderAssignment` records and first performs bounded request-scoped synthesis from open planning input requests and accepted capacity-plan work units.
- Lease-renewal, return, complete, and fail routes update `ProviderAssignment` lifecycle state with runner id, lease token, lifecycle reason/code, and output summary.
- The provider runner in `@treeseed/agent` is assignment-only. Legacy task-claim routes remain for compatibility, but package-owned provider polling uses assignment lifecycle routes.
- Provider runners consume scoped project-agent assignment context and emit mode-run telemetry through the assignment route.

Acceptance criteria:

- A local provider can check in from an outbound-only environment.
- The API can issue an assignment lease without calling the provider inbound.
- A provider runner can complete or return a leased assignment and report usage.

Completed by Phase 3 and gap closure:

- Phase 3 implemented AgentKernel-native planning/acting execution and fallback behavior.
- Gap closure added deterministic synthesis from open planning input requests and accepted capacity-plan work units. Accepted decision execution inputs must first be aggregated into a durable capacity plan and accepted before acting assignments are synthesized. Synthesis from legacy task queues and long-running scheduler daemons remains out of scope.
- Project-scoped TreeDX proxy handles can be attached to synthesized assignments and all API proxy use is audited without exposing raw TreeDX credentials.

## Phase 3: Agent Kernel Mode Runtime

Status: implemented as a bounded assignment execution layer in `@treeseed/agent`. Provider assignments now execute through `AgentKernel.runAssignment`, and the provider runner no longer adapts assignment work into the legacy task execution path.

Goal: make planning and acting capacity first-class runtime modes.

Implemented boundaries:

- SDK exports Phase 3 kernel-mode contracts and pure helpers from `@treeseed/sdk/agent-capacity`, including assignment-to-envelope conversion, assignment-to-decision-input conversion, mode validation, and bounded fallback helpers.
- `AgentContext` carries optional assignment capacity context for provider-assigned work: selected mode, capacity envelope, decision input, project agent class/profile/policy, assignment id, provider id, readiness, and TreeDX proxy handle metadata.
- `AgentKernel.runAssignment` validates mode, lease, class/profile bounds, envelope scope, decision-input scope, acting readiness, and TreeDX proxy handle scope before resolving a project-owned handler.
- The provider runner executes leased assignments through `AgentKernel.runAssignment` and reports mode-run telemetry through the existing provider assignment route.
- Mode-run telemetry records running and terminal attempts with selected input, capacity envelope, validation/fallback detail, and lower-level `AgentRunTrace` references when handler execution reaches the trace path.
- Invalid or unsupported assignments are bounded and observable. Retryable runtime gaps can be returned when the provider client supports return semantics; non-retryable mode/profile violations fail without executing handlers.
- Existing legacy task routes remain available for compatibility, but the package-owned provider runner remains assignment-only.

Acceptance criteria:

- Planning and acting assignments are distinguishable in telemetry and usage.
- Handlers execute under a kernel-selected mode and cannot silently widen their allowed work.
- Fallback mode behavior is observable and bounded.

Still out of scope:

- Long-running scheduler daemons and synthesis from legacy task queues.
- Full optimization across all queues, provider pressure, and borrowing policies.
- Product-specific fallback proposal drafting beyond durable fallback-output records and bounded kernel outcomes.

## Phase 4: Admin And CLI Operator Surfaces

Status: Implemented as read-only operator visibility over capacity coordination records. Admin and CLI consume API/SDK surfaces; they do not schedule, synthesize, or lease work.

Goal: give operators enough visibility to trust allocation, assignment, and runtime behavior.

Implemented boundaries:

- Admin displays allocation-set versions, portfolio/project/agent-class allocation, planning/acting splits, provider sessions, assignment status, mode runs, usage, blockers, and drift between policy and actual usage.
- CLI exposes JSON-first commands for capacity plan inspection, provider status, session/assignment diagnostics, decision readiness, execution inputs, workday summaries, assignment explanations, local runtime proof, and mode-run inspection.
- UI and CLI must distinguish configuration, live observation, reconciler-backed lifecycle, and durable runtime records.
- Avoid making Admin or CLI own scheduling logic; both consume API/SDK contracts.

Acceptance criteria:

- Admin exposes `/app/capacity/runtime` with allocation-set versions, project agent classes, provider sessions, provider assignments, and project mode-run telemetry.
- CLI exposes `trsd capacity allocation-sets`, `agent-classes`, `provider-sessions`, `assignments`, `mode-runs`, `decision-planning`, `execution-inputs`, `workday`, `workday-summary`, and `assignment-explanation` as JSON-first read commands beside the existing lifecycle verbs.
- A developer can debug local provider lifecycle from CLI and inspect API-owned coordination records without reading provider-local files directly.
- Allocation policy and actual usage can be compared by project, agent class, mode, provider, and execution provider as the API emits those records.

Completed by Phase 5 and gap closure:

- Phase 5 implemented live acceptance proof capabilities for local and Railway capacity runtime assignment diagnostics.
- Assignment explanation records now show why synthesized or explicit work was eligible, including readiness gates and source records.
- Mutating operator workflows for assignment repair beyond existing controlled API fixture creation.

## Phase 5: Reconciliation And Live Proof

Status: implemented as live-test capacity runtime proof inside the SDK reconciliation acceptance framework. Local and Railway acceptance expose runtime proof capabilities while keeping assignment records API-owned.

Goal: keep provider lifecycle exact-state and prove the runtime through local and hosted checks.

Implemented boundaries:

- Keep `trsd capacity build/up/status/logs/down/test-local` focused on provider runtime lifecycle and diagnostics.
- Reconcile provider registration, secrets, local Docker runtime, hosted runtime, images, health, and cleanup through SDK reconciliation.
- Do not reconcile provider sessions, assignments, leases, mode runs, or usage actuals as infrastructure resources. Those are API control-plane records.
- Live/provider acceptance includes probe-only runtime capabilities:
  - local `capacity-provider-assignment-proof`
  - Railway `capacity-provider-runtime-assignment-proof`
- Runtime proof creates a tagged diagnostic assignment through the existing team assignment API, checks in with the provider API key, leases the assignment, emits mode-run telemetry, completes the assignment, and verifies mode-run visibility.
- Diagnostic records are retained as API audit evidence tagged with the live-test run id. They are not cleaned up by infrastructure cleanup.
- Hosted acceptance remains explicit: run cleanup before and after full Railway acceptance.

Acceptance configuration:

- `TREESEED_CAPACITY_ACCEPTANCE_API_URL`
- `TREESEED_CAPACITY_ACCEPTANCE_ADMIN_TOKEN`
- `TREESEED_CAPACITY_ACCEPTANCE_TEAM_ID`
- `TREESEED_CAPACITY_ACCEPTANCE_PROJECT_ID`
- `TREESEED_CAPACITY_ACCEPTANCE_PROVIDER_ID`
- `TREESEED_CAPACITY_ACCEPTANCE_AGENT_CLASS_ID`
- `TREESEED_CAPACITY_PROVIDER_API_KEY`

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
