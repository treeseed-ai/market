# Agent Capacity Completion and Production-Readiness Plan

## Summary

Create `docs/agent-capacity-completion.md` as the canonical, persistent execution plan for finishing the capacity-provider governance, allocation, multi-team provider runtime, AgentKernel, handler/content architecture, and autonomous engineering/research workflows.

The completed architecture will provide:

- One regeneratable broadcast registration key per team.
- A global cryptographic identity for each capacity provider.
- Independent provider memberships and credentials for multiple teams.
- Team approval or rejection of registration requests.
- Separate, explicit capacity grants and versioned allocation policy after membership approval.
- Provider-wide budget and concurrency enforcement across all connected teams.
- Transactional reservations, leases, usage reporting, and exactly-once ledger settlement.
- A single canonical assignment and execution path.
- TreeDX-only agent content access and mutation.
- Autonomous, duration- and budget-bounded engineering and research workdays.
- Complete API, CLI, and configuration coverage without depending on Admin UI functionality.
- Service-workflow guarantees covering every material capacity and agent promise.
- Removal of all legacy, duplicate, compatibility, placeholder, and unused implementations.

The existing architecture is a useful foundation but is not production-ready. Its strongest components are provider lifecycle reconciliation, lease execution, and AgentKernel validation. Its most important deficiencies are unenforced allocation policy, duplicated provider/control-plane paths, non-transactional settlement, incomplete workday synthesis, placeholder starter handlers, duplicate content-output ownership, legacy kernel and manager surfaces, oversized untyped modules, and guarantees that currently overstate end-to-end coverage.

No compatibility layer or dual execution path will be retained. The system has not launched, so capacity state and schemas will be reset to the clean target architecture.

## Nonnegotiable Architecture Rules

1. `docs/agent-capacity-completion.md` is the controlling completion document.

   - Every implementation phase begins by rereading it, the applicable `AGENTS.md`, and the five canonical capacity documents.
   - Every architecture decision, contract change, ownership decision, issue discovered, and phase result is recorded there.
   - Every phase ends by updating its completion ledger, evidence links, removed legacy inventory, remaining work, blockers, and next phase.
   - If a phase cannot be completed, it must end with an explicit incomplete report. It must never silently omit unfinished work or declare production readiness prematurely.

2. Preserve the existing package ownership boundaries.

   - `@treeseed/sdk`: portable contracts, schemas, validation, policy evaluation, provider-neutral primitives.
   - `@treeseed/api`: durable governance, membership, grants, allocation, reservations, leases, workdays, usage, settlement, audit, and assignment function.
   - `@treeseed/agent`: provider manager, runner, execution providers, AgentKernel, handlers, tool mediation, and provider-local enforcement.
   - `@treeseed/cli`: complete operator and provider-owner surfaces over public SDK/API/agent contracts.
   - `@treeseed/admin`: no implementation in this plan.
   - `@treeseed/core`: no provider scheduling or AgentKernel execution.
   - TreeDX: product-neutral content persistence and querying only.

3. No duplicate implementation.

   - There will be one policy evaluator, one assignment function, one reservation admission path, one settlement path, one provider protocol client, one human/control-plane client, one AgentKernel execution entrypoint, and one owner for every emitted artifact.
   - New code may not be introduced beside an old implementation. The old implementation must be removed in the same phase that makes its replacement canonical.
   - Compatibility aliases, `410` legacy routes, deprecated scopes, duplicate serializers, copied SQL, duplicate validators, and unused exports are deleted.

4. Keep source modules focused.

   - Production capacity and agent modules target 150–350 lines.
   - A production module may not exceed 500 lines without a documented architecture exception approved in `docs/agent-capacity-completion.md`.
   - Route registration, repositories, policy evaluation, orchestration, transport, execution, serialization, and validation must live in separate modules.
   - Capacity code may not remain embedded in the oversized API `app.ts` or `store.ts` files.
   - No `@ts-nocheck`, `@ts-ignore`, `@ts-expect-error`, relaxed compiler settings, or disabled lint rules may cover capacity or agent production code.

5. Use only `plan` and live execution semantics. Do not introduce or retain “dry-run” terminology or implementations.

6. All provider infrastructure lifecycle operations flow through reconciliation. Control-plane records such as memberships, grants, reservations, assignments, and usage are durable API records, not reconciliation resources.

7. All agent content access and mutation flows through TreeDX.

   - No production handler, workday service, kernel, or operation writes directly to local content files.
   - Direct filesystem access remains permissible for source worktrees, generated reports, and explicitly isolated fixtures.
   - Agent artifacts must use the SDK content model and appropriate linked frontmatter.

8. UI independence is mandatory.

   - No Admin routes or components are part of this plan.
   - Every action a future UI could perform must have an API operation and CLI command.
   - Declarative policy must additionally be representable in validated configuration.
   - Future UI work must consume these interfaces without adding governance or scheduling logic.

9. Production readiness has two gates.

   - Code-complete and locally service-proven.
   - Hosted acceptance-proven in reviewed staging and production infrastructure.
   - Because hosted deployment is currently suspended, the implementation may reach the first gate but must remain explicitly blocked from “100% production-ready” until the reviewed OpenTofu environments and hosted acceptance path are restored.

## Canonical Documentation Set

The first implementation step is to create `docs/agent-capacity-completion.md` from this plan. It becomes the controlling index for:

- `docs/agent-capacity-implementation-roadmap.md`
- `docs/agent-capacity-domain-model.md`
- `docs/capacity_provider_agent_coordination_architecture.md`
- `docs/agent-kernel-mode-runtime.md`
- `docs/agent-capacity-operator-surfaces.md`
- `docs/package-ownership.md`

The completion document must contain:

- Immutable architecture invariants.
- Target data model.
- Public SDK types.
- API and CLI matrices.
- Configuration schemas.
- Audit issue register with stable IDs such as `CAP-001`.
- Legacy-removal inventory.
- Phase table with `planned`, `in-progress`, `blocked`, or `complete`.
- Guarantee and evidence matrix.
- Current readiness assessment.
- Final acceptance checklist.
- Hosted deployment blocker status.

Contradictory material in the existing canonical documents must be updated in the same phase as the implementation it describes. Documentation must state actual current behavior, not intended future behavior.

## Target System Architecture

### Trust and Governance Flow

```text
Team broadcast registration key
        |
        v
Signed provider registration request
        |
        v
Team approval or rejection
        |
        v
Approved provider-team membership
        |
        v
Provider exchanges signed proof for membership credential
        |
        v
Provider obtains short-lived access token
        |
        v
Provider opens team-scoped availability session
        |
        v
Team creates explicit grant and active allocation set
        |
        v
API admission and assignment function
        |
        v
Provider-local multi-team coordinator
        |
        v
Runner -> AgentKernel -> tools/TreeDX/source worktree
        |
        v
Usage actuals -> exactly-once ledger settlement
```

