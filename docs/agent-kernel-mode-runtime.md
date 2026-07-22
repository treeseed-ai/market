# Agent Kernel Mode Runtime

**Status:** Canonical runtime design for activity-profile execution, planning reservations, and planning/acting mode boundaries
**Last updated:** 2026-07-21
**Audience:** Agent runtime, SDK/API contract, provider runtime, Admin, and CLI implementers

> Completion authority: [Agent Capacity Completion and Production-Readiness Plan](./agent-capacity-completion.md) governs removal of legacy kernel scheduling/cycle surfaces, consolidation on `runAssignment`, and the TreeDX single-artifact execution contract.

The AgentKernel is owned by `@treeseed/agent`. SDK owns portable contracts used by the kernel, and API owns durable assignment, mode-run, and usage records. Core remains the reusable web runtime and must not own agent scheduling or provider execution.

The human-machine execution provider architecture extends this runtime boundary so handlers build provider-neutral work packages and execution provider adapters perform or coordinate the work across AI, deterministic automation, and human issue queues. The kernel still validates assignment mode, reservation capacity, readiness, capability coverage, scoped handles, activity-profile configuration, and output contracts before provider-assigned work can complete. See [Human-Machine Execution Providers](./human-machine-providers.md).

## Current Architecture Snapshot

Project agent definitions are Astro content models. Root Market agents live in `src/content/agents/*.mdx`; package project agents live in `docs/src/content/agents/*.mdx`. Agent content frontmatter is the project-owned source of truth for:

- stable agent identity and project agent class mapping
- activity profiles
- profile-specific prompt configuration
- profile-specific TreeDX content access
- profile-specific allowed tools
- profile-specific branch policy
- profile-specific question policy
- profile-specific output contracts
- required execution-provider capabilities

The clean first-party handler set is:

- `writer`: TreeDX-backed planning, writing, research, knowledge, and review content work
- `actor`: scoped repository or test mutation through assignment-feature branches
- `estimate`: structured estimate and dependency declaration production
- `releaser`: staging-to-release verification and release execution
- `reporter`: deterministic workday, assignment, graph, capacity, and tool-telemetry reports

The supported activity types are:

- `planning`: autonomous project-agent work inside a planning reservation
- `estimating`: structured estimates that feed decision execution graphs
- `acting`: approved decision/work-unit execution inside an acting reservation
- `reviewing`: validation, feedback, quality gates, and arbitration
- `reporting`: deterministic summaries and operator-facing audit artifacts

Handler id is implementation routing, not governance authority. Activity profile, assignment mode, reservation, readiness, and allowed tools decide what a run may do.

## Runtime Goal

Every bounded agent execution is either planning or acting at the capacity-accounting boundary. Activity types refine the run purpose inside that boundary.

Planning mode prepares work through `planning`, `estimating`, `reviewing`, and some `reporting` activity profiles:

- estimates approved decisions
- compares approaches
- summarizes unresolved direction
- drafts proposals
- identifies missing inputs
- improves agent-local documentation when primary planning work is exhausted

Acting mode executes approved work through `acting`, `reviewing`, `reporting`, and release-oriented activity profiles:

- performs decision-linked changes
- runs verification or release work
- updates project content or repositories through scoped tools
- reports blockers
- creates weakness proposals when assigned acting work is exhausted

Handlers do not choose whether they are planning or acting. The provider runner leases an existing `ProviderAssignment`, then calls `AgentKernel.runAssignment`. The kernel validates the mode-bounded scope and invokes the project-owned handler selected by the activity profile with capacity context on `AgentContext`.

The kernel receives only assignments that survived strict API repository decoding and the single API lease-authority path. Unknown assignment modes, corrupt durable context, invalid state versions, and malformed lease duration are control-plane failures and must never be coerced into a planning kernel run.

## Kernel Input

The kernel receives:

- `ProviderAssignment`
- `AgentCapacityEnvelope`
- `DecisionExecutionInput`
- `AgentKernelProfile` when available from the project agent class
- `AgentKernelPolicy` when available from the project agent class
- project agent definition, selected activity profile, and handler mapping
- provider execution context
- TreeDX proxy handle when assignment workspace context provides one

The assignment decides the outer scope. The envelope decides budget and capability bounds. The input decides the governance context. The profile and policy decide runtime behavior.

The kernel receives policy provenance selected by the API; it never creates or repairs that policy. Workday assignments must reference an already-active grant, effective allocation version, governed reservation, and pre-existing TreeDX binding. A missing or ambiguous record is a control-plane scheduling failure, not permission for the kernel or provider runner to synthesize a fallback grant, allocation, or repository binding.

