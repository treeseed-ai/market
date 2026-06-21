# Governance And Capacity Allocation As A Deterministic Proof

**Status:** Proposed canonical explanatory model for governance and capacity allocation
**Date:** 2026-06-21
**Audience:** SDK, API, agent runtime, provider runtime, Admin, CLI, and integration implementers

This document states the TreeSeed governance and capacity model as a small deterministic proof. It does not replace the operational architecture in [Human-Machine Execution Providers](./human-machine-providers.md), [Agent Capacity Domain Model](./agent-capacity-domain-model.md), [TreeSeed Capacity Provider, Agent Execution, and Coordination Architecture](./capacity_provider_agent_coordination_architecture.md), or [Agent Kernel Mode Runtime](./agent-kernel-mode-runtime.md). It makes explicit the mathematical structure already present in those documents and in the provider assignment lifecycle.

The claim is simple:

```text
Given a fixed API state and a fixed provider principal, TreeSeed capacity routing is a deterministic selection over a finite ordered set of eligible assignments.
```

The proof matters because humans, AI execution providers, deterministic workflows, and issue queues all enter the same lifecycle:

```text
governance demand
  -> capacity policy
  -> provider supply
  -> eligibility gates
  -> deterministic lease
  -> bounded execution
  -> settlement
```

## 1. Formal Model

Let the durable API state at time `t` be `S_t`.

`S_t` contains finite sets:

```text
T  = teams
Pj = projects
D  = decisions, proposals, objectives, and questions
R  = planning input requests
CP = accepted, scheduled, active, or draft capacity plans
WU = capacity-plan work units
C  = project agent classes
A  = project agent definitions and handlers
PV = capacity providers
EP = execution providers
PS = provider availability sessions
G  = provider grants and capability grants
WD = workday capacity envelopes
PA = provider assignments
RS = capacity reservations
MR = agent mode runs
LE = ledger entries
```

For a provider principal `p`, define:

```text
provider(p) = the capacity provider authenticated by p
team(p)     = the team authenticated by p
session(p)  = the selected open provider availability session, if one exists
```

The API owns `S_t`. The provider may report supply into `S_t`, but the provider does not directly choose project priorities, approve decisions, mutate allocation policy, or create arbitrary project work.

## 2. Allocation As Narrowing

TreeSeed capacity policy is a sequence of narrowing functions:

```text
native provider capacity
  -> team monthly allowance
  -> workday allowance
  -> project portfolio allowance
  -> project agent-class allowance
  -> planning/acting mode allowance
  -> provider assignment reservation
```

Let `B_0` be the available capacity expressed in TreeSeed credits for a team and accounting window. Each allocation layer is a function:

```text
N_i(B_i, policy_i) = B_{i+1}
```

where `B_{i+1}` is a set of slices whose total spendable capacity is bounded by `B_i`, except where an explicit policy records a hold, reserve, borrow, or overrun.

**Lemma 1: Allocation monotonicity.**

For every normal allocation layer `N_i`, the next allowance does not create unrecorded capacity:

```text
sum(B_{i+1}) <= B_i
```

If `sum(B_{i+1}) > B_i`, the excess must be represented as an explicit reserve, borrowing decision, emergency policy, or overrun hold in durable API records.

**Proof sketch.**

Allocation sets are policy records. They divide an upstream envelope into downstream slices. A downstream assignment can reserve capacity only by referencing a workday, allocation set, grant, and reservation. Therefore a lower layer cannot silently widen capacity. It can only consume, reserve, release, or explicitly mark overrun against the upper layer. This proves monotonicity for normal routing and auditability for exceptional routing.

## 3. Demand Synthesis

Demand enters assignment routing through two canonical families:

```text
planning demand = open PlanningInputRequest records
acting demand   = accepted, scheduled, or active CapacityPlan work units
```

Define synthesis:

```text
Synth_p(S_t) -> PA_synth
```

For provider principal `p`, `Synth_p` reads bounded portions of `R` and `CP`, then proposes provider assignments for `provider(p)`.

For planning:

```text
key = "planning:" + planningInputRequestId + ":" + capacityProviderId
```

For acting:

```text
key = "capacity-plan:" + capacityPlanId + ":" + workUnitId + ":" + capacityProviderId
```

**Lemma 2: Idempotent synthesis.**

For fixed `S_t` and `p`, synthesis creates at most one assignment per synthesis key.

**Proof sketch.**