Approval establishes membership only. It must not automatically grant capacity, activate an allocation, reserve credits, or authorize acting work.

### Provider Identity

Each provider installation has one global Ed25519 identity:

```ts
interface CapacityProviderIdentity {
  schemaVersion: 1;
  providerId: string;
  fingerprint: string;
  publicJwk: JsonWebKey;
  displayName: string;
  identityVersion: number;
  status: "active" | "rotating" | "revoked";
  createdAt: string;
  rotatedAt?: string;
}
```

Rules:

- The provider generates its keypair locally.
- The private key is stored through encrypted Treeseed configuration or the provider host secret manager.
- The API stores only the public JWK and its canonical fingerprint.
- `providerId` is deterministically derived from the SHA-256 fingerprint of the canonical public JWK.
- The same provider identity may join multiple teams.
- Provider identity rotation is an explicit ceremony that proves possession of the old and new keys and updates every active membership atomically.
- Membership credentials are not provider identity keys and can be rotated or revoked independently.

### Signed Provider Proof

Unauthenticated registration and credential exchange requests use an EdDSA JWS containing:

- HTTP method.
- Canonical request path.
- SHA-256 body digest.
- Audience.
- Issued-at and expiration.
- Unique `jti`.
- Provider fingerprint and identity version.

Defaults:

- Maximum proof validity: five minutes.
- Maximum clock skew: 60 seconds.
- Every `jti` is stored through the replay window and may be used once.
- Proof verification and replay rejection occur before any durable mutation.
- Every mutation also requires an idempotency key.

### Team Registration Key

Each team has exactly one current registration-key generation.

```ts
interface TeamCapacityRegistrationKeyMetadata {
  teamId: string;
  generation: number;
  keyPrefix: string;
  status: "active" | "disabled";
  createdAt: string;
  rotatedAt?: string;
  lastRevealedAt?: string;
}
```

Rules:

- The key is high entropy and intended for broadcast to prospective providers.
- Its verification hash and encrypted revealable value are stored separately.
- Revealing the key requires team-management permission and creates an audit event.
- Logs, traces, assignment records, and normal list operations never contain the plaintext key.
- Rotation immediately invalidates the previous generation.
- Rotation atomically cancels every pending registration request created with the previous generation.
- Approved memberships and their credentials are unaffected.
- Disabled keys reject new registrations without changing existing requests or memberships.
- Registration endpoints have team, IP, fingerprint, and key-generation rate limits.

### Durable Data Model

Replace the current team-owned provider model with these canonical entities:

1. `team_capacity_registration_keys`

   - One current row per team plus immutable generation history.
   - Team, generation, prefix, verification hash, encrypted reveal value, status, timestamps, audit actor.

2. `capacity_providers`

   - Global provider identity.
   - No owner-team column, team budget, membership state, or team-specific credential.

3. `capacity_provider_registration_requests`

   - Team, provider, registration-key generation, request status, capability summary, supply offer, proof metadata, expiration, reviewer, rejection reason.
   - Statuses: `pending`, `approved`, `rejected`, `cancelled`, `expired`.

4. `capacity_provider_team_memberships`

   - Unique provider/team relationship.
   - Statuses: `approved`, `suspended`, `revoked`.
   - Team alias, approval/revocation audit fields.
   - Membership does not imply a grant.

5. `capacity_provider_team_credentials`

   - Membership-scoped credential metadata.
   - Hashed secret, prefix, scopes, status, issued/rotated/revoked timestamps.
   - Plaintext is revealed once during provider exchange and is never stored.
   - Rotation supports a short configurable overlap window, defaulting to zero for team-initiated emergency rotation.

6. `capacity_provider_access_tokens`

   - Short-lived token/session metadata linked to a membership credential.
   - Default lifetime: 15 minutes.
   - Provider refresh starts when five minutes remain.
   - Revoking the parent credential invalidates all child tokens immediately.

7. `capacity_provider_availability_sessions`

   - Membership- and team-scoped live availability.
   - Replaces the overlapping live-registration, heartbeat, check-in, and session representations.
   - Stores the latest full availability snapshot, expiry, sequence number, and last verified timestamp.

8. `capacity_execution_providers` and `capacity_provider_lanes`

   - Provider-global execution capability and native budget facts.
   - Team-visible through a membership-scoped projection.
   - Providers advertise facts; teams may constrain their use but may not rewrite provider-native capacity.

9. `capacity_grants`

   - References an approved membership, project, environment, permitted execution providers/lanes, capabilities, modes, and hard limits.
   - Statuses: `planned`, `active`, `paused`, `revoked`, `expired`.
   - Requires positive limits or an explicit `unmetered` declaration. `null` means unspecified; zero means denied.

10. `capacity_allocation_sets`

    - Immutable versioned team policy after activation.
    - A new version supersedes an old version; active records are not edited.

11. `capacity_reservations`

    - Contains membership, provider, team, project, allocation version, grant, mode, class, requested amount, approved amount, policy snapshot, and idempotency key.

12. `capacity_provider_assignments`

    - Contains all reservation and execution provenance.
    - Assignment state transitions use compare-and-swap versioning.

13. `agent_mode_runs`

    - One durable execution attempt per assignment attempt.

14. `capacity_usage_actuals`

    - Idempotent provider usage reports keyed by assignment attempt and usage dimension.

15. `capacity_ledger_entries`

    - Append-only settlement entries with a database-enforced unique settlement key.

16. `capacity_workdays`, participation cycles, demand records, and work graphs

    - Durable workday window, budget, mode, participation coverage, generated demand, and planning/acting provenance.

17. `capacity_audit_events`

    - Actor, team, provider, membership, action, resource, before/after fingerprints, request ID, idempotency key, timestamp, and safe metadata.

All provider-governance tables require foreign keys, explicit status constraints, timestamps, unique business keys, and indexes supporting team, provider, membership, status, lease expiry, and workday queries.

## Schema Reset and Migration Policy

The system has not launched. Therefore:

- Do not migrate or preserve existing capacity-provider identities, registration rows, API keys, allocation sets, grants, reservations, or ledger lineage.
- Regenerate the clean database baseline so fresh installations never create the legacy capacity schema.
- Remove obsolete capacity migrations and tables instead of adding compatibility migrations around them.
- Reset local and staging capacity state only through the canonical reconciliation and database lifecycle.
- Preserve unrelated non-capacity domain schema while squashing the migration baseline.
- Add fresh-install, reset, and schema-contract tests.
- Assert that no old provider API key, team-owned provider, live registration, or duplicate heartbeat/session table exists.
- Do not mutate hosted environments while hosted deployment is suspended.

## Allocation and Admission Contracts

### `CapacityAllocationSetV2`

Replace the untyped `policy: Record<string, unknown>` model with a strict SDK contract:

