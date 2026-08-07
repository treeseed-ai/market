# Capacity Provider and Agent Coordination Architecture

## Seed reconciliation boundary

Local seeds may require a production-shaped capacity environment, but they do not become provider runtimes. SDK reconciliation provisions or adopts the signed identity and connection, the API remains authoritative for membership approval and capacity policy, and the Agent package starts the provider manager and runner from the generated runtime overlay. Reconciliation order prevents provider startup before team, project, TreeDX, membership-claim, grant, and allocation state exists. Matching unrelated providers are never adopted or revoked.

**Status:** Canonical current architecture
**Last updated:** 2026-07-21
**Completion authority:** [Agent Capacity Completion and Production-Readiness Plan](./agent-capacity-completion.md)

## Purpose

This document defines the single coordination architecture for external capacity providers, team governance, work allocation, API-side assignment, provider-local execution, and AgentKernel operation. It replaces the former single-team provider, permanent API-key, check-in grant assertion, opaque/team-authored lane, and team-owned execution-provider designs. Provider-global execution providers and provider-native lanes are canonical durable entities in the clean baseline.

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

Membership access tokens are intentionally short-lived. The durable membership credential is the renewal authority: the provider exchanges it with a fresh signed proof at each long-running starter or lifecycle boundary, and cleanup independently renews before closing sessions. A bootstrap token must not be captured and reused for a workday that can outlive it.

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

A membership-scoped grant identifies the provider, project, environment, allowed execution-provider IDs, required capabilities, allowed modes, daily/monthly agent-second limits, concurrency, expiry, and status. Unlimited agent time is explicit; absence of a limit is not interpreted as unlimited. Token, cost, and provider-native quota limits remain separate dimensions and are never converted into an additive score.

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

A workday is duration- and dimensional-capacity-bounded. Its time policy allocates agent-seconds among cooperative planning, governed execution, and reserve. The API assignment function is deterministic, request-scoped, indexed, idempotent, and explainable. It runs only when an authenticated provider polls for work; API transitions persist source state but never enqueue an alternative synthesis path.

Starting a workday consumes existing team governance and project configuration. A convenient CLI selector such as `local` must first resolve to one globally stable provider id through approved membership plus open local availability; it is never persisted as a provider identity. The scheduler fails closed before mutation unless every requested project exists, the active allocation is effective and covers it, one planning grant is unambiguous, and a TreeDX repository binding already exists. Scheduler failure is a durable failed run, and any partially created envelopes are terminalized without changing grants, allocations, or TreeDX bindings.

A workday run is the portfolio scheduling boundary and may own multiple project envelopes. Parallel project execution uses one provider-bound run, one envelope and grant cap per project, and provider/runner concurrency above those envelopes. Local same-provider successor semantics deliberately terminalize an older run; creating one run per project would therefore be replacement, not concurrency. Team-scoped mutation receipts require project identity in every project-agent-class idempotency key.

Every scheduled envelope records its exact owning workday run through an indexed foreign key. Terminalization and recovery use only that relationship, never an envelope-id prefix. After a partial scheduling failure, the API attempts exact envelope closure, the failure event, and the failed-run transition independently; inability to confirm any required recovery record is itself a visible control-plane failure.

Planning remains productive without approved decisions: agents may ask questions, propose work, estimate, review, create linked notes, structure knowledge, and summarize evidence. Every eligible configured planning agent participates before any agent repeats. If duration, budget, and useful demand remain, later cycles may be synthesized.

Planning demand order is signal-contract-driven. At scheduling, the API freezes one SDK-compiled DAG whose nodes are `agent:activity-profile` identities and whose edges are repository-owned signal contracts. TreeDX commits, content, estimates, reports, and other artifacts are evidence referenced by signals; they are never a second dependency language. Profiles without subscriptions or with explicit external roots begin the graph. Downstream demand becomes eligible only when durable validated signal instances satisfy subscription filters, cardinality, and the `any`, `all`, or quorum producer policy. `cardinality: each` creates one durable participation entry and demand per matching signal subject.

Every downstream demand records its graph node, predecessor nodes, graph revision, predecessor signal identities, and exact evidence. Immutable TreeDX refs, commits, diffs, control-plane records, assignment identity, and descriptive change summaries travel together through the handoff. Cycles, missing producers, incompatible filters, unauthorized publishers/subscribers, corrupt graph snapshots, and signals without required durable evidence fail visibly before downstream demand creation.

