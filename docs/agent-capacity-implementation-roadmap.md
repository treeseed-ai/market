# Agent Capacity Implementation Roadmap

**Status:** Canonical implementation roadmap  
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
- `@treeseed/api` owns durable control-plane state, API routes, assignment selection, provider sessions, leases, reservations, usage settlement, and TreeDX proxy authorization.
- `@treeseed/admin` owns browser operator surfaces over API contracts.
- `@treeseed/cli` owns operator commands over SDK/API/agent public surfaces.
- `@treeseed/core` owns web runtime composition. It does not own provider scheduling, AgentKernel execution, or capacity assignment logic.
- `packages/treedx` remains product-neutral. Treeseed maps project and capacity semantics outside TreeDX.

## Phase 1: Contracts And Durable Records

Goal: create the shared language and persistence substrate before changing runtime behavior.

Implementation requirements:

- Add SDK-owned contracts for allocation sets, project agent classes, agent kernel policy/profile, capacity envelopes, decision execution input, capacity plans, provider availability sessions, provider assignments, mode runs, and usage settlement.
- Add API migrations and route descriptors for provider check-in sessions, assignment leases, mode run telemetry, reservations, and allocation-set versions.
- Preserve compatibility with the current task-claim provider protocol during migration. New records may be introduced beside existing task records, but new docs and new code should use the assignment/session names.
- Define conversion boundaries from existing `CapacityProvider`, execution-provider observations, `CapacityGrant`, current `CapacityPlan`, and usage actuals into the new domain model.
- Add fixture data for one team, two projects, two project agent classes, one local provider, one OpenAI-like execution provider, one planning assignment, and one acting assignment.

Acceptance criteria:

- SDK exports the new types from canonical paths without importing agent runtime code.
- API can persist and read allocation sets, provider sessions, assignments, and mode runs.
- Existing capacity provider tests still pass while the new records are present.

## Phase 2: Provider Check-In And Assignment Lifecycle

Goal: move coordination from task claiming toward provider-initiated availability sessions and leased assignments.

Implementation requirements:

- Add provider check-in routes that record availability, grants, execution providers, native limits, runner pressure, and provider-local constraints.
- Add next-assignment, lease-renewal, return, complete, and fail routes around `ProviderAssignment`.
- Keep the API assignment function request-scoped, deterministic, bounded, idempotent, and explainable.
- Ensure assignments carry project-scoped TreeDX proxy handles, not raw TreeDX credentials.
- Update the provider manager in `@treeseed/agent` to check in, receive assignments, renew leases, and dispatch provider runners.
- Update provider runner behavior to consume a scoped project agent assignment context.

Acceptance criteria:

- A local provider can check in from an outbound-only environment.
- The API can issue an assignment lease without calling the provider inbound.
- A provider runner can complete or return a leased assignment and report usage.

## Phase 3: Agent Kernel Mode Runtime

Goal: make planning and acting capacity first-class runtime modes.

Implementation requirements:

- Move mode selection into `@treeseed/agent` AgentKernel behavior, not handler conventions.
- Accept an `AgentCapacityEnvelope` and `DecisionExecutionInput` when executing bounded work.
- Split planning and acting budgets according to allocation policy, readiness, class policy, and assignment constraints.
- Emit `AgentModeRun` telemetry for every bounded planning or acting attempt.
- Keep existing `AgentRunTrace` behavior as handler/runtime trace detail until replaced by mode-run-native telemetry.
- Define fallback behavior for exhausted planning queues, exhausted acting queues, weak proposals, missing estimates, provider pressure, and insufficient capability.

Acceptance criteria:

- Planning and acting assignments are distinguishable in telemetry and usage.
- Handlers execute under a kernel-selected mode and cannot silently widen their allowed work.
- Fallback mode behavior is observable and bounded.

## Phase 4: Admin And CLI Operator Surfaces

Goal: give operators enough visibility to trust allocation, assignment, and runtime behavior.

Implementation requirements:

- Admin displays allocation-set versions, portfolio/project/agent-class allocation, planning/acting splits, provider sessions, assignment status, mode runs, usage, blockers, and drift between policy and actual usage.
- CLI exposes JSON-first commands for capacity plan inspection, provider status, session/assignment diagnostics, local runtime proof, and mode-run inspection.
- UI and CLI must distinguish configuration, live observation, reconciler-backed lifecycle, and durable runtime records.
- Avoid making Admin or CLI own scheduling logic; both consume API/SDK contracts.

Acceptance criteria:

- A steward can answer why a provider received or did not receive an assignment.
- A developer can debug a local provider from CLI without reading provider-local files directly.
- Allocation policy and actual usage can be compared by project, agent class, mode, provider, and execution provider.

## Phase 5: Reconciliation And Live Proof

Goal: keep provider lifecycle exact-state and prove the runtime through local and hosted checks.

Implementation requirements:

- Keep `trsd capacity build/up/status/logs/down/test-local` focused on provider runtime lifecycle and diagnostics.
- Reconcile provider registration, secrets, local Docker runtime, hosted runtime, images, health, and cleanup through SDK reconciliation.
- Do not reconcile provider sessions, assignments, leases, mode runs, or usage actuals as infrastructure resources. Those are API control-plane records.
- Add live/provider acceptance that can create an isolated provider runtime, check in, receive a diagnostic assignment, report usage, and clean up infrastructure.
- Run cleanup before and after full live provider acceptance.

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
