# Capacity Provider and Agent Coordination Architecture

**Status:** Canonical current architecture
**Last updated:** 2026-07-17
**Completion authority:** [Agent Capacity Completion and Production-Readiness Plan](./agent-capacity-completion.md)

## Purpose

This document defines the single coordination architecture for external capacity providers, team governance, work allocation, API-side assignment, provider-local execution, and AgentKernel operation. It replaces the former single-team provider, permanent API-key, check-in grant assertion, opaque/team-authored lane, and team-owned execution-provider designs. Canonical provider-global execution providers and provider-native lanes remain required target entities.

## Ownership

| Owner | Responsibility |
| --- | --- |
| `@treeseed/sdk` | Portable contracts, validation, allocation/admission policy, lifecycle primitives, provider-neutral helpers |
| `@treeseed/api` | Durable governance, availability, allocation, admission, reservations, assignment leases, workdays, usage, settlement, audit, TreeDX authorization |
| `@treeseed/agent` | Provider identity and manifest, multi-team provider manager, global runner scheduling, provider-local enforcement, AgentKernel, handlers and execution adapters |
| `@treeseed/cli` | Complete human/provider operator surface over API, SDK, and reconciliation contracts |
| Projects/starters | Agents, classes, prompts, activity profiles, planning/acting permissions, output contracts, and project work semantics |
| TreeDX | Product-neutral content/repository storage and operations |

Admin UI is a future consumer. It is not a scheduler or source of policy. Every backend action exists first as API and CLI/config behavior.

## Trust and Registration

Each provider installation owns one Ed25519 identity. Its private key never leaves provider-controlled secret storage. The API stores a global provider identity derived from the public-key fingerprint, allowing the same provider to join multiple teams.

Each team owns one current regeneratable broadcast registration key. A provider uses that key only to submit a signed membership request. Team approval creates an approved provider/team membership, but creates no grant, allocation, reservation, or assignment.

After approval the provider exchanges signed proof for a one-time membership credential. That credential mints short-lived membership access tokens. Credentials, tokens, memberships, and provider identity are independently revocable. Registration-key rotation cancels requests from the old generation without disrupting approved memberships.

Every signed proof binds algorithm, public-key fingerprint, identity version, method, canonical path, audience, request-body digest, issue/expiry time, and a one-use nonce. Mutations are idempotent and auditable.

## Provider Manifest and Multi-Team Runtime

One provider manifest declares provider-global execution capacity and multiple independently governed team connections:

```yaml
schemaVersion: 2
identity:
  displayName: Shared Engineering and Research Capacity
  privateKeyRef: secret://capacity/provider-identity
executionProviders:
  - id: codex-primary
    adapter: codex
    nativeLimits:
      maxConcurrentRunners: 4
    capabilities: [engineering, research]
connections:
  - id: team-a
    marketProfile: staging
    teamId: team-a
    providerId: provider-shared
    membershipId: membership-team-a
    membershipCredentialRef: secret://capacity/team-a
    membershipCredentialId: credential-a
    offer:
      sharePercent: 60
      maxConcurrentRunners: 3
      capabilities: [engineering, research]
  - id: team-b
    marketProfile: staging
    teamId: team-b
    providerId: provider-shared
    membershipId: membership-team-b
    membershipCredentialRef: secret://capacity/team-b
    membershipCredentialId: credential-b
    offer:
      sharePercent: 40
      maxConcurrentRunners: 1
      capabilities: [research]
```

The broadcast registration key is one-time `provider join` input and is never a manifest field. A new manifest may have `connections: []`. After approval and one-time credential exchange, the provider coordinator writes the credential to its secret store and atomically materializes the complete membership-scoped connection. Provider manager and runner startup accept only these approved credential-backed connections.

Connections may narrow, but never widen, provider-global capability or limits. A single provider manager reconciles connections independently. A weighted-deficit scheduler reserves a locked durable provider-global/per-connection claim before polling team assignments, preventing cross-process and restart double spend. The claim is bound to assignment/lease identity as soon as the poll succeeds and remains until durable completion, return, failure, or confirmed recovery. Manager availability reads shared pressure from this state but never exposes another team's assignment identity. Failure, suspension, expiry, or token refresh for one connection does not block another.

Providers initiate outbound traffic only. The API never needs inbound connectivity to a provider host.

## Availability Is Supply, Not Authority