```ts
interface CapacityAllocationSetV2 {
  schemaVersion: 2;
  id: string;
  teamId: string;
  version: number;
  status: "draft" | "validated" | "active" | "superseded" | "archived";
  effectiveFrom: string;
  effectiveUntil?: string;
  reservePolicy: CapacityReservePolicy;
  projects: ProjectAllocation[];
  agentClasses: AgentClassAllocation[];
  modes: ModeAllocation[];
  borrowingRules: BorrowingRule[];
  metadata: AllocationMetadata;
}
```

Every percentage slice contains:

```ts
interface AllocationSlicePolicy {
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
  hardCapPercent: number;
}
```

Validation rules:

- `0 <= min <= target <= max <= hardCap <= 100`.
- Sibling targets sum exactly to 100 after reserve is deducted.
- Every project and agent class exists and is eligible.
- Every mode is supported by the referenced class and grant.
- Exactly one allocation version may be active for a team/effective interval.
- Activated sets are immutable.
- Borrowing is disabled unless explicitly declared.
- Overflow behavior is one of `deny`, `approval-required`, or `borrow`.
- Acting allocations do not bypass decision and readiness gates.

### Single Policy Evaluator

Implement one pure SDK evaluator:

```ts
evaluateCapacityAdmission(input: CapacityAdmissionInput): CapacityAdmissionDecision
```

It must combine:

- Approved and active membership.
- Live availability session.
- Active grant.
- Active workday and remaining workday budget.
- Effective allocation set.
- Project, class, and mode hierarchy.
- Existing reservations.
- Settled usage.
- Provider-native availability.
- Provider-local offer constraints.
- Acting provenance and readiness.
- Requested capabilities and execution provider.

It returns:

- `allowed`.
- Stable reason codes.
- Maximum reservable amount.
- Selected grant and allocation version.
- Policy snapshot.
- Required approval, if any.
- Explainable calculations for CLI/API observability.

No API, CLI, Agent package, or provider runtime may reimplement this calculation.

### Atomic Reservation

Reservation admission must execute in one transaction:

1. Load and lock the applicable membership, workday, grant, and active allocation version.
2. Compute committed usage and active reservations.
3. Run the SDK evaluator.
4. Insert the reservation with a unique idempotency key.
5. Insert the assignment.
6. Advance participation/demand state.
7. Commit.
8. Return the same result on repeated idempotent requests.

Concurrent requests must not exceed any hard cap, even if they target different teams through the same provider.

## Public API

### Team Registration and Governance

Canonical endpoints:

- `GET /v1/teams/:teamId/capacity-registration-key`
- `GET /v1/teams/:teamId/capacity-registration-key/reveal`
- `POST /v1/teams/:teamId/capacity-registration-key/rotate`
- `POST /v1/teams/:teamId/capacity-registration-key/enable`
- `POST /v1/teams/:teamId/capacity-registration-key/disable`
- `GET /v1/teams/:teamId/capacity-provider-requests`
- `GET /v1/teams/:teamId/capacity-provider-requests/:requestId`
- `POST /v1/teams/:teamId/capacity-provider-requests/:requestId/approve`
- `POST /v1/teams/:teamId/capacity-provider-requests/:requestId/reject`
- `POST /v1/teams/:teamId/capacity-provider-requests/:requestId/cancel`
- `GET /v1/teams/:teamId/capacity-provider-memberships`
- `GET /v1/teams/:teamId/capacity-provider-memberships/:membershipId`
- `POST .../:membershipId/suspend`
- `POST .../:membershipId/resume`
- `POST .../:membershipId/revoke`
- `GET .../:membershipId/credentials`
- `POST .../:membershipId/credentials/rotate`
- `POST .../:membershipId/credentials/:credentialId/revoke`

Team approval must create only the membership and credential-issuance authorization.

### Public Provider Registration

- `POST /v1/provider-registrations`
- `GET /v1/provider-registrations/:requestId`
- `POST /v1/provider-registrations/:requestId/credential`
- `POST /v1/provider/access-tokens`

Registration uses `Authorization: Treeseed-Registration <key>` plus the signed provider proof. Provider proof is required when polling status and exchanging an approved request.

The approval API never returns a credential to the team reviewer. The provider retrieves the credential exactly once through the signed exchange.

### Provider Runtime

- `POST /v1/provider/availability-sessions`
- `PUT /v1/provider/availability-sessions/:sessionId`
- `POST /v1/provider/availability-sessions/:sessionId/close`
- `POST /v1/provider/assignments/next`
- Existing assignment lifecycle operations are retained only if they conform to the new membership model:
  - accept
  - renew
  - return
  - complete
  - fail
  - usage report
  - mode-run start/complete/fail

Remove the old registration, heartbeat, check-in, and overlapping session endpoints. Do not leave aliases.

### Grants, Allocations, Workdays, and Observability

Provide complete typed endpoints for:

- Grant create, validate, activate, pause, resume, revoke, list, and inspect.
- Allocation validate, create, activate, supersede, archive, list, inspect, and explain.
- Project agent-class sync, list, and inspect.
- Workday create, start, pause, resume, tick, complete, cancel, status, and summary.
- Assignment list, inspect, explain, cancel, and safe requeue.
- Reservation list and explain.
- Usage and ledger inspection.
- Provider, runner, mode-run, and artifact trace inspection.
- Audit-event query and export.

All list APIs must support stable pagination, team scoping, status filters, time filters, and deterministic ordering.

### API Security and Error Contracts

Team read operations require team read permission. Key reveal, approval, membership changes, grants, allocations, workday mutations, and credential operations require team-management permission.

Provider access tokens contain only membership-scoped capabilities such as:

- `provider:availability:write`
- `provider:portfolio:read`
- `provider:assignments:read`
- `provider:assignments:write`
- `provider:usage:write`
- `provider:reports:write`
- `provider:credentials:rotate`

Provider credentials never authorize:

- Registration-key rotation.
- Membership approval.
- Grant creation or activation.
- Allocation mutation.
- Decision approval.
- Project-agent configuration mutation.

Stable errors must cover invalid/disabled/expired registration keys, replayed proofs, registration status, membership status, revoked credentials, missing grants, allocation exhaustion, workday closure, acting provenance, lease conflicts, and settlement conflicts.

## CLI and Configuration Parity

### Team Governance CLI

Implement:

- `trsd capacity registration-key show`
- `trsd capacity registration-key reveal`
- `trsd capacity registration-key rotate`
- `trsd capacity registration-key enable`
- `trsd capacity registration-key disable`
- `trsd capacity registration-requests list|show|approve|reject|cancel`
- `trsd capacity providers list|show|suspend|resume|revoke`
- `trsd capacity provider-credentials list|rotate|revoke`

Secret rules:

- Revealing or rotating a broadcast key requires explicit confirmation unless `--yes` is supplied.
- JSON output includes plaintext only for an explicit reveal or successful rotation.
- Registration keys are accepted through protected stdin or a secret reference, not normal positional arguments.
- Credentials and keys are never logged.

### Provider-Owner CLI

Implement:

- `trsd capacity provider identity init|show|rotate`
- `trsd capacity provider join`
- `trsd capacity provider registration-status`
- `trsd capacity provider credential exchange|rotate`
- `trsd capacity provider connections list|show|leave`
- `trsd capacity provider offer validate|plan|apply`
- Existing `build`, `up`, `status`, `logs`, `down`, and `test-local` commands remain reconciliation-backed.

### Capacity Policy CLI

Implement:

- `trsd capacity grants list|show|validate|plan|apply|pause|resume|revoke`
- `trsd capacity allocation list|show|validate|plan|create|activate|supersede|archive|explain`
- `trsd capacity agent-classes sync|list|show`
- `trsd capacity workday create|start|pause|resume|tick|complete|cancel|status|summary`
- `trsd capacity assignments list|show|explain|cancel|requeue`
- `trsd capacity reservations list|explain`
- `trsd capacity usage show|export`
- `trsd capacity ledger show|export`
- `trsd capacity audit list|export`

Every command supports `--json`. Mutations accept or generate an idempotency key. Declarative changes have separate `plan` and live `apply` operations.

### Provider Manifest Version 2

Replace the single-team configuration with:

```yaml
schemaVersion: 2
identity:
  privateKeyRef: secret://capacity/provider-identity
executionProviders:
  - id: codex-primary
    adapter: codex
    nativeLimits:
      maxConcurrentRunners: 4
connections:
  - id: treeseed-team-a
    marketProfile: staging
    teamId: team-a
    membershipCredentialRef: secret://capacity/team-a
    offer:
      weight: 2
      maxConcurrentRunners: 3
      capabilities: [engineering, research]
  - id: external-team-b
    marketUrl: https://example.invalid
    teamId: team-b
    membershipCredentialRef: secret://capacity/team-b
    offer:
      weight: 1
      maxConcurrentRunners: 1
      capabilities: [research]
```

Rules:

- No plaintext private keys, registration keys, or membership credentials.
- Execution-provider native limits are provider-global.
- Connection offers may narrow but never widen native capabilities.
- Explicit percentage shares across connections must total no more than 100.
- When only weights are given, the coordinator uses weighted-deficit round-robin.
- Equal weights are the default.
- Team connections are isolated and independently revocable.
- One provider manager supervises all team connections and a shared runner pool.

## Provider Multi-Team Coordinator

Implement a durable provider-local coordinator that:

1. Maintains one access token and availability session per team membership.
2. Publishes only team-scoped availability to each team.
3. Tracks provider-global native limits and per-connection offers.
4. Polls eligible teams using weighted-deficit round-robin.
5. Atomically reserves a local runner slot and native-budget allowance before accepting an assignment.
6. Never accepts more work than the global provider, execution provider, lane, or connection permits.
7. Releases local reservations only after durable assignment completion/return or confirmed lease expiry.
8. Reconciles active leases and runners after restart.
9. Continues renewing valid leases during temporary control-plane failures.
10. Stops new work immediately on membership suspension, credential revocation, expired access, or unavailable grant.
11. Prevents one team from seeing another team’s identity, assignments, offer, usage, or errors.
12. Emits traceable allocation decisions and reason codes.

Provider-local hard limits always win over team requests. A team can choose not to use offered capacity but cannot force a provider to exceed native capacity.

## Canonical Workday and Assignment Architecture

### Demand Compilation

Replace hard-coded test/live assignment synthesis with one durable demand compiler.

Planning demand sources include:

- Open objectives.
- Open questions.
- Unreviewed proposals.
- Decisions awaiting preparation or review.
- Knowledge gaps.
- Release-readiness gaps.
- Configured planning intents for otherwise idle agents.
- Workday summaries and handoffs.

Rules:

- Demand is derived from project agent definitions and TreeDX content.
- Demand records are idempotent and durable.
- No dummy messages, fixed smoke-test tasks, hard-coded handler maps, or synthetic “one assignment means complete” behavior.
- Planning must continue while the workday window is open, budget remains, and useful eligible work exists.
- Provider polling, availability refresh, explicit workday ticks, and completion events may trigger request-scoped demand compilation. No central scheduler daemon is introduced.

### Fair Agent Participation

Add durable participation cycles:

- Every eligible configured project agent must receive planning work once before any eligible agent repeats.
- An unavailable or policy-ineligible agent is recorded with an explicit reason.
- A new cycle begins only when the previous cycle is covered or its exclusions are resolved.
- Reporting assignments do not falsely count as substantive participation unless reporting is the agent’s configured role.

### Acting Gate

Acting work requires all of:

- Approved decision provenance.
- Ready work-graph node.
- Accepted, scheduled, or active capacity-plan provenance.
- Active grant.
- Active allocation.
- Successful reservation.
- Required source/test dependencies.
- Agent class and handler authorized for acting.
- Project permissions narrow enough for the requested action.

Planning may propose, question, estimate, research, review, and document. It may not mutate project implementation state.

## AgentKernel and Runner Architecture

### One Execution Entry Point

The only production kernel entrypoint will be:

```ts
AgentKernel.runAssignment(context: AssignmentExecutionContext): Promise<AssignmentExecutionResult>
```

Remove production use and exports of:

- `runAgent`
- `runCycle`
- `start`
- `drainMessages`
- Legacy queue-observer scheduling
- Legacy priority resolver
- Duplicate mode scheduler
- Legacy workday manager
- Legacy service manager

The API decides what assignment is eligible. The kernel validates and executes the assignment; it does not independently reschedule or reinterpret portfolio policy.

### Kernel Modules

Split the kernel into focused modules:

- `assignment-preflight.ts`
- `activity-profile-resolver.ts`
- `context-loader.ts`
- `tool-policy.ts`
- `execution-dispatcher.ts`
- `output-validator.ts`
- `artifact-manifest.ts`
- `telemetry.ts`
- `failure-classifier.ts`
- A thin `agent-kernel.ts` coordinator

Use the SDK’s canonical mode decision and output validators. Delete Agent-package copies.

### Runner Modules

Split the provider runner into:

- Team connection/access-token client.
- Availability-session client.
- Lease client.
- Local capacity coordinator.
- Project synchronization.
- TreeDX context adapter.
- Tool catalog builder.
- Execution-provider selection.
- Kernel bridge.
- Mode-run reporter.
- Usage reporter.
- Lease recovery.
- Runner lifecycle and health.

Remove the existing misleading plan-only execution adapter class. A plan operation renders and validates intended execution without constructing a fake execution provider.

### Activity Profiles

Replace project TypeScript handlers with content-defined activity profiles.

An activity profile specifies:

- Planning or acting mode.
- Activity type.
- Required tools.
- Allowed operations.
- Context-query rules.
- Prompt body.
- Output contract.
- Artifact-routing policy.
- Timeout and resource expectations.
- Failure and retry policy.

Handlers may validate, route, and serialize. They may not choose an undocumented subject, invent capacity policy, or create duplicate artifacts.