One typed workday compiler reads active runs through a strict repository, resolves the complete requested project set, reads TreeDX content and bounded artifact context, advances durable participation cycles, and writes idempotent positive demand. One assignment function claims a demand, delegates it to canonical admission, and provisions deterministic TreeDX workspaces only after admission through a recoverable handle state. Corrupt JSON, source/storage failure, missing or ambiguous projects, and a collection beyond its processing bound fail visibly; they are never converted into a shorter successful workday.

Before admission, one API compiler resolves the assignment's project, owning team, architecture, and repository context. Missing ownership or an uncertain architecture/repository read is a control-plane failure; neither the assignment function nor provider runtime may invent fallback project context.

TreeDX workspace creation is replay-stable and bounded. The API derives the expected id from the assignment, validates brokered inputs, streams no more than the declared response limit, strictly decodes JSON, and rejects an upstream id mismatch. Workspace uncertainty prevents admission rather than being deferred to the provider runner.

Acting additionally requires an approved decision, ready execution input, and accepted/scheduled/active capacity-plan provenance. Providers cannot invent demand, select broader work, approve decisions, or change policy.

Assignments contain only the selected project/class/agent/handler/mode, reserved envelope, policy and readiness provenance, allowed output contract, and short-lived brokered capability handles. They never contain reusable team/provider secrets.

## Provider Assignment Lifecycle

The provider runner requests the next assignment using a membership access token and declared runtime capabilities. The API atomically leases one eligible assignment and returns an opaque lease token. Only the owning membership, runner, current state version, and current lease token may renew, return, complete, or fail it.

Assignment persistence has one typed repository, and next-assignment acquisition has one typed lease service. The lease service validates the lease duration before synthesis, reads a bounded candidate set, calls the sole lease-authority evaluator, records required diagnostics, and performs the state-version compare-and-swap. Durable assignment JSON, mode, or state-version corruption is a visible control-plane error; it is never normalized into eligible work.

Retryable failure returns the assignment and releases the lease. Terminal failure settles its reservation exactly once. Successful execution records a mode run, artifact manifest, usage actual, settlement, and then completes the assignment. Revocation, stale lease, deadline expiry, explicit terminalization, terminal-run recovery, and local-workday supersession use one typed API terminalization primitive rather than alternative mutation paths. Settlement must commit before assignment state advances; uncertainty remains visible and recoverable. Terminal transitions use assignment state-version compare-and-swap, and fallback evidence is persisted under a stable assignment-attempt identity before a lease is released.

An expired lease is never silently re-leased. Before assignment selection, the API runs bounded team/provider recovery; the API transactional scheduling scan runs the same owner globally. Durable evidence classifies the abandoned attempt as reservation-preserving safe retry, retry-exhausted terminal failure, recovered completion, or operator action. Exhausted attempts settle through the sole settlement service, while assignment, orphan mode-run, demand/participation, and audit transitions commit in one state-version-CAS batch. A settlement committed before interruption is recognized on replay and converged; uncertain usage, TreeDX, fallback, or settlement evidence remains visibly expired and cannot be requeued until its financial claim is resolved.

There is no secondary project-runner task queue. The API exposes no task claim/event/complete lifecycle, the SDK exposes no runner-task client, and the clean schema contains no runtime task/event/output tables. Because the capacity system has not launched, the clean reset baseline omits those tables instead of retaining an additive compatibility cleanup migration; assignment and mode-run evidence remains authoritative.

There is also no project-runner manager-lease, worker-runner, repository-claim, runner-scale lifecycle, or API execution checkout. Provider availability sessions, assignments, leases, mode runs, and provider-manager telemetry are authoritative.

Agent and `platform-operation` capacity providers use the same outbound registration, availability, lease, event, cancellation, usage, and settlement protocol. They remain separate runtime principals with independent manifests, credentials, supply ceilings, data roots, repository mirrors, assignment checkouts, logs, and configuration generations. Local reconciliation starts every declared class concurrently and cannot report readiness until each class publishes a fresh matching runtime status and approved availability session.

Provider-manager liveness and runner execution remain concurrent services. The manager keeps each exact membership session fresh while any runner holds work; the API rejects renewal once that short-lived authority expires. A synchronous acceptance executor therefore uses a refresh-only session heartbeat beside its runner. It never leaves a full manager scheduler running after the selected dispatch set, so session freshness cannot pre-lease later work.