The synthesis key is a stable function of the source record and provider id. Before creating an assignment, the API checks existing assignment keys for the provider. If the key already exists, synthesis skips it. If the key does not exist, the created assignment receives the stable key. Repeated synthesis over unchanged state therefore reaches a fixed point.

## 4. Eligibility

For a candidate assignment `x` and provider principal `p`, define:

```text
Eligible(S_t, p, x) =
  provider_active(S_t, p)
  AND session_open(S_t, p)
  AND within_availability_window(S_t, p, t)
  AND capability_covered(S_t, p, x)
  AND checked_in_grant_exists(S_t, p, x)
  AND workday_active_if_present(S_t, x)
  AND acting_ready_if_acting(S_t, x)
  AND capacity_plan_ready_if_acting(S_t, x)
  AND allocation_available_if_reserving(S_t, p, x)
  AND runner_pressure_has_room(S_t, p)
```

Capability coverage is set inclusion:

```text
requiredCapabilities(x) subset_of availableCapabilities(session(p), provider(p))
```

Readiness for acting is:

```text
executionReadiness in {ready, waived}
AND planningInputsStatus in {complete, waived}
AND capacityPlanStatus in {accepted, scheduled, active}
```

The reason list for an ineligible candidate is the set of failed predicates, encoded with stable reason codes such as:

```text
provider_inactive
provider_session_not_open
outside_availability_window
missing_required_capability
missing_checked_in_grant
missing_active_grant
workday_not_active
decision_readiness_not_ready
capacity_plan_not_ready
runner_pressure_exhausted
allocation_exhausted
```

**Lemma 3: Eligibility is predicate intersection.**

A candidate is eligible if and only if every gate predicate is true.

**Proof sketch.**

Eligibility begins with an empty reason list. Each failed predicate appends one or more stable reasons. The API returns `eligible = true` exactly when the reason list is empty. Therefore eligibility is the intersection of all required gates, and every rejection is explainable by the complement.

## 5. Deterministic Lease Selection

Let `L_p(S_t)` be the finite set of leasable assignments for provider principal `p`:

```text
L_p(S_t) = {
  x in PA |
    x.teamId = team(p)
    AND x.capacityProviderId = provider(p)
    AND x.status in {pending, returned, leased}
    AND (
      x is pending and unleased
      OR x is returned and released
      OR x lease is expired
    )
}
```

Let:

```text
E_p(S_t) = { x in L_p(S_t) | Eligible(S_t, p, x) }
```

Define a total ordering `Order` over assignments using stable fields:

```text
priority descending,
assignedAt ascending,
createdAt ascending,
id ascending
```

The lease function is:

```text
Lease(S_t, p) =
  null, if E_p(S_t) is empty
  first(Order(E_p(S_t))), otherwise
```

**Theorem 1: Unique deterministic lease.**

For fixed `S_t` and `p`, `Lease(S_t, p)` returns either no assignment or exactly one assignment, and repeated evaluation over unchanged state returns the same result.

**Proof.**

`PA` is finite, so `L_p(S_t)` is finite. `E_p(S_t)` is a subset of `L_p(S_t)`, so it is finite. If `E_p(S_t)` is empty, the function returns `null`. If it is non-empty, `Order` is total because assignment ids break ties. Every finite non-empty totally ordered set has a unique first element. Since all predicates and ordering fields are read from fixed `S_t`, repeated evaluation over unchanged state returns the same element.

**Corollary: Assignment routing is reproducible and explainable.**

For any rejected candidate, `ProviderAssignmentExplanation` can record the failed predicate reasons and gate values. For the selected candidate, metadata can record the evaluated gates. Therefore the routing decision can be reconstructed from durable state.

## 6. Bounded Execution

Leasing authorizes only the assignment. It does not authorize arbitrary provider work.

Define:

```text
KernelRun(x) -> result
```

where `x` is the leased assignment and the kernel receives:

```text
assignment
capacity envelope
decision execution input
project agent class/profile/policy
agent definition
handler id
readiness metadata
capability handles
TreeDX proxy handle, when present
```

The kernel validates:

```text
mode in {planning, acting}
capacity envelope exists
decision input exists
agent spec exists and is enabled
handler exists
handler is allowed for mode
acting readiness holds for acting mode
capability handles are scoped and non-secret
TreeDX proxy handle matches assignment scope
output status and type are allowed
retry and fallback limits are bounded
```

**Lemma 4: Kernel safety.**