## Content and Artifact Ownership

### Single Output Owner

Each artifact has exactly one creation path:

- The execution provider invokes approved TreeDX/content tools.
- Tool receipts return the created or updated content references.
- The handler validates the receipts and produces an artifact manifest.
- The kernel does not write a second deterministic note after a tool already created one.
- Deterministic workday summary generation is a distinct reporter activity, not a hidden post-processing write.

Remove direct content mutation from:

- Workday content services.
- Knowledge-promotion services.
- Local mutation adapters.
- Core-objective local readers.
- Legacy manager paths.
- Starter TypeScript handlers.

### Artifact Manifest

Every assignment returns:

```ts
interface AgentArtifactManifest {
  schemaVersion: 1;
  assignmentId: string;
  modeRunId: string;
  agentId: string;
  agentClassId: string;
  handlerId: string;
  activityType: string;
  toolEvents: ToolEventReference[];
  contentReferences: ContentReference[];
  sourceWorktree?: SourceWorktreeReference;
  commit?: CommitReference;
  verification: VerificationResult[];
  citations?: ResearchCitation[];
  signals: AgentSignal[];
  usage: UsageActual[];
  diagnostics: DiagnosticReference[];
}
```

Every execution must be inspectable by agent, class, mode, handler, assignment, workday, membership, provider, runner, execution provider, inputs, TreeDX context, artifacts, tool events, token counts, duration, usage, signals, diagnostics, and errors.

## Engineering Starter Target

Retain the eight intended roles:

- Architect
- Engineer
- Releaser
- Reporter
- Researcher
- Reviewer
- Technical writer
- Tester

Delete `_project-handlers.ts` and the one-line handler reexports. The starter must use package-owned built-in handlers plus MDX agent/activity configuration.

### Engineering Planning Workflow

Planning activities must support:

- Objective and decision analysis.
- Architecture proposals.
- Dependency and risk discovery.
- Question creation.
- Effort and capacity estimates.
- Test strategy.
- Work-graph construction.
- Review and revision.
- Documentation planning.
- Release-readiness assessment.

Planning outputs are real proposals, questions, decisions, and linked notes through TreeDX.

### Engineering Acting Workflow

A canonical acting graph is:

1. Resolve approved decision and ready work node.
2. Create an exact-ref isolated worktree through a scoped TreeSeed operation.
3. Research or architecture preparation when required.
4. Tester creates a failing regression or acceptance test and records proof.
5. Integration operation records the test commit.
6. Engineer implements against that exact integration ref.
7. Run focused package verification.
8. Reviewer validates code, contracts, security, boundaries, and evidence.
9. Reviewer either approves or creates explicit revision nodes.
10. Technical writer updates owned documentation.
11. Releaser performs release-readiness verification.
12. Operations runner performs any authorized integration/stage action.

Constraints:

- Agents do not directly push, merge, tag, deploy, or mutate provider infrastructure.
- Source operations use scoped TreeSeed SDK operations.
- Tester, engineer, writer, reviewer, and releaser receive distinct path and operation permissions.
- Production release remains fail-closed while hosted deployment is suspended.
- Every graph edge, commit, test result, review result, revision, and artifact is durable and traceable.

### Engineering Acceptance Scenario

The starter must autonomously:

- Discover a real fixture issue.
- Create a proposal and estimate.
- Obtain a fixture-approved decision.
- Build a work graph.
- Create a failing test.
- Implement a fix.
- Verify it.
- Review it.
- Produce linked documentation and a workday summary.
- Settle usage exactly once.
- Finish without direct content mutation, direct provider mutation, duplicate artifacts, or hard-coded starter handlers.

## Research Starter Target

Retain the four intended roles:

- Researcher
- Reviewer
- Technical writer
- Reporter

Correct all mistaken `engineering-agent/...` template identifiers to `research-agent/...`.

### Research Workflow

1. Convert the objective into explicit research questions.
2. Define source-selection and recency criteria.
3. Search through a provider-neutral research-source adapter.
4. Fetch approved sources under configured network and domain policy.
5. Create linked evidence notes.
6. Build a structured synthesis.
7. Validate every material factual claim against citations.
8. Have the reviewer identify unsupported, weak, stale, or contradictory claims.
9. Generate revision work until citation requirements pass.
10. Produce the configured knowledge page, book section, research pack, proposal, or decision-support artifact.
11. Produce a deterministic workday report.

### Research Citation Contract

Add a portable SDK contract:

```ts
interface ResearchCitation {
  sourceUrl: string;
  title: string;
  author?: string;
  publisher?: string;
  publishedAt?: string;
  retrievedAt: string;
  contentHash: string;
  excerpt?: string;
  license?: string;
  claimIds: string[];
  confidence: "low" | "medium" | "high";
}
```

Add validated citation support to the applicable note, knowledge-page, book, proposal, and decision-support content schemas.

Rules:

- Research evidence belongs in linked `notes/research/` entries unless another configured content type is explicitly required.
- Evidence notes link to their question, objective, proposal, or decision.
- Excerpts are bounded.
- Retrieval time and content hash are mandatory.
- Unsupported claims fail review.
- Contradictory sources are represented explicitly.
- Network access uses a provider-neutral source-search/fetch interface with allowlist, timeout, size, content-type, and redirect controls.
- Research-source snapshots and fetch diagnostics are retained in execution evidence without making TreeDX product-specific.

### Research Acceptance Scenario

The starter must autonomously:

- Create research questions from a real fixture objective.
- Gather at least two independent sources.
- Produce evidence notes with valid links and citations.
- Produce an initially unsupported claim.
- Have the reviewer reject it.
- Revise the synthesis.
- Produce a cited knowledge artifact and workday summary.
- Show complete usage, artifact, and settlement traceability.

## API and Source Modularization

### `@treeseed/sdk`

Create focused directories:

- `src/agent-capacity/contracts/`
- `src/agent-capacity/policy/`
- `src/agent-capacity/validation/`
- `src/capacity-provider/contracts/`
- `src/capacity-provider/security/`
- `src/capacity-provider/config/`

Public barrel files export canonical types only. Remove duplicate capacity helpers and compatibility paths.

### `@treeseed/api`

Extract capacity implementation to:

```text
src/api/capacity/
  repositories/
    registration-keys.ts
    provider-identities.ts
    registration-requests.ts
    memberships.ts
    credentials.ts
    availability.ts
    grants.ts
    allocations.ts
    reservations.ts
    assignments.ts
    workdays.ts
    usage.ts
    ledger.ts
    audit.ts
  services/
    registration-service.ts
    credential-service.ts
    allocation-service.ts
    admission-service.ts
    demand-compiler.ts
    assignment-function.ts
    lease-service.ts
    workday-service.ts
    settlement-service.ts
    recovery-service.ts
  routes/
    provider-registration.ts
    team-governance.ts
    provider-runtime.ts
    grants.ts
    allocations.ts
    workdays.ts
    observability.ts
  domain/
    transitions.ts
    reason-codes.ts
    projections.ts
```