Renew, return, complete, and fail share one typed lifecycle service. Every operation requires current provider/membership ownership, the current lease token, an unexpired lease, and state-version CAS. A stale runner cannot return, complete, fail, or settle work after lease expiry; completion additionally requires the assignment reservation to be consumed, while terminal failure settles before releasing the lease.

For successful work, settlement is the runner's local terminal-renewal boundary even though API completion follows it. The runner stops timer and execution-lifecycle renewals before the settlement request consumes the reservation, then closes the workspace and completes the assignment. This prevents a queued renewal from being misreported during the valid consumed-reservation-to-released-lease handoff; the API still rejects any renewal that actually arrives after reservation consumption.

Mode-run delivery is replay-safe and required. The provider retries one stable assignment/event identity rather than minting a new phase id, and it does not acknowledge buffered execution-provider messages before durable acceptance. API persistence treats same-assignment replay as an idempotent update, rejects reuse of that identity by another assignment, and links usage only when the usage record belongs to the same team and assignment. Exhausted delivery returns or fails the lease with explicit diagnostics so execution never advances without its forensic control-plane record.

## AgentKernel and Content

`AgentKernel.runAssignment` is the sole production kernel entrypoint. It validates the assigned mode and class, loads project content through assignment-scoped TreeDX operations, resolves the configured activity profile, filters tools, invokes one execution adapter, validates one artifact manifest, and records telemetry.

Handlers route and validate; project configuration decides intent and artifact type. TreeDX tool receipts are the single owner of generated content. Handlers and the kernel must not perform a second local write. Every note links to its subject, and every artifact records assignment, mode run, agent/class/handler, TreeDX refs, sources/citations, verification, usage, signals, diagnostics, and errors. Before either canonical TreeDX commit tool may finalize a writable assignment workspace, the provider tool boundary checks authenticated telemetry for the required content model and subject relations on every mutated note. A missing gate returns a structured non-mutating result, allowing same-thread repair before TreeDX makes the workspace immutable. A bounded same-thread completion correction may obtain missing authenticated receipts or repair an incomplete relation through the same granted tools. The initial run and correction share one isolated provider client/runtime; auxiliary questions, proposals, or notes remain separate artifacts and never substitute for the configured required artifact kind.

The assignment's canonical `modeRunId` owns kernel running-to-terminal lifecycle evidence and must match the artifact manifest. Provider progress phases and execution-provider messages use distinct event identities. For engineering, the last successful source checkpoint is authoritative, downstream exact refs come only from authenticated completed-predecessor manifests, and review receives only completed-ancestor evidence. For content, both `treeseed.content.commit` and direct `treedx.commit_workspace` are canonical commit operations when their authenticated receipts and exact path/ref/SHA read-back agree.

Provider completion never implies repository integration. A supervisor may use `capacity checkpoint-integrate` only after the graph is completed and the final implementation contract, verification, review, and release-readiness evidence are approved. The API-selected deliverable manifest and project repository topology are required inputs. The SDK revalidates immutable lineage and copies the checkpoint into a clean unprotected task branch; the provider has no invocation path to this operator command and gains no push, save, stage, release, deployment, grant, or allocation authority.

Provider materialization is assignment-scoped and custody-isolated. The provider fetches the normalized repository identity into its own `/data/repositories/<repository-key>/mirror.git`, verifies the requested immutable ref, and creates a fresh `/data/assignments/<assignment-id>/checkout`. No assignment receives the developer checkout, an API execution checkout, a TreeDX workspace, or another assignment's writable Git common directory. Repository results cross the boundary as exact revisions and provenance, never as reusable local paths.

Provider-global concurrency is exercised at both deterministic and real-execution layers. The one-slot multi-team case proves final-slot exclusion and failure isolation. The bounded two-slot starter case uses one provider connection/session and one shared allocation with independent project slices, while per-project grants cap each project at one assignment. Two manager claims and two runner executions must overlap without sharing project, worktree, TreeDX workspace, usage, or settlement identity.

Research uses the API-owned eleven-stage workflow rather than unconstrained planning. The tool catalog intersects project web policy with the selected provider's bounded source policy and omits search/fetch when no allowed domain remains. Fetch, claim, and review tools emit authenticated events consumed by workflow projection. At independent-source fetch, real Codex must produce the configured number of successful fetch receipts; a bounded same-thread correction may request missing receipts from a completed or waiting result, but cannot fabricate citations or replace the required linked TreeDX note.

