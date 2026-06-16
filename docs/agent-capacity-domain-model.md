# Agent Capacity Domain Model

**Status:** Canonical domain model for the agent capacity rearchitecture  
**Date:** 2026-06-16  
**Audience:** SDK, API, agent runtime, Admin, CLI, and integration implementers  

This document defines the shared implementation vocabulary for Treeseed agent capacity. It describes the model that SDK contracts, API records, agent runtime inputs, Admin views, and CLI reports should converge on.

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

## ProviderAssignment

A `ProviderAssignment` is a leased unit of work matched by the API and executed by a provider runner.

It includes:

- assignment id and lease state
- provider session id
- project id and agent class
- selected project agent/handler
- mode
- capacity envelope
- decision/proposal context
- TreeDX proxy handle when repository access is needed
- allowed outputs
- status, attempts, renewals, return reason, completion, or failure

Assignments replace ambiguous task-claim language for new coordination work. Existing task claim APIs may remain during migration, but new runtime behavior should use assignment/session semantics.

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