An approved membership access token creates one expiring availability session. Refresh uses an expected sequence so concurrent or stale managers cannot overwrite current state. Opening a replacement session closes the previous open session for that membership.

Request-scoped assignment synthesis requires that same approved membership and active global provider identity plus one exact open membership-scoped session. An explicit session id is never replaced by another open session. Its availability window and environment must match the request, and database uncertainty fails the synthesis request instead of becoming empty or permissive policy state. Lease selection independently revalidates durable membership, provider, reservation, grant, allocation, workday, and session authority.

Authenticated next-assignment polling and explicit idempotent workday ticks are request-scoped demand-compilation triggers. Provider availability records supply but do not schedule work, and terminal assignment transitions do not start a background queue. One typed compiler persists source-neutral demand and propagates TreeDX, planning-input, capacity-plan, and durable-state uncertainty. One assignment function claims demand and invokes canonical admission. Admission denials for demand that does not yet have an assignment are append-only `capacity_audit_events`; admitted assignments alone own assignment explanations. Team operators can inspect the audit ledger and invoke tick, cancellation, and safe requeue through API and CLI.

The snapshot contains:

- environment and availability window;
- provider-global execution-provider declarations relevant to the connection;
- capabilities narrowed by the connection offer;
- native budgets and remaining capacity;
- active/global runner pressure;
- provider-local constraints and diagnostic metadata.

The snapshot never grants project access. Provider-asserted grants are ignored. Team-owned active grants and allocation sets are the only authorization and budget policy.

## Allocation and Admission

Teams publish immutable, versioned allocation sets containing reserve policy, project slices, optional agent-class/mode children, and explicit borrowing rules. Every slice declares target, minimum, maximum, and hard-cap percentages.

A membership-scoped grant identifies the provider, project, environment, allowed execution-provider IDs, required capabilities, allowed modes, credit limits, concurrency, expiry, and status. Unlimited capacity is explicit; absence of a limit is not interpreted as unlimited.

The only admission evaluator is `evaluateCapacityAdmission` in `@treeseed/sdk`. The API loads authoritative membership, session, grant, workday, allocation, counter, provider, and acting-provenance state. In one transaction it:

1. evaluates every gate and stable denial reason;
2. inserts the uniquely keyed reservation with a transaction-local admission token;
3. debits hard-limit counters only when that token won the idempotency race;
4. records the reservation counter claims;
5. creates the provider assignment with exact policy provenance and brokered capability handles.

No direct assignment writer may bypass this transaction.

Admission and replay strictly decode durable allocation, grant, workday, availability-session, class, reservation, and assignment JSON through one API primitive. Malformed governance evidence is never normalized into empty/default policy.

HTTP mutation input is also strict and single-owner. Extracted capacity routes and the remaining inline planning, capacity-plan, provider-assignment, mode-run, and assignment-operation routes call one request-object decoder. It permits an empty body only where the route explicitly declares it optional and rejects malformed JSON or any null, array, or primitive root with a stable 400 before mutation; parser failure is never converted to `{}`.

## Workdays and Assignment Function

A workday is duration- and budget-bounded. The API assignment function is deterministic, request-scoped, indexed, idempotent, and explainable. It runs only when an authenticated provider polls for work; API transitions persist source state but never enqueue an alternative synthesis path.

Starting a workday consumes existing team governance and project configuration. A convenient CLI selector such as `local` must first resolve to one globally stable provider id through approved membership plus open local availability; it is never persisted as a provider identity. The scheduler fails closed before mutation unless every requested project exists, the active allocation is effective and covers it, one planning grant is unambiguous, and a TreeDX repository binding already exists. Scheduler failure is a durable failed run, and any partially created envelopes are terminalized without changing grants, allocations, or TreeDX bindings.

Every scheduled envelope records its exact owning workday run through an indexed foreign key. Terminalization and recovery use only that relationship, never an envelope-id prefix. After a partial scheduling failure, the API attempts exact envelope closure, the failure event, and the failed-run transition independently; inability to confirm any required recovery record is itself a visible control-plane failure.

Planning remains productive without approved decisions: agents may ask questions, propose work, estimate, review, create linked notes, structure knowledge, and summarize evidence. Every eligible configured planning agent participates before any agent repeats. If duration, budget, and useful demand remain, later cycles may be synthesized.