The research workflow is cyclic but finite at its governed revision boundary. An authenticated rejection during post-revision approval is a successful review outcome, not an assignment failure: the API records the attempt and reason, reopens the Researcher revision node, returns Reviewer approval to pending, and withholds publication. The next assignment must revise the semantic claim text against that reason, not merely relabel it supported. The project/workflow-owned `maxRevisionCycles` is a typed one-through-ten limit (default three); rejection at the limit blocks the workflow and fails the approval node with inspectable evidence. Workday duration and budget remain independent outer bounds.

## Discussion Dispatch And Provider Adapters

The Discussion API commits a user turn through TreeDX before scheduling and selects only the mentioned agents' `chat` activity profiles from that immutable ref. The SDK-owned `discussion-v1` foundation supplies TreeDX reads, bounded message/note/question/proposal writes, common stewardship guidance, default provider/model policy, and multidimensional budget ceilings. Each project agent declares a compact specialization for response style, prompt task, context/tools, provider preference, timebox, tokens, and cost.

Codex and headless OpenCode are execution-provider adapters behind the same provider manager and runner. OpenCode uses its server session, message, event, diff, and abort lifecycle. OpenRouter credentials remain brokered runtime secrets and never enter Git, TreeDX, Discussion content, assignment payloads, or the ordinary OpenCode credential store. Before exact completion accounting is available, admission relies on conservative reservation, request/output ceilings, the immutable deadline, cancellation, and provider-key limits.

## Usage and Settlement

Execution adapters report active seconds, elapsed seconds, token classes, cost, and provider-native facts through the membership-scoped usage endpoint before terminal settlement. The API stores every report under explicit idempotency, durable assignment-attempt, usage-dimension, and `informational | incremental | aggregate` accounting identity. A reservation-owned report token serializes partial reports against the terminal settlement token. Terminal aggregate active time must cover accepted incremental active time, and summaries select the terminal aggregate rather than double-counting dimensions. Settlement runs transactionally exactly once per reservation and ledger phase. Replays return the canonical fact, while changed duplicates or underreported aggregate usage fail with a conflict. A time or independently enforced native overrun remains held for explicit team-management disposition.

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

The clean baseline contains global identities, team registration keys, requests, memberships, credentials, access tokens, proof nonces, audit events, availability sessions, provider-global execution providers and lanes, grants, allocation sets, workdays/participation/demand/work graphs, reservations, capacity-provider assignments, mode runs, usage actuals, ledger entries, and durable TreeDX proxy authorization/audit records. Admission persists any assignment proxy handle in the same transaction as its reservation and assignment. The durable handle row—not the embedded assignment context—is authoritative for API proxy authorization, including distinct read and write path scopes. CAP-082 completed and service-proved execution-provider/lane persistence, admission, provider-local enforcement, usage, and settlement provenance.

Execution-provider inventory is not duplicated in team-owned tables. Current execution-provider facts come from validated provider manifests and unexpired availability snapshots.

## Required Guarantees

Production proof must cover registration rotation and replay, approval-without-authority, credential/token revocation, multi-team isolation, provider-global concurrency, authoritative grants, allocation hard caps and borrowing, atomic admission, lease CAS, exactly-once settlement, workday continuation/fairness, acting gates, TreeDX-only artifacts, complete trace, starter engineering/research workflows, interruption recovery, and CLI/API parity.

String, route-presence, mock-call-order, and file-presence tests are not sufficient evidence. Service workflows must exercise the real API database, provider manager, runner, kernel, TreeDX proxy, usage, and settlement paths.

The local production proof explicitly selects the independent engineering and research starter repositories. Reconciliation seeds each into its own TreeDX repository; each run creates a disposable project/control-plane scope bound to that repository and imports its MDX agents through TreeDX. Engineering executes against the starter checkout through isolated exact-ref worktrees. The test measures durable demand, participation, admission, reservations, leases, the canonical mode run, authenticated artifact/tool receipts, graph/workflow transitions, usage, ledger settlement, handle revocation, and zero-drift cleanup. Guarantee preflight reconciles the managed API source closure instead of trusting endpoint health from a stale process. Final cleanup respects asynchronous project aggregate deletion and waits for the API-owned team-deletion blockers to converge before removing the isolated team. A fabricated execution provider or a disposable fake source repository is not admissible proof.