The existing `app.ts` becomes a thin typed route-registration composition point. `store.ts` delegates to typed repositories. Capacity implementation must not remain under `@ts-nocheck`.

### `@treeseed/cli`

Split the capacity handler into:

- `capacity/registration.ts`
- `capacity/providers.ts`
- `capacity/grants.ts`
- `capacity/allocation.ts`
- `capacity/workdays.ts`
- `capacity/assignments.ts`
- `capacity/runtime.ts`
- `capacity/reports.ts`

Use one human/control-plane client. Remove capacity methods from the duplicate control-plane client. Keep a separate provider-protocol client because its authentication, audience, and threat model differ.

## Phased Implementation

### Phase 0 — Canonical Audit and Completion Control

Tasks:

- Create `docs/agent-capacity-completion.md` from this plan.
- Assign stable IDs to every known inconsistency and unfinished path.
- Inventory all capacity and agent code, exports, routes, clients, schemas, migrations, tests, guarantees, starter files, and recent related history.
- Record canonical owners and replacement paths.
- Record unrelated dirty-worktree changes and preserve them.
- Mark guarantees that overstate current behavior as `planned` or `blocked`.
- Add the phase ledger and evidence templates.
- Update package ownership and canonical documents where current ownership statements are contradictory.

Exit criteria:

- Every known old and new path appears in the inventory.
- Every issue has a selected owner and target phase.
- No architecture ambiguity remains.
- No implementation starts before this phase is complete.

### Phase 1 — Clean Contracts, Schema, and Module Foundations

Tasks:

- Introduce versioned SDK identity, registration, membership, credential, availability, grant, allocation, reservation, assignment, artifact, and citation contracts.
- Implement strict schemas and stable error/reason codes.
- Create focused API repository/service/route directories.
- Build the clean schema baseline and reset procedure.
- Remove legacy provider API key and team-owned provider schema.
- Add transactional helpers and compare-and-swap primitives.
- Add scoped lint, complexity, source-size, and clone-detection checks.
- Remove capacity reliance on `@ts-nocheck`.

Tests:

- SDK serialization and schema tests.
- Fresh database initialization.
- Foreign-key and uniqueness tests.
- Transaction rollback tests.
- Negative schema assertions proving legacy tables and columns do not exist.
- Package-local SDK and API verification.

Exit criteria:

- Fresh installs contain only the target schema.
- Public contracts compile independently.
- Capacity code is typed and modular.
- No legacy data compatibility remains.

### Phase 2 — Registration, Membership, and Credential Security

Tasks:

- Implement team registration-key creation, reveal, enable, disable, and rotation.
- Implement encrypted reveal storage and hashed verification.
- Implement Ed25519 identity creation and signed provider proof.
- Implement replay protection and rate limiting.
- Implement provider registration request lifecycle.
- Implement team approval, rejection, cancellation, suspension, resume, and revocation.
- Implement one-time membership credential exchange.
- Implement membership credential rotation/revocation and short-lived access tokens.
- Emit audit events for all operations.
- Remove old registration, provider-key, heartbeat, and check-in routes, clients, scopes, and tests.

Tests:

- Registration with valid and invalid keys.
- Duplicate/idempotent registration.
- Proof forgery, replay, expiry, and clock-skew rejection.
- Rotation immediately invalidates the previous key and cancels pending requests.
- Rotation leaves approved memberships intact.
- Approval creates no grant or allocation.
- Reject/cancel/expire state transitions.
- One-time credential exchange.
- Credential and access-token revocation.
- Cross-team authorization isolation.
- Concurrent approve/reject conflict handling.

Exit criteria:

- One provider identity can hold approved memberships in at least two teams.
- Neither team can observe or mutate the other membership.
- All legacy registration paths are deleted.

### Phase 3 — Multi-Team Provider Runtime

Tasks:

- Implement provider manifest version 2.
- Add identity and connection CLI operations.
- Implement independent access-token/session state per membership.
- Implement the provider-local weighted-deficit coordinator.
- Enforce global execution-provider and runner limits.
- Enforce per-connection offers.
- Add durable local reservation and recovery state.
- Reconcile active leases after restart.
- Prevent cross-team status or trace leakage.
- Integrate lifecycle commands with reconciliation.
- Delete the single-team runtime assumptions.

Tests:

- Two teams sharing one provider.
- Unequal connection weights.
- Per-connection maximum.
- Provider-global maximum across teams.
- Revocation of one membership while another continues.
- API outage and token refresh.
- Manager crash and lease recovery.
- No double acceptance under concurrent team polls.

Exit criteria:

- A single provider process safely serves multiple teams.
- No provider-global budget can be oversubscribed.
- Per-team failures remain isolated.

### Phase 4 — Grants and Allocation Enforcement

Tasks:

- Implement typed `CapacityGrantV2`.
- Implement `CapacityAllocationSetV2`.
- Implement immutable activation and supersession.
- Implement the single SDK admission evaluator.
- Integrate grants and allocations into reservation admission.
- Implement explicit reserve and borrowing rules.
- Implement policy explanation output.
- Remove flat or opaque allocation policy handling.
- Remove any implicit capacity creation on membership approval.

Tests:

- Percentage invariants.
- Project/class/mode reference validation.
- Missing grant denial.
- Membership-only denial.
- Target prioritization.
- Min/max/hard-cap enforcement.
- Reserve behavior.
- Allowed and denied borrowing.
- Zero, null, and unmetered semantics.
- Immutable active versions.
- Concurrent hard-cap admission.
- Stable reason-code snapshots.

Exit criteria:

- Every assignment has an active membership, grant, allocation version, and reservation.
- Stored policy demonstrably changes admission decisions.
- No duplicated allocation math exists.

### Phase 5 — Workdays, Demand Compilation, and Assignment Function

Tasks:

- Implement durable workday budgets and time windows.
- Implement the canonical demand compiler.
- Remove test/live special synthesis and legacy handler maps.
- Implement fair participation cycles.
- Implement planning demand for objectives, questions, proposals, reviews, knowledge gaps, and idle intents.
- Implement acting decision/readiness gates.
- Make assignment synthesis idempotent.
- Ensure all billable assignments have a valid positive reservation.
- Implement assignment explanations and safe cancellation/requeue.

Tests:

- Planning continues after one completed assignment.
- Every eligible agent participates before repeats.
- Ineligible agents have explicit reasons.
- No approved decision still produces useful planning work.
- Acting without decision, readiness, capacity plan, grant, allocation, or reservation is denied.
- Duplicate provider polling produces one assignment.
- Workday end and budget exhaustion stop new assignments.
- Resume and repeated ticks remain idempotent.

Exit criteria:

- Real workdays no longer behave like fixed-count smoke tests.
- Planning and acting use the same assignment path.
- The live-workday reservation inconsistency is eliminated.

