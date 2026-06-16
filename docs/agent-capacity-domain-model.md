# Agent Capacity Domain Model

**Status:** Canonical domain model for the agent capacity rearchitecture  
**Date:** 2026-06-16  
**Audience:** SDK, API, agent runtime, Admin, CLI, and integration implementers  

This document defines the shared implementation vocabulary for Treeseed agent capacity. It describes the model that SDK contracts, API records, agent runtime inputs, Admin views, and CLI reports should converge on.

The canonical contract surface is exported from `@treeseed/sdk/agent-capacity`. Durable coordination records are stored by `@treeseed/api` through migrations `0005_agent_capacity_coordination.sql`, `0006_provider_assignment_lifecycle.sql`, and `0007_agent_architecture_gap_closure.sql`.

## Boundary Rule

Projects own work semantics. Capacity providers own execution capacity.

Project-owned examples:

- project agents
- agent classes
- handlers
- prompts and configuration
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

## ProjectAgentClass

A `ProjectAgentClass` groups project-owned agents by work semantics and capability needs.

It includes:

- project id
- class id and slug
- allowed modes, such as planning, acting, or both
- eligible agent definitions and handlers
- required execution capabilities
- output types
- policy defaults
- class-level allocation targets

Provider capabilities are matched against class requirements, but providers do not define the project class vocabulary.

## AgentKernelProfile

An `AgentKernelProfile` describes how a project agent can run inside the kernel.

It includes:

- agent id, slug, class id, and handler id
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
- team allowance
- project allowances
- agent-class allowances
- planning/acting allowances
- reserves and borrowing rules
- current reservations and actual usage

Workdays are not provider calendars. Providers participate by checking in with availability sessions that may overlap all or part of a workday.

## AgentCapacityEnvelope

An `AgentCapacityEnvelope` is the bounded runtime budget passed to the AgentKernel for one selected assignment.

It includes:

- project id and agent class
- mode
- budget units and native-unit hints
- lease and reservation ids
- provider and execution-provider ids
- capability grants
- deadline and renewal constraints
- allowed output types
- fallback limits

The kernel must not expand beyond the envelope. Actual usage is reported against the same envelope.

## DecisionExecutionInput

A `DecisionExecutionInput` is the project/governance context selected for a planning or acting run.

It includes:

- objective, question, proposal, or decision references
- readiness state
- required planning inputs or approved acting scope
- repository/workspace context
- relevant notes and prior outputs
- expected output contract
- audit and trace references

Planning inputs can target unresolved proposals, weak proposals, estimates, comparisons, and summaries. Acting inputs must be tied to approved work.

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

- provider id
- check-in time and availability window
- execution providers and capabilities
- grants and scopes
- native limits, observations, and confidence
- runner pressure and concurrency
- provider-local constraints
- session status

Providers create and refresh sessions by outbound check-in. The API must not require inbound access to provider machines.

Provider sessions are recorded through `/v1/provider/sessions` and `/v1/provider/check-in`. Check-in records generic supply: availability, execution providers, native limits, grants, capabilities, runner pressure, and provider-local constraints. The API also performs bounded request-scoped synthesis from existing readiness/planning records before leasing work. Providers still do not invent project work.

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

Assignments replace ambiguous task-claim language for new coordination work. Existing task claim APIs may remain during migration, but new runtime behavior should use assignment/session semantics.

Assignments can be explicit control-plane records or synthesized records. Explicit assignments remain useful for fixtures, diagnostics, and acceptance proof. Synthesized assignments are created deterministically from open planning input requests and accepted capacity-plan work units during provider check-in or next-assignment polling. Accepted decision execution inputs are planning artifacts until they are aggregated into a durable capacity plan and accepted. Synthesis is idempotent through a stable synthesis key and produces an assignment explanation record.

Durable `AgentCapacityPlanRecord` entries are API-owned acceptance gates. They aggregate accepted `DecisionExecutionInput` records into work units with expected/high credits, capability needs, dependencies, blockers, assumptions, risk, and scoped capacity envelopes. Acting synthesis uses only accepted, scheduled, or active plan work units unless a future emergency policy explicitly records a bypass.

The lifecycle leases assignments through `/v1/provider/assignments/next` and updates state through renew, return, complete, and fail routes. Leased assignments execute through `@treeseed/agent` `AgentKernel.runAssignment`.

Lease rules:

- `pending/unleased`, `returned/released`, and expired `leased` assignments are eligible for next-assignment polling.
- A next-assignment response leases one existing assignment for the authenticated provider and returns a lease token.
- Renew, return, complete, and fail operations require the current provider key and the active lease token.
- Retryable failures return the assignment to the eligible pool; non-retryable failures end as failed.

## ProviderAssignmentExplanation

An assignment explanation records why a candidate was eligible or blocked. It includes source, source record id, eligibility result, readiness, capability, grant, allocation and policy gates, allocation policy version when known, and human-readable reasons.

Providers can read their assignment explanation through provider-key routes. Operators can read the same explanation through team-scoped routes.

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

Phase 1 records mode-run telemetry and can link it to usage actuals. Phase 3 emits mode-run telemetry from the AgentKernel assignment runtime: a running attempt when bounded execution begins and a terminal attempt when the handler succeeds, fails, cancels, or the kernel produces a bounded fallback.

`AgentRunTrace` remains useful as lower-level handler/runtime trace detail. `AgentModeRun` is the durable control-plane record that connects mode, assignment, capacity envelope, output, and usage.

## Usage And Ledger Settlement

Usage actuals connect native provider observations to TreeSeed accounting.

They include:

- assignment id, mode run id, reservation id, provider id, execution-provider id
- native units consumed
- derived credits
- confidence level
- unused/returned capacity
- errors, retries, and partial outputs
- ledger entry ids

The API settles usage into the capacity ledger. Providers report native observations; TreeSeed derives and records provider-neutral accounting.

`WorkdayCapacityEnvelope` records can be started, paused, completed, and summarized through `/v1/workdays`. Summaries combine envelope policy, assignments, mode runs, usage actuals, ledger entries, release/refund calculations, native usage snapshots, and provider-confidence warnings. The summary is an API control-plane read model; it is not reconciled infrastructure.

## TreeDX Proxy Handle

Assignments may carry a project-scoped `TreeDxProxyHandle`. The handle identifies project, optional assignment, repository/workspace scope, allowed operations, and expiry. It is not a TreeDX service credential.

Provider runners call `/v1/dx/projects/:projectId/...` with their provider API key. The API verifies provider/team/project/assignment scope, resolves the TreeDX node, forwards only allowed project operations, and records proxy audit evidence. Raw TreeDX credentials must not appear in assignment payloads, logs, Admin, CLI, or provider reports.

## Fallback Output

`AgentFallbackOutput` records bounded fallback outputs, such as planning documentation drafts or weakness proposal drafts. The record carries mode, fallback code, output payload, provenance, quota information, and duplicate/quota state. Product-specific fallback drafting remains handler/policy-owned; the capacity layer only records and gates it.