`AgentKernel.runAssignment` cannot complete work outside the leased assignment without violating its input validation or output validation gates.

**Proof sketch.**

The kernel derives execution context from the assignment and capacity envelope. If required context is missing, expired, unsupported, not ready, or incompatible with the selected handler, the kernel returns a bounded fallback result. If the handler executes but emits an output outside the assignment contract, output validation fails. Therefore successful completion implies the assignment's mode, agent, handler, scope, and output contract were satisfied.

## 7. Settlement Conservation

Let a reservation be:

```text
r = (reservedCredits, consumedCredits, releasedCredits, refundedCredits, holdCredits)
```

At assignment lifecycle boundaries, the API records ledger phases such as:

```text
task_started
task_completed_actual_settlement
reservation_released
task_failed_refund
overrun_hold
```

Define settlement as:

```text
Settle(r, event) -> r'
```

with the invariant:

```text
reservedCredits =
  consumedCredits
  + releasedCredits
  + refundedCredits
  + stillReservedCredits
  + explicitlyHeldCredits
```

where `explicitlyHeldCredits` is non-zero only when policy records an overrun hold or related exception.

**Lemma 5: Settlement conservation.**

Assignment lifecycle settlement moves reserved capacity into consumed, released, refunded, still-reserved, or explicitly-held states. It does not grant providers hidden capacity.

**Proof sketch.**

Providers can report status, outputs, usage observations, failures, and returns. They cannot mutate allocation policy or ledger interpretation. The API records lifecycle transitions and ledger entries against the assignment, reservation, provider, project, mode, workday, and capacity plan provenance. Therefore every capacity movement is either conserved inside the reservation envelope or explicitly represented as an exception.

## 8. Governance Direction Prioritization

Direction prioritization is also deterministic once policy and readiness are fixed.

Let:

```text
DemandScore(d) =
  portfolioWeight(project(d))
  + agentClassWeight(class(d))
  + modeWeight(mode(d))
  + readinessBonus(d)
  + urgencyBonus(d)
  - blockerPenalty(d)
```

TreeSeed does not need this exact scalar formula everywhere. The important property is that any prioritization function used by the assignment path must be:

```text
bounded: only considers a finite candidate set
recorded: inputs are durable policy or demand state
stable: ties break by durable fields
explainable: rejected and selected candidates record reasons
non-authorizing: priority cannot bypass readiness, grants, capability, or allocation gates
```

**Lemma 6: Priority ranks candidates but does not authorize them.**

Priority affects ordering only after synthesis and eligibility gates. A high-priority work unit remains unleaseable if it lacks readiness, allocation, grants, provider capability, or runner room.

**Proof sketch.**

The lease function orders `E_p(S_t)`, not all demand. `E_p(S_t)` includes only candidates satisfying all authorization predicates. Therefore priority selects among authorized candidates; it cannot convert an unauthorized candidate into an authorized one.

## 9. Human-Machine Equivalence

Let an execution provider adapter be:

```text
ExecAdapter(kind) in {
  ai_model,
  deterministic_workflow,
  human_issue_queue,
  local_runner,
  external_job
}
```

The adapter changes how work is performed or coordinated. It does not change the assignment proof.

For every execution provider kind:

```text
same assignment
same eligibility gates
same lease token rules
same mode-run telemetry
same capability handle boundary
same completion, return, fail, and settlement lifecycle
```

**Theorem 2: Execution-provider neutrality.**

If two execution providers report the same relevant supply, capabilities, grants, pressure, and availability, then the API assignment proof treats them equivalently up to provider id and ordering fields.

**Proof sketch.**

Eligibility depends on recorded supply and policy predicates, not on whether the executor is a human, an AI model, or a deterministic workflow. Provider-specific mechanics happen behind the adapter after assignment. Therefore execution-provider kind is operationally important but not a separate authorization model.

## 10. Result

The governance and capacity model can be summarized as:

```text
Allocation narrows capacity.
Governance creates and readies demand.
Synthesis turns ready demand into stable candidate assignments.
Eligibility intersects provider supply with policy gates.
Ordering picks the unique first eligible candidate.
The kernel executes only the leased bounded assignment.
Settlement conserves or explicitly holds reserved capacity.
```

Therefore, for fixed durable state, TreeSeed capacity allocation and direction prioritization are deterministic mathematical operations over finite ordered sets. Human judgment remains essential in policy, approvals, readiness, and interpretation, but once those records exist, assignment routing is reproducible, bounded, and explainable.