### Phase 6 — Transactional Usage, Settlement, and Recovery

Tasks:

- Add unique usage and settlement idempotency keys.
- Implement transactional usage ingestion.
- Implement one exactly-once settlement service.
- Remove select-before-insert settlement logic.
- Implement assignment/version compare-and-swap.
- Define retryable, terminal, and operator-action failure classes.
- Implement expired lease recovery and orphan reconciliation.
- Prevent double counting between reservations, usage actuals, and ledger entries.
- Implement overrun holds and explicit approval.

Tests:

- Concurrent duplicate completion.
- Duplicate usage reports.
- Partial provider failure during completion.
- Transaction rollback after usage but before settlement.
- Lease expiry during execution.
- Runner crash and replay.
- Reservation release exactly once.
- Overrun approval and rejection.
- Ledger remains balanced and append-only.

Exit criteria:

- Concurrent retries cannot create duplicate usage or settlement.
- Every terminal assignment has one explainable financial result.

### Phase 7 — Kernel, Runner, and Legacy Removal

Tasks:

- Refactor AgentKernel and runner into the focused modules specified above.
- Make `runAssignment` the sole production execution method.
- Replace duplicate mode selection with activity-profile resolution.
- Use SDK validators everywhere.
- Remove legacy provider manager, workday manager, queue observer, priority resolver, mode scheduler, and old CLI/service consumers.
- Remove obsolete package exports and `start:manager`.
- Update package-shape tests to require the new architecture.
- Remove unused files rather than leaving unreferenced code.

Tests:

- Import-boundary tests.
- Public-export snapshot.
- Legacy-name forbidden-search test.
- Kernel preflight and output validation.
- Planning/acting activity selection.
- Cancellation and timeout.
- Runner lifecycle and recovery.
- Standalone Agent package build and test.

Exit criteria:

- No production caller can reach a legacy kernel or manager path.
- No duplicate kernel validation or mode decision remains.
- Public package exports describe only the target runtime.

### Phase 8 — TreeDX Content and Handler Completion

Tasks:

- Make tool-mediated TreeDX operations the sole content path.
- Remove deterministic duplicate note writes.
- Remove workday-content and knowledge-promotion direct mutation.
- Implement structured built-in writer, estimator, actor, releaser, and reporter handlers.
- Implement `AgentArtifactManifest`.
- Validate linked frontmatter and expected artifact types.
- Make handoff subject and output type configuration-driven.
- Preserve explicit fixture-only adapters outside production exports.

Tests:

- One tool-created artifact results in exactly one content entry.
- Invalid or missing subject links fail.
- Handler cannot widen tools or mode.
- Local direct mutation attempts fail.
- Artifact manifest matches TreeDX receipts.
- Reporter creates one deterministic summary.
- Trace includes every required forensic field.

Exit criteria:

- There is one output owner.
- No production agent content path bypasses TreeDX.
- Starter projects need no custom TypeScript handler implementations.

### Phase 9 — Autonomous Engineering Starter

Tasks:

- Delete starter handler shims.
- Add complete MDX activity profiles for all eight roles.
- Configure planning and acting permissions.
- Implement the test-first engineering work graph.
- Integrate scoped TreeSeed worktree and verification operations.
- Implement reviewer revision loops.
- Implement documentation and release-readiness activities.
- Add real fixture objectives and decisions for service verification.
- Preserve independent starter-repository verification.

Tests:

- Planning-only engineering workday.
- Full approved engineering workflow.
- Test-first ordering.
- Engineer cannot modify tests outside permission.
- Tester cannot modify implementation.
- Review rejection creates revision nodes.
- Repeated execution is idempotent.
- Release remains fail-closed during hosted suspension.

Exit criteria:

- The starter autonomously plans, implements, tests, reviews, documents, and reports a real scoped change.
- No dummy message chains or project handler code remain.

### Phase 10 — Autonomous Research Starter

Tasks:

- Correct research template identifiers.
- Delete starter handler shims.
- Add research activity profiles and source policy.
- Implement provider-neutral source search/fetch.
- Add citation schemas and evidence-note routing.
- Implement citation review and revision.
- Implement knowledge artifact and research-report generation.
- Add a real multi-source fixture investigation.

Tests:

- Source allowlist and network controls.
- At least two independent sources.
- Retrieval metadata and hashes.
- Unsupported claim rejection.
- Contradictory-source representation.
- Review-driven revision.
- Cited final artifact.
- TreeDX-only persistence and complete trace.

Exit criteria:

- The starter independently performs research, evidence collection, synthesis, review, revision, knowledge publication, and reporting.

### Phase 11 — Complete CLI/API/Configuration Parity

Tasks:

- Finish every command listed in the CLI matrix.
- Ensure every future UI mutation has an API and CLI operation.
- Ensure declarative grant, allocation, agent, activity, and provider-offer policy has a schema-backed configuration form.
- Add JSON schemas and example configuration.
- Standardize pagination, filtering, idempotency, error output, secret handling, and plan/apply behavior.
- Remove duplicate Market/ControlPlane client implementations.
- Generate or validate command/API parity documentation from descriptors.

Tests:

- CLI-to-API contract tests for every command.
- JSON output snapshots.
- Noninteractive automation.
- Secret redaction.
- Idempotent repeated mutations.
- Configuration round-trip and validation.
- Negative permission tests.

Exit criteria:

- No governance or operational action requires Admin UI.
- The CLI and API expose the complete backend system.

### Phase 12 — Guarantees and Local Service Workflows

Tasks:

- Audit all existing capacity and agent guarantees.
- Demote every mock-, string-, or file-existence-only overclaim.
- Add service-workflow verifiers using the real API, PostgreSQL adapter, provider manager, runner, AgentKernel, TreeDX, and settlement path.
- Run autonomous execution guarantees through the normal manifest-selected real execution provider; use bounded deterministic service workflows only for control-plane failure isolation, never as autonomous-execution evidence.
- Run package-local workflows and the integrated shared fixture.

Required guarantee families:

- Registration key uniqueness, reveal audit, rotation, cancellation, and disablement.
- Signed registration and replay protection.
- Approval-is-membership-only.
- Credential exchange, rotation, and revocation.
- Multi-team isolation and provider-global no-double-spend.
- Grant requirement and enforcement.
- Allocation validation, immutability, caps, reserve, and borrowing.
- Atomic reservation.
- Exactly-once usage and settlement.
- Fair participation.
- Continuous useful planning.
- Acting provenance.
- TreeDX-only content.
- Single artifact ownership.
- Complete forensic trace.
- Autonomous engineering.
- Cited autonomous research.
- Crash, retry, replay, lease-expiry, and revocation recovery.
- CLI/API parity.

Exit criteria:

- Active guarantees execute actual lifecycle behavior.
- No active guarantee relies solely on mocks, source strings, or file presence.
- Guarantees that claim agent execution fail closed when the selected real execution provider is unavailable; no mock, synthetic, or fabricated completion fallback is permitted.
- Local service workflows are repeatable and leave no orphaned state.