The API's typed workday demand compiler selects the project agent, activity profile, handler, planning intent, source context, and durable participation entry before admission; the assignment function binds that demand to the admitted assignment. The kernel consumes that admitted envelope only; it does not rediscover projects, repair corrupt workday records, choose a different agent, or maintain a parallel workday scheduler.

The API also compiles project/team/architecture/repository context before admission and fails on incomplete durable ownership or read uncertainty. The kernel consumes that admitted context and never synthesizes repository or team defaults.

The admitted envelope is durably owned by one exact workday run. An uncertain scheduling or recovery transition prevents dispatch from being treated as ready; the kernel never infers run ownership from an envelope id or repairs missing scheduling evidence.

All JSON policy and context persisted before admission is strictly decoded by the API. The kernel receives a validated admitted envelope and never substitutes defaults for malformed allocation, grant, workday, session, class, reservation, or assignment evidence.

The API also strictly decodes agent/capacity mutation requests as JSON objects before they can shape an assignment. Malformed, null, array, or primitive input cannot become default planning, capacity-plan, lease, lifecycle, mode-run, or workflow-operation data, so the kernel never receives work derived from a parser fallback.

The implemented `AgentContext.capacity` field is optional so existing handlers continue to run outside provider assignment execution. When present, it includes assignment id, provider id, selected mode, capacity envelope, decision input, project agent class/profile/policy metadata, source assignment, readiness metadata, and TreeDX proxy handle metadata.

The implemented `AgentContext.treeDx` field is also optional. Provider runners hydrate it only from fully scoped assignment proxy handles, apply handle-bound repository/workspace/read-path/write-path/operation defaults locally through the canonical SDK evaluator, and call TreeSeed `/v1/dx/projects/:projectId/...` proxy routes with provider auth, assignment id, and proxy handle id. The API independently authorizes the request against the durable handle written by admission; it never trusts the embedded assignment copy as an authorization fallback. Handlers can build context, read repository files, search workspaces, write workspace files, commit workspaces, and read back results through that adapter without seeing raw TreeDX service credentials. Model-aware content commands sit above this raw adapter: they render and validate SDK content records before calling the assignment-scoped TreeDX workspace routes.

Before the kernel receives a writable workday assignment, the API has created its deterministic workspace through a bounded, strictly decoded TreeDX response and admitted the corresponding durable proxy handle. The kernel never accepts a replacement workspace id or repairs an uncertain workspace response.

TreeDX is the default SDK content and repository backend, including local environments. Missing TreeDX configuration is a setup error for content operations; local filesystem content is available only when a caller explicitly passes `contentRepository: { adapter: 'local' }`. Provider runners load project agent specifications through the assignment-scoped TreeDX proxy. Optional tenant handler implementations are code extensions under the dedicated `src/agent-handlers/` directory; general `src/agents/` runtime/support modules are never inferred to be handlers. Assignment content reads and writes always use TreeDX proxy handles when those handles are present.

Execution provider invocations carry a redacted `agent_tool` catalog derived from the agent content definition and the assignment handles available to the provider runner. Codex receives the same assignment-scoped tool catalog through a local stdio MCP server, while GitHub Issues receives credential-free tool descriptions, route templates, and required header names for human or external automation executors. Descriptors never contain raw TreeDX bearer tokens, provider API keys, GitHub tokens, repository deploy keys, or unredacted proxy payloads.

Agent tool availability is fail-closed. `tools.allowed` is the source of truth for execution-provider callable tools, but a listed tool is exposed only when its runtime requirements are present. TreeDX tools require a scoped proxy handle; model-aware content tools also require matching `contentAccess` model/action policy; worktree tools require a prepared assignment worktree; SDK dispatch tools require a dispatch-capable SDK context. Missing requirements omit the tool from the callable catalog and are recorded in `agentToolCatalog.omitted` metadata. MCP calls validate tool input before execution and emit assignment-scoped tool-call telemetry.

Questions are created through TreeDX/content tools, not through a special structured return field. Provider-local MCP/tool runtimes must capture tool operation parameters, operation outputs, and derived events such as `question_created`, `content_created`, and `branch_staged`. Handlers use those captured tool events to decide whether an execution provider added questions, staged content, or needs human/team input before continuing.

Agent content access is separate from provider tool access. `contentAccess.read`, `contentAccess.write`, and `contentAccess.commit.allowed` define which content models and actions an agent or handler may use. Handlers can call SDK content operations when `contentAccess` allows them without exposing those operations to the execution provider. Execution providers receive only the intersection of `tools.allowed`, `contentAccess`, and assignment runtime handles.

Codex and other AI-focused execution providers should receive assignment-scoped tools directly where their harness supports tool calling. A handler should not require a magic output string to ask the runtime for a tool; missing capability is reported as a structured blocked result. Provider runners capture execution-provider messages, usage, and artifacts as assignment/mode-run telemetry so UI surfaces can follow long-running agent work.