One typed workday compiler reads active runs through a strict repository, resolves the complete requested project set, reads TreeDX content and bounded artifact context, advances durable participation cycles, and writes idempotent positive demand. One assignment function claims a demand, delegates it to canonical admission, and provisions deterministic TreeDX workspaces only after admission through a recoverable handle state. Corrupt JSON, source/storage failure, missing or ambiguous projects, and a collection beyond its processing bound fail visibly; they are never converted into a shorter successful workday.

Before admission, one API compiler resolves the assignment's project, owning team, architecture, and repository context. Missing ownership or an uncertain architecture/repository read is a control-plane failure; neither the assignment function nor provider runtime may invent fallback project context.

TreeDX workspace creation is replay-stable and bounded. The API derives the expected id from the assignment, validates brokered inputs, streams no more than the declared response limit, strictly decodes JSON, and rejects an upstream id mismatch. Workspace uncertainty prevents admission rather than being deferred to the provider runner.

Acting additionally requires an approved decision, ready execution input, and accepted/scheduled/active capacity-plan provenance. Providers cannot invent demand, select broader work, approve decisions, or change policy.

Assignments contain only the selected project/class/agent/handler/mode, reserved envelope, policy and readiness provenance, allowed output contract, and short-lived brokered capability handles. They never contain reusable team/provider secrets.

## Provider Assignment Lifecycle

The provider runner requests the next assignment using a membership access token and declared runtime capabilities. The API atomically leases one eligible assignment and returns an opaque lease token. Only the owning membership, runner, current state version, and current lease token may renew, return, complete, or fail it.

Assignment persistence has one typed repository, and next-assignment acquisition has one typed lease service. The lease service validates the lease duration before synthesis, reads a bounded candidate set, calls the sole lease-authority evaluator, records required diagnostics, and performs the state-version compare-and-swap. Durable assignment JSON, mode, or state-version corruption is a visible control-plane error; it is never normalized into eligible work.

Retryable failure returns the assignment and releases the lease. Terminal failure settles its reservation exactly once. Successful execution records a mode run, artifact manifest, usage actual, settlement, and then completes the assignment. Revocation, stale lease, deadline expiry, explicit terminalization, terminal-run recovery, and local-workday supersession use one typed API terminalization primitive rather than alternative mutation paths. Settlement must commit before assignment state advances; uncertainty remains visible and recoverable. Terminal transitions use assignment state-version compare-and-swap, and fallback evidence is persisted under a stable assignment-attempt identity before a lease is released.

An expired lease is never silently re-leased. Before assignment selection, the API runs bounded team/provider recovery; operations-runner maintenance runs the same owner globally. Durable evidence classifies the abandoned attempt as reservation-preserving safe retry, retry-exhausted terminal failure, recovered completion, or operator action. Exhausted attempts settle through the sole settlement service, while assignment, orphan mode-run, demand/participation, and audit transitions commit in one state-version-CAS batch. A settlement committed before interruption is recognized on replay and converged; uncertain usage, TreeDX, fallback, or settlement evidence remains visibly expired and cannot be requeued until its financial claim is resolved.

There is no secondary project-runner task queue. The API exposes no task claim/event/complete lifecycle, the SDK exposes no runner-task client, and the clean schema contains no runtime task/event/output tables. Because the capacity system has not launched, the clean reset baseline omits those tables instead of retaining an additive compatibility cleanup migration; assignment and mode-run evidence remains authoritative.

There is also no project-runner manager-lease, worker-runner, repository-claim, or runner-scale lifecycle. Provider availability sessions, assignments, leases, mode runs, and provider-manager telemetry are authoritative. Operations-runner workspace ownership remains separately modeled as `platform_repository_claims`; it is not an agent scheduling or capacity record.

Renew, return, complete, and fail share one typed lifecycle service. Every operation requires current provider/membership ownership, the current lease token, an unexpired lease, and state-version CAS. A stale runner cannot return, complete, fail, or settle work after lease expiry; completion additionally requires the assignment reservation to be consumed, while terminal failure settles before releasing the lease.

Mode-run delivery is replay-safe and required. The provider retries one stable assignment/event identity rather than minting a new phase id, and it does not acknowledge buffered execution-provider messages before durable acceptance. API persistence treats same-assignment replay as an idempotent update, rejects reuse of that identity by another assignment, and links usage only when the usage record belongs to the same team and assignment. Exhausted delivery returns or fails the lease with explicit diagnostics so execution never advances without its forensic control-plane record.

## AgentKernel and Content