### Phase 13 — Reconciliation, Operations, Security, and Performance

Tasks:

- Integrate provider identity, connection configuration, runtime images, and local state with reconciliation.
- Add import/adopt/destroy behavior where applicable.
- Add structured logs, metrics, traces, and audit exports.
- Define health/readiness for API, provider manager, runner, TreeDX, and execution providers.
- Add retention and cleanup policies.
- Add rate-limit, credential-rotation, incident-response, and provider-offboarding runbooks.
- Load-test registration, admission, polling, lease renewal, and settlement.
- Test PostgreSQL and supported local database behavior.
- Verify runtime images and starter templates are independently buildable.
- Run local reconciliation smoke and acceptance workflows.

Hosted limitation:

- Do not add deployment workflows or mutate Railway/Cloudflare while suspension remains active.
- Record hosted acceptance as blocked by the reviewed infrastructure rebuild.

Exit criteria:

- Local and package environments are operationally supportable.
- Security, recovery, and performance targets are evidenced.
- Hosted readiness remains explicitly blocked if infrastructure is still suspended.

### Phase 14 — Final Audit and Production-Readiness Report

Repeat the comprehensive audit against the final implementation:

- Trace registration through settlement.
- Trace engineering and research workflows from configuration to durable artifacts.
- Search for duplicate, legacy, unused, compatibility, direct-content, and untyped paths.
- Verify package boundaries and standalone builds.
- Verify every public API, CLI command, schema, and guarantee.
- Compare documentation with executable behavior.
- Confirm all provider and workday leftovers are cleaned up.
- Confirm no guarantee overstates evidence.
- Confirm unrelated user changes were preserved.

The final report in `docs/agent-capacity-completion.md` must list:

- Completed contracts and workflows.
- Removed legacy files, routes, tables, scopes, clients, and exports.
- Guarantee evidence and commands.
- Performance and recovery results.
- Known limitations.
- Exact remaining work.
- Hosted acceptance status.
- Current readiness classification.

If any item remains, the report must state `Production readiness: incomplete` or `blocked`, identify the next phase and owner, and prohibit declaring 100% readiness.

## Verification Matrix

At minimum, run:

- SDK typecheck, lint, unit tests, schema tests, and package build.
- API typecheck, lint, repository/service integration tests, fresh schema tests, and package build.
- Agent typecheck, lint, kernel/runner tests, runtime-image build, and package build.
- CLI typecheck, command contract tests, and package build.
- Engineering starter standalone validation and full local workflow.
- Research starter standalone validation and full local workflow.
- Integrated Market fixture verification.
- Focused guarantee validation and planning.
- Active local `@treeseed/agent` and `@treeseed/api` guarantee runs.
- `trsd capacity test-local` through the canonical runtime.
- Local reconciliation smoke and acceptance tests.
- Static forbidden-legacy and direct-content-access scans.
- Duplication, source-size, dependency-boundary, and compiler-suppression checks.

Hosted provider acceptance is added only after the suspension is formally lifted. At that point, cleanup must run before and after isolated staging acceptance.

## Required Failure and Edge Cases

The completed test suite must cover:

- Registration-key rotation racing with registration.
- Two registrations from the same provider for one team.
- One provider registering with multiple teams.
- Same display name with different identities.
- Replayed and malformed signatures.
- Approval racing with rejection.
- Membership revoked during a running lease.
- Credential revoked while an access token is active.
- Availability session replay or out-of-order sequence.
- Provider restart with active assignments.
- API outage during lease renewal.
- Two teams simultaneously requesting the final provider slot.
- Allocation version superseded while reservations remain active.
- Concurrent reservations at a hard cap.
- Concurrent duplicate completions.
- Partial usage reports.
- Usage greater than reservation.
- Workday expires during planning or acting.
- No approved decisions.
- No useful planning demand.
- Agent failure before and after content mutation.
- Tool creates content but response is lost.
- Reviewer requests multiple revision cycles.
- Unsupported and contradictory research claims.
- TreeDX unavailable.
- Execution provider unavailable or rate-limited.
- CLI interruption and idempotent retry.
- Cleanup after failed service workflows.

## Explicit Assumptions and Defaults

- The system has not launched; capacity data may be reset without migration or compatibility.
- The new architecture wholly replaces the old architecture.
- Provider identity is global and based on an Ed25519 public-key fingerprint.
- A team has one active broadcast registration-key generation.
- Registration-key rotation immediately invalidates the previous key and cancels its pending requests.
- Approved memberships survive broadcast-key rotation.
- Approval creates membership only.
- Grants and allocation activation are separate team actions.
- Membership credentials are opaque, hashed at rest, membership-scoped, independently revocable, and revealed once.
- Access tokens last 15 minutes and refresh with five minutes remaining.
- Provider signed proofs last no more than five minutes.
- Every mutation supports idempotent retry.
- Weighted-deficit round-robin is the default multi-team scheduling policy.
- Equal connection weights apply when none are configured.
- Provider-native and provider-local limits always override offered or requested capacity.
- Allocation borrowing is denied unless explicitly configured.
- Activated allocation versions are immutable.
- PostgreSQL transactions and database constraints are authoritative for concurrent admission and settlement.
- Planning remains useful without approved decisions.
- Acting always requires approved provenance and capacity admission.
- TreeDX is the sole production content access and mutation path.
- Admin UI implementation is outside scope.
- Hosted deployment remains suspended and cannot be considered production-proven until reviewed infrastructure and hosted acceptance are restored.
- Starter repositories remain independently buildable and are integrated through canonical TreeSeed package workflows rather than unpublished sibling-source assumptions.

## Definition of 100% Production Readiness

The architecture is complete only when all of the following are true:

- A provider can securely register with and serve multiple teams.
- Teams independently approve, reject, suspend, revoke, grant, and allocate provider capacity.
- Membership alone cannot run work.
- Broadcast registration-key rotation behaves exactly as specified.
- Provider credentials and sessions can be revoked immediately.
- Provider-global limits cannot be oversubscribed across teams.
- Allocation policy is enforced rather than merely stored.
- Reservations and settlement remain correct under concurrency and retries.
- Workdays perform useful continuous planning and properly gated acting.
- Every eligible agent participates fairly.
- Engineering and research starters autonomously complete their respective real workflows.
- Content is TreeDX-backed, linked, non-dummy, and emitted once.
- Every execution has complete forensic provenance.
- Every backend capability is available through API and CLI, with declarative configuration where appropriate.
- All duplicate, legacy, unused, placeholder, compatibility, and direct-mutation paths are deleted.
- Capacity and agent production code is typed, modular, independently testable, and free of compiler suppressions.
- Active guarantees prove real service workflows.
- Package-local and integrated verification pass.
- Local and hosted acceptance pass with cleanup.
- Documentation exactly matches executable behavior.
- The final completion report has no unresolved production blockers.