Mode-run telemetry is required evidence, not best-effort logging. Every provider phase derives one stable identity from the assignment and logical event and retries that same identity through a bounded delivery primitive. A provider message remains pending until the API acknowledges it. If required evidence cannot be persisted after bounded retries, the runner does not silently continue: it returns or fails the assignment through the canonical lease path and records explicit telemetry-delivery diagnostics on that lifecycle transition.

Kernel lifecycle identity is narrower than provider telemetry identity. The assignment supplies the canonical `modeRunId`; kernel start and terminal updates use that id, and the resulting artifact manifest must reference it. Provider phase/message rows use their own stable event ids. They provide detail but cannot authenticate a predecessor artifact or replace the canonical lifecycle row.

For governed research, the work package includes `researchStage`, `minimumIndependentSources`, `maxRevisionCycles`, current revision count, and the latest authenticated review attempt when one exists. Research tools are callable only when the assignment catalog contains the provider/project policy intersection. Successful fetches, claims, and review decisions become authenticated tool events. The Codex adapter enforces required fetch receipts at the independent-source stage and may issue one bounded same-thread correction for either a completed or waiting result; it never converts prose or an unauthenticated URL into citation evidence. A reopened revision prompt quotes the Reviewer's reason and requires evidence-bounded claim text, not a status-only edit.

Reviewer rejection remains an authenticated successful output even at the post-revision approval gate. AgentKernel and the provider runner complete and settle that assignment normally; API workflow projection records the reason and synthesizes the reopened Researcher revision demand while below the configured limit. At the limit it records a blocked workflow instead of another demand. The runtime must not rewrite an evidence-based rejection into approval or treat the feedback result as a provider failure.

The same correction boundary enforces general completion receipts. One isolated Codex client and runtime home span the initial run and its single correction so the existing thread and assignment MCP catalog remain authoritative; cleanup occurs only after the assignment attempt ends. Missing verification, checkpoint, review, note-relation, or required content-kind receipts can request narrowly scoped follow-up tool work. Before either canonical TreeDX commit tool may finalize a writable assignment workspace, the provider tool boundary checks authenticated telemetry for the required content model and subject relations on every mutated note. A missing gate returns a structured non-mutating result, allowing the same thread to repair content before TreeDX makes the workspace immutable. Auxiliary content remains independently classified and cannot be relabeled as the required deliverable, while later validated receipts for the same content path supersede earlier incomplete relation metadata.

## Mode Selection

Mode selection is API- and kernel-coordinated:

- API selects eligible demand and issues an assignment with a target mode.
- The API-selected assignment and its resolved activity profile are the sole mode/activity decision; the kernel does not run a queue observer, priority resolver, or mode scheduler.
- Kernel validates that the project agent profile supports the mode.
- Kernel maps assignment context into a bounded activity-profile handler invocation.
- Kernel applies fallback only within the assignment's allowed mode and output types.

If the assignment is invalid, unsupported, expired, missing planning or acting reservation capacity, outside provider capability, or past retry policy, the kernel returns a structured bounded result instead of widening scope. Provider runner maps retryable bounded results to assignment return when the provider client supports return semantics, and maps non-retryable results to assignment failure.

## Planning Budget

Planning budget can be used for:

- required estimates before acting capacity is committed
- proposal comparison
- readiness analysis
- risk and dependency discovery
- summarization for human decision makers
- proposal drafting when no required planning inputs remain
- agent-local documentation improvements when configured by policy

Planning outputs do not approve work. They feed proposal governance, immutable decisions, allocation policy, and later capacity plans.

Planning assignments are reservation-backed. New planning assignments must carry a planning `reservationId`, positive `reservedCredits`, workday/allocation metadata when applicable, and mode-budget explanation metadata. Deterministic system reports may be explicitly marked as reservation-exempt only when they are reporting existing control-plane state and do not consume project planning budget.

## Acting Budget

Acting budget can be used for:

- immutable accepted decision execution
- repository or content edits through scoped project tools
- verification and release steps authorized by the assignment
- diagnostic or repair work explicitly included in the assignment
- producing blockers and weakness proposals when acting cannot continue

Acting mode must stay tied to approved work or explicit runtime authorization. It cannot discover arbitrary project work and begin execution.

## Capacity Envelope Enforcement

The kernel must enforce:

- mode
- budget
- reserved planning or acting capacity
- lease window
- output contract
- capability grants and assignment eligibility metadata
- tool access
- repository/workspace scope
- acting readiness state when supplied by the assignment
- TreeDX proxy handle project/assignment scope and expiry
- explicit output contracts on the assignment, such as allowed statuses and output types
- maximum attempts
- fallback limits