`AgentKernel.runAssignment` is the sole production kernel entrypoint. It validates the assigned mode and class, loads project content through assignment-scoped TreeDX operations, resolves the configured activity profile, filters tools, invokes one execution adapter, validates one artifact manifest, and records telemetry.

Handlers route and validate; project configuration decides intent and artifact type. TreeDX tool receipts are the single owner of generated content. Handlers and the kernel must not perform a second local write. Every note links to its subject, and every artifact records assignment, mode run, agent/class/handler, TreeDX refs, sources/citations, verification, usage, signals, diagnostics, and errors.

## Usage and Settlement

Execution adapters report raw native/token/time facts through the membership-scoped usage endpoint before terminal settlement. The API stores every report under explicit idempotency, durable assignment-attempt, usage-dimension, and `informational | incremental | aggregate` accounting identity. Informational dimensions cannot carry credits. A reservation-owned report token serializes partial reports against the terminal settlement token. Terminal aggregate credits must cover accepted incremental credits, and summaries select the terminal aggregate rather than double-counting its dimensions. Settlement runs transactionally exactly once per reservation and ledger phase. The unique reservation/phase ledger fact is the durable authority. Replays return the canonical fact, while changed duplicate or underreported aggregate usage fails with a conflict. An overrun remains held until a team manager explicitly approves the bounded counter exception or rejects and releases it through the API/CLI; provider credentials cannot self-approve an overrun.

No second usage insert implementation or provider-kind inference scan exists. One focused usage service owns the insert operation shared by partial reporting and terminal settlement; settlement alone owns ledger/counter/reservation accounting. Current execution-provider facts come from the fully paginated provider/session projection, and typed usage repositories fail closed on malformed or unreadable durable evidence.

Derived native availability is windowed, never lifetime-based. A fresh provider observation is authoritative at its observation time; configured limits require an explicit supported reset cadence/window. The API aggregates reservation and settlement facts by provider, execution provider, native unit, scope, and accounting window, while SDK pure policy calculates the result. Unknown windows fail closed as unknown capacity. Diagnostic APIs expose bounded evidence windows and aggregate totals instead of loading or silently truncating reservation history.

## Canonical API Families

Team governance:

- `GET /v1/teams/:teamId/capacity-registration-key`
- `GET /v1/teams/:teamId/capacity-registration-key/reveal`
- registration-key rotate/enable/disable
- provider request list/show/approve/reject/cancel
- membership list/suspend/resume/revoke
- membership credential list/revoke
- grant list/show/create/activate/pause/resume/revoke
- allocation-set plan/list/show/create/activate/archive

Provider protocol:

- `POST /v1/provider-registrations`
- `GET /v1/provider-registrations/:requestId`
- `POST /v1/provider-registrations/:requestId/credential`
- `POST /v1/provider/access-tokens`
- availability-session create/refresh/close
- next/renew/return/complete/fail assignment
- assignment mode-run, workflow-operation, and settlement endpoints

Operator inspection covers workdays, assignments and explanations, execution runs, reservations, usage, ledger, audits, and TreeDX proxy audit. The CLI must expose equivalent operations with JSON output and plan/live mutation discipline.

## Durable Records

The target clean baseline contains global identities, team registration keys, requests, memberships, credentials, access tokens, proof nonces, audit events, availability sessions, provider-global execution providers and lanes, grants, allocation sets, workdays/participation/demand/work graphs, reservations, capacity-provider assignments, mode runs, usage actuals, ledger entries, and durable TreeDX proxy authorization/audit records. Admission persists any assignment proxy handle in the same transaction as its reservation and assignment. The durable handle row—not the embedded assignment context—is authoritative for API proxy authorization, including distinct read and write path scopes. The current baseline still diverges in entity names and omits execution-provider/lane entities; CAP-082 owns that Phase 1 correction.

Execution-provider inventory is not duplicated in team-owned tables. Current execution-provider facts come from validated provider manifests and unexpired availability snapshots.

## Required Guarantees

Production proof must cover registration rotation and replay, approval-without-authority, credential/token revocation, multi-team isolation, provider-global concurrency, authoritative grants, allocation hard caps and borrowing, atomic admission, lease CAS, exactly-once settlement, workday continuation/fairness, acting gates, TreeDX-only artifacts, complete trace, starter engineering/research workflows, interruption recovery, and CLI/API parity.

String, route-presence, mock-call-order, and file-presence tests are not sufficient evidence. Service workflows must exercise the real API database, provider manager, runner, kernel, TreeDX proxy, usage, and settlement paths.