The provider runner enforces provider-local runtime limits as well, such as concurrency, model availability, local queue pressure, and native subscription constraints.

## Handler Contract

Handlers receive a mode-bounded execution context. They should treat it as the only source of allowed work.

Handlers may:

- read selected context
- execute allowed tools
- produce allowed outputs
- report uncertainty, blockers, estimates, usage, and validation results

Handlers must not:

- approve proposals or mutate governance outcomes
- mutate allocation policy
- create unscoped provider work
- request raw TreeDX credentials
- widen mode or capability scope
- hide usage or retries from the mode run

Project agent configuration is the central source for permissions and prompt policy. Handlers may validate and serialize outputs, but they must not widen content, repository, or tool permissions beyond the assignment and agent configuration.

## Fallback Behavior

Fallback is policy-driven and observable.

Planning fallback examples:

- required estimate missing context -> produce missing-input output
- no required estimates -> compare weak proposals
- no proposal work -> draft a proposal idea
- no project planning work -> improve configured agent-local docs

Acting fallback examples:

- approved work blocked -> report blocker
- verification unavailable -> produce diagnostic output
- no acting work in assignment -> return assignment
- repeated failure -> create weakness proposal if policy allows

Every fallback emits a reason on the `AgentModeRun`. When the provider runner maps a bounded fallback to assignment return or failure, the same fallback is persisted as an `AgentFallbackOutput` for operator review before the lease is released. Its identity is deterministic for assignment, mode, fallback code, and durable attempt number; transport replay returns the first canonical evidence and cannot overwrite another execution's record.

The API lifecycle service rejects return, completion, or failure after lease expiry even when the runner still holds the old token. The runner must renew before expiry or stop; it cannot use a fallback or late result to terminalize work after authority has lapsed.

Permissions failures are not a pause reason at assignment execution time. Work that the assigned agent cannot access should be rejected before lease. Runtime pauses are reserved for time or capacity shortage and must preserve assignment state for continuation.

## Telemetry

Every bounded attempt emits an `AgentModeRun` record with:

- assignment id
- mode
- selected input
- handler id
- activity type
- output references
- trace references
- status
- fallback reason
- usage actuals
- validation result

`AgentRunTrace` can remain as lower-level trace detail while the system migrates. `AgentModeRun` is the durable cross-package record for assignment/mode/usage accounting.

The implemented Architecture Milestone M3 path emits a running mode-run event before handler execution and a terminal mode-run event after success, failure, cancellation, or bounded fallback. Terminal records include trace references to the lower-level `AgentRunTrace` when handler execution reaches the trace path. M3 is a roadmap milestone, not a completion-plan phase number.

## Verification Expectations

Runtime verification should continue to prove:

- planning and acting runs are distinguishable in records and reports
- handlers cannot silently widen assignment scope
- unsupported assignments are returned with reason
- expired leases stop or renew before continuing
- fallback paths are bounded and visible
- usage actuals settle against the assignment and mode run
- the API's exactly-once reservation settlement is the sole usage-actual writer; the kernel cannot create a parallel usage record
- provider assignments and mode runs are the sole task execution lifecycle; a project-runner task queue, client, or task/event/output table must not be reintroduced
- provider availability and assignment telemetry are the sole agent coordination lifecycle; project-runner manager leases, worker runners, repository claims, runner scale decisions, agent pools, pool registrations, or direct worker-pool scalers must not be reintroduced
- the canonical mode-run row named by the assignment and artifact manifest exists and reaches its terminal state; provider phase rows are not accepted as a substitute
- engineering downstream worktrees resolve the final successful authenticated checkpoint from completed predecessor manifests, and review does not demand graph-blocked downstream artifacts
- research source tools expose only the provider/project domain intersection, and the eleven-stage workflow advances only from authenticated citation, claim, review, TreeDX artifact, publication, and reporting evidence
- two-slot acceptance runs distinct project assignments through separate runners and TreeDX workspaces, with overlapping durable claim intervals and independently settled usage
- availability authority remains fresh throughout any assignment longer than the short session TTL, without a background acceptance scheduler pre-leasing later graph work

AgentKernel authority ends at the assignment checkpoint and artifact manifest. It never integrates that checkpoint into an operator branch. The separate SDK/CLI supervisor operation reads the API-selected deliverable manifest and repository topology, revalidates the completed graph and immutable Git evidence, and stops at a local task-branch integration. Normal `trsd save`, stage, release, and deployment controls remain outside AgentKernel and the provider runtime.

## Guarantee Execution Providers

Agent guarantee runs support `live-codex` and `auto`. Both require real Codex authentication. `auto` selects Codex when authentication is available and otherwise fails closed with `missing_codex_auth`; it never falls back to a mock or synthetic execution provider. CI and staging must provide real provider credentials for any guarantee that claims execution behavior.
