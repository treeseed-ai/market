# Treeseed Reconciliation Platform

## Seed runtime prerequisites

Seeds may declare local runtime prerequisites in addition to API-owned resources. Local reconciliation applies teams, projects, TreeDX bindings, and deferred verified-email membership claims first; it then adopts or provisions the declared signed capacity-provider connection, writes concrete identifiers only to the ignored managed runtime overlay, reconciles project grants and the portfolio allocation, and starts the provider runtime. A local seed apply is not converged until these declared prerequisites pass live verification. Portable seed and provider manifests never contain generated credentials or concrete provider membership identifiers.

Treeseed infrastructure is reconciled from exact desired state. A command may inspect, plan, apply, verify, or destroy infrastructure, but it must do that through the SDK-owned reconciliation platform. Provider CLIs such as Railway, Wrangler, Docker, and GitHub CLI are diagnostic only unless they are invoked as private adapter primitives by the reconciler or live acceptance harness. They are not orchestration systems.

This document is the canonical contract for hosting, configuration, local development, capacity providers, package workflows, TreeDX image publication, staging, and release.

See [Package Ownership](./package-ownership.md) for the current package map.

Project topology reconciliation uses [Project Architecture Migration](./project-architecture-migration.md). The seed compiles primary and content repository identities into GitHub units. Content is not locally materialized for build or runtime; TreeDX owns operational workspaces and R2 owns published runtime manifests.

For split-content projects, local TreeDX reconciliation observes the authoritative GitHub staging head, fetches that exact ref into TreeDX custody, re-observes GitHub to reject stale plans, and verifies graph/search parity at the resolved commit. It must never populate a split-content TreeDX repository from the primary software checkout. Repeated reconciliation is `noop` only while the TreeDX ref and live GitHub ref remain identical.

The portfolio is compiled in two mutually exclusive authority domains. The Platform seed owns thirteen public primary repositories, their thirteen public content repositories, and the unpaired fixtures support repository. The singleton Market seed owns Market, Market content, the private Market API, and its private content repository. Platform compilation must reject Market service, repository, DNS, or deployment identities before provider planning. The built-in `treeseed` Market profile is immutable outside process-scoped local fixtures and contributes no infrastructure resources.

GitHub repository reconciliation orders exact lifecycle units as repository, bootstrap observation, branches, rules/environments, secrets/variables, and workflow observation. A missing prerequisite is blocking drift; it is never papered over by a later unit. Every successful apply is followed by fresh read-back and a repeated plan must converge to `noop`.

Singleton gateway reconciliation pins an exact Admin API ref and descriptor digest. SDK-owned admission compiles the descriptor's unique method/path templates and rejects undeclared routes, method mismatches, duplicate entries, and any Admin descriptor entry under `/v1/market/**`. Market API CI enumerates the complete pinned inventory before either singleton branch can verify. The gateway remains a protocol consumer and never imports Admin API implementation.

The singleton repository is not a generated disposable tree. Its manifest declares the exact paths owned by reconciliation. Apply overlays those paths onto the live parent tree, removes only paths explicitly released by the prior managed manifest, and preserves private application files. Recovery accepts repository-owned additions only when every declared managed file still matches its pinned SDK/Admin inputs; managed drift remains blocked. Reconciliation also owns standalone `treeseed.site.yaml` and `treeseed.package.yaml` contracts plus a root self-workspace, so an isolated checkout supports package validation and canonical `trsd save`; package capabilities keep hosted deployment disabled. The private Market handler entrypoint is bootstrapped only when absent and is never reclaimed after application ownership begins.

Repository identity is the normalized provider, host, owner, and repository tuple, not a literal clone URL or a local path. SSH, HTTPS, `git+ssh`, trailing-`.git`, case, and relative-submodule forms of the same remote resolve to one canonical key. Checkout identity is separate: developer, capacity-provider, and TreeDX custody each use an independent checkout and Git common directory, even when they represent the same repository and commit.

## Package Ownership In Reconciliation

- `@treeseed/sdk` owns the reconciliation engine, desired-state graph, provider adapters, package workflow discovery, config runtime, and live verification contracts.
- `@treeseed/cli` exposes the command surface that invokes SDK reconciliation.
- `@treeseed/core` contributes web runtime and web-only desired state.
- `@treeseed/admin` owns its independently buildable application manifest and Admin surfaces. Market still consumes its package during migration; that compatibility path is removed only after standalone acceptance.
- root `@treeseed/market` currently owns the combined hosted tenant and is migrating toward ecommerce/public-market-only scope and Market API integration.
- `@treeseed/api` owns the package-local backend `treeseed.site.yaml`, API, operations runner, PostgreSQL, backend route descriptors, public TreeDX federation app desired state, capacity-provider service bindings, and durable capacity coordination records such as provider sessions, assignments, mode runs, reservations, and usage settlement.
- `@treeseed/agent` owns capacity-provider runtime artifacts, provider desired state, provider manager/runner behavior, AgentKernel execution, and provider-local lifecycle.
- `@treeseed/ai` owns the separable local inference appliance and its machine-level supervision. Its package-owned vLLM Compose resource is reconciled through SDK operations; the authenticated gateway, diagnostics, management API, systemd service, and Debian artifact remain outside project scheduling and repository mutation. Training and adapter lifecycle remain planned and must use the same reconciliation boundary.
- `packages/treedx` owns the TreeDX image/service artifact; API hosting consumes selected TreeDX images.
- `@treeseed/ui` owns no infrastructure; it contributes components and styles only.

Managed local web development observes checked-out package output as part of the live source closure. Core excludes workspace-linked TreeSeed packages from Vite dependency prebundling and uses a dedicated, build-stability-aware watcher to invalidate Vite's transformed client and SSR module graph before issuing one full reload after SDK, UI, Core, or Admin runtime output is complete. The watcher treats access errors caused by an in-progress package build as transient: it closes, retries, reattaches, and verifies complete runtime markers rather than terminating the web process. The ordinary Astro watcher continues to ignore transient `dist` mutations so route manifests are never rebuilt against a half-written package. This lets completed package builds reach the running browser without a process restart while `trsd dev status` continues to report source-closure drift when a process itself is stale.

## Non-Negotiable Rules

1. Desired state is compiled first. `treeseed.site.yaml`, `treeseed.package.yaml`, package environment registries, app `src/env.yaml`, provider overlays, project architecture bindings, config state, and CLI filters become typed desired resource nodes before provider mutation begins.
2. Live observation is authoritative. Persisted state can locate resources and remember lineage, but it can never prove readiness.
3. `ok: true` is allowed only after selected live postconditions pass.
4. Every provider mutation is followed by refresh and verify. An accepted API mutation is not success until live state converges.
5. Undeclared Treeseed-owned resources are drift. They must be planned as `delete`, `retain`, `adopt`, `rename`, `taint`, or `blocked`.
6. Provider limitations are blocking drift unless the selected operation explicitly allows them. They are never hidden in warnings.
7. Commands that mutate provider, runtime, config, secret, workflow, or hosting state must call the canonical reconciliation engine.
8. New providers and service types must implement the adapter contract and shared contract tests before any command can use them.

## Run Model

Every reconcile run follows the same lifecycle:

```text
refresh -> plan -> validate -> apply -> refresh -> verify -> persist
```

- `refresh` reads live provider state and persisted Treeseed state.
- `plan` compares desired, observed, and state graphs.
- `validate` checks prerequisites, credentials, provider capabilities, ownership, and destructive boundaries.
- `apply` performs bounded actions for selected resources.
- The second `refresh` re-reads live provider state after mutation.
- `verify` evaluates required postconditions against fresh live state.
- `persist` records lineage, desired hashes, last observed state, last applied state, last verified state, taints, retained resources, and blocked drift.

Plans stop before mutation but still compile desired state, refresh live state where requested, and report the exact planned actions.

## Resource Graph

A desired graph is a set of typed resource nodes. Each node has:

- stable resource id
- owner app or package
- provider id
- resource type
- environment
- desired spec
- secret/config targets
- dependencies
- adoption identity
- replacement policy
- postconditions

Examples:

- `web:cloudflare-pages`
- `web:api-proxy`
- `api:railway-project`
- `api:railway-service:treeseed-api-staging`
- `api:railway-service:treeseed-api-production`
- `api:railway-service:treeseed-api-operations-runner-staging-01`
- `api:railway-service:treeseed-api-operations-runner-production-01`
- `api:railway-volume:treeseed-api-operations-runner-staging-01-volume`
- `api:railway-volume:treeseed-api-operations-runner-production-01-volume`
- `api:railway-postgres:treeseed-api-postgres`
- `api:treedx-node:public-treedx-node-staging-01`
- `api:treedx-node:public-treedx-node-production-01`
- `treedx:railway-source-build:public-treedx-node-staging-01`
- `agent:capacity-provider:local-docker`

The graph compiler is SDK-owned. Hosting graph APIs, config sync, dev orchestration, package image commands, capacity lifecycle commands, and release can expose specialized CLI surfaces, but they must consume the same compiled graph model. Legacy hosting graph apply is only a deprecated facade over `reconcileTreeseedTarget`; it must not call provider deploy helpers directly.

Task-branch Git workflow commands remain SDK-owned and GitRunner-backed. `trsd stage` is branch/ref promotion, not hosted reconciliation: it merges staging down into the current task branch across the root repo and checked-out package repos, runs local proof by default, promotes exact verified refs to staging, and does not wait for hosted CI/CD or provider checks unless explicitly requested. `trsd update --from staging` remains the standalone inverse/update command when operators want to integrate staging before staging promotion. These commands do not mutate providers or hosted resources; all Git reads and mutations go through GitRunner.

Managed task worktrees use branch-aligned paths under `.treeseed/worktrees/<branch-slug>` and a branch may have only one active managed worktree. Stale or unregistered paths below `.treeseed/worktrees` must fail closed instead of resolving upward into the parent root repository. Save, update, stage, and close commands should therefore operate on the intended checkout or stop with a clear recovery message.

## Repository Custody And Handoff

Local repository storage has three non-overlapping custody domains. Human development uses the explicitly discovered project and package checkouts. The capacity provider owns mirrors and fresh assignment checkouts below `.treeseed/local-capacity-provider/data`. TreeDX owns repository and content-workspace state below `.treeseed/local-treedx/data`. Managed roots are host-browsable for diagnosis, carry a `treeseed.repository-storage/v1` marker, and are excluded from developer save discovery and source watchers. The operations runner has a separate operational scratch directory for diagnostics and checkpoints, but it is not repository storage and may not contain clones, mirrors, worktrees, or Git common directories.

Services exchange repository identity, an exact source revision, and a digest—not a reusable filesystem path. A receiver fetches the requested object into its own object database, verifies the object ID, and creates a purpose-specific checkout. Cross-custody shared roots, shared Git common directories, writable source mounts, symlink escapes, and developer-checkout fallbacks are unsafe drift and fail reconciliation.

Preparation and verification may run concurrently, but the final mutation of a repository ref is compare-and-swap work. The operation records the expected old revision and desired revision, serializes the ref mutation, observes the remote afterward, and treats an already-observed desired revision as successful replay. Unexpected advancement returns the operation to integration or review; it never causes a force push or silent merge.

`trsd save` coordinates developer checkouts only. An agent returns an exact candidate revision from its provider-owned assignment checkout, and TreeDX commits and pushes a content workspace from TreeDX custody. The operations runner may coordinate control-plane jobs against exact repository and publication receipts, but it never integrates revisions in a checkout. `trsd stage` promotes verified commits and does not reconstruct content during promotion.

Merge and rebase conflicts are expected workflow states, not partial failures to push through. `update` and `stage` must capture the conflicted files and package roots and report the smallest next command. `stage` must stop before staging is mutated when conflicts or local verification failures occur, preserving the feature branch/worktree for repair. Cleanup of source branches and managed worktrees is allowed only after promoted staging refs are verified.

## Adapter Contract

Every provider adapter implements the same lifecycle:

- `refresh`: observe live provider resources and map them into observed nodes.
- `diff`: compare desired, observed, and persisted state.
- `plan`: produce ordered actions and postconditions.
- `apply`: execute only the planned bounded actions.
- `verify`: evaluate live postconditions after refresh.
- `destroy`: remove selected owned resources within explicit boundaries.
- `import/adopt`: attach existing provider resources to Treeseed lineage without replacing healthy infrastructure.

Adapters may expose low-level provider helpers, but commands cannot use those helpers as orchestration. Helpers remain private primitives under the adapter.

## Action Model

Canonical action kinds:

- `noop`: desired and live state already match.
- `create`: create a missing required resource.
- `update`: change mutable configuration.
- `replace`: destroy and recreate a resource that cannot be updated safely.
- `delete`: remove an undeclared or selected resource.
- `adopt`: claim an existing matching resource into Treeseed state.
- `rename`: rename a healthy noncanonical resource.
- `reattach`: attach retained state, such as a volume, to its canonical service.
- `retain`: intentionally preserve state outside active scale, such as scaled-down volumes.

Railway volumes that are already queued for deletion are not reattachment candidates. Railway exposes restoration only through its provider-issued recovery link during the deletion recovery window. The reconciler must detect this state before planning provider changes, list the exact affected IDs, and stop without staging IaC changes, detaching volumes, creating replacements, or altering services. Reconciliation may resume only after a fresh live observation proves those same volume IDs are active. For an explicitly disposable environment, an operator may instead run `trsd hosting apply --replace-pending-volumes --yes`; the one-process override allows empty replacement, is never persisted, and is never inferred by stage or release.
- `taint`: mark a resource for replacement on the next apply.
- `blocked`: report required drift that cannot be resolved safely by this run.

Older compatibility labels may be translated at facade boundaries, but provider adapters and command JSON must use this canonical set.

## State Lifecycle

The state store persists:

- provider resource ids
- desired spec hashes
- lineage and ownership
- taint and replacement markers
- last observed state
- last applied state
- last verified state
- retained resources
- blocked drift
- provider limitations

State is a memory aid, not a source of truth. It helps find resources and avoid unnecessary replacement, but a resource is ready only when live postconditions pass.

## Exactness And Drift

Reconciliation is exact. A selected run fails when any selected resource is:

- missing
- duplicated
- offline
- still deploying
- stale
- attached to the wrong domain
- missing required secrets or variables
- using the wrong image
- missing required volumes
- using noncanonical names
- detached from retained state
- blocked by provider limitations

Apply must exit nonzero when required drift remains after mutation and verification. Warnings are only for nonblocking observations.

## Deployment Source Policy

Development and staging deployments must not routinely publish Docker registry images or create development Git tags. Source selection is part of desired state:

- `local` and feature branches use local workspace links while editing, and saved package manifests use exact GitHub commit references (`github:owner/repo#<commit-sha>`) for all internal Treeseed package dependencies.
- `staging` package manifests and lockfiles use exact GitHub commit references for internal Treeseed dependencies. Railway API, operations runner, capacity-provider, and TreeDX services build from GitHub source (`sourceMode: git`) on the selected branch and recorded commit. Reconciliation configures repository, branch, root directory, build command, start command, health checks, variables, and volumes. If an existing service cannot be switched or repaired in place, the run reports blocked drift; it must not delete and recreate the service.
- `prod` uses immutable released artifacts: package manifests and lockfiles use plain npm semantic versions for internal installable packages, and Docker services use semantic image tags. Production planning must not use Git dependency refs, prerelease package refs, source-mode Railway services, or `dev-*` Docker image tags.
- TreeDX production still uses semantic Docker image tags, but staging builds the TreeDX Dockerfile from GitHub source at the selected commit.

Package save and stage flows use `github:owner/repo#<commit-sha>` for development package dependencies. Semantic Git tags are reserved for production releases and are not used as production package.json dependency refs. Release rewrites installable internal dependencies to npm semantic versions before production rehearsal.

## Ownership Boundaries

- Root web app owns Cloudflare web resources, web build/deploy, proxy metadata, and the configured API connection.
- An application-scoped hosting command resolves the selected application's repository root before reconciliation. `--app admin` therefore reads and persists Admin state against `packages/admin`, and cannot select or mutate the root Market content store merely because Market is the integration workspace.
- `packages/api` owns the API service, operations runner, PostgreSQL, Railway project, API domains, and public TreeDX federation hosting.
- `packages/treedx` owns TreeDX implementation, Docker image workflows, generated SDK publication, and profile image gates.
- `packages/agent` owns capacity-provider runtime resources.
- SDK owns reconciliation contracts, graph compilation, adapter contracts, state, reporting, and test harnesses.
- CLI owns command surfaces and user interaction, but not provider orchestration.

## Provider Coverage

Railway adapters cover projects, environments, services, GitHub source services, image sources, deployments, managed PostgreSQL, domains, variables, volumes, schedules, logs, and health.

Cloudflare adapters cover Pages, Workers, D1, R2, KV, Queues, Turnstile, DNS, cache rules, secrets, routes, preview domains, and production domains.

Cloudflare token setup should use the dashboard permission names when configuring Treeseed credentials. Account-level live acceptance needs Pages Write, Workers Scripts Write, Workers KV Storage Write, Workers R2 Storage Write, D1 Write, Queues Write, Turnstile Sites Write, Account Rulesets Write, and Account Rule Lists Write. The target zone needs Zone Read, DNS Write, Cache Settings Write, and SSL and Certificates Write. Cloudflare API docs may call Cache Settings the Cache Rules permission, and Account Rule Lists the Account Filter Lists permission.

GitHub adapters cover repository metadata, bootstrap/branches, branch rules, environments, secrets, variables, workflow dispatch and observation, package release workflows, and image workflows. First-party repositories resolve the single central token; repository-scoped overrides are limited to imported third-party projects.

Local adapters cover local web, local API, local DB, local runner, Mailpit, Docker Compose, SDK-managed process supervisors, ports, and generated config.

Capacity adapters cover provider registration, local Docker provider runtime, managed provider deployment, provider secrets, health, and lifecycle.

Capacity adapters do not reconcile runtime coordination records such as provider availability sessions, assignment leases, mode runs, usage actuals, or ledger entries. Those are API/control-plane records owned by `@treeseed/api` and consumed by `@treeseed/agent`, Admin, CLI, and SDK clients. Reconciliation proves that the provider runtime exists, has the right image/config/secrets, and is healthy; assignment coordination proves that a live provider can check in, receive leased work, report mode runs, and settle usage.

Local capacity-provider desired state includes the canonical digest of the fully validated manifest, not only its path. Identity, execution-provider, native-limit, connection, and offer changes therefore plan a Compose update and supervised restart; an unchanged digest converges to `noop`. The logical provider resource also records the expected connection count. A fresh zero-connection manager is a healthy idle provider, while every declared connection still requires a current team-scoped availability session. Connection offboarding always removes local manifest, credential, token, and coordinator state even when remote membership revocation is already complete or unreachable, and reports remote confirmation separately for operator follow-up.

Local database bootstrap is also explicit desired state. The `local-seed-bootstrap` resource depends on the healthy local API, plans the configured seed against current durable state through the API-owned seed service, applies only its reported create/update actions, and verifies by replanning until zero mutations remain. The seed manifest digest participates in desired-state identity. Clean database creation, reset, and ordinary local startup therefore converge the same canonical team/project/catalog baseline without verifier-owned setup or a separate operator seed command.

TreeDX adapters cover source-build selection, production image reference selection, public federation services, private team instances, volumes, domains, health, SDK publishing gates, and profile image gates.

## JSON Report Contract

Every reconciliation-capable command that touches infrastructure or provider state includes the canonical report fields:

- `desiredGraph`
- `observedGraph`
- `stateGraph`
- `diff`
- `actions`
- `postconditions`
- `selectedResources`
- `skippedResources`
- `blockedDrift`
- `providerLimitations`
- `retainedResources`
- `destroyedResources`
- `liveVerification`
- `ok`

`ok` is false if any selected postcondition fails, any selected required live observation is unavailable, any blocking drift remains, or any provider limitation prevents exact state.

## Examples

Web-only apply selects only root web resources. It must not touch Railway API services, runner services, PostgreSQL, TreeDX nodes, or API-owned secrets. It may verify the configured API connection/proxy health as a web postcondition.

API-only apply selects `packages/api` resources from `packages/api/treeseed.site.yaml` and package metadata. It must reconcile the `treeseed-api` Railway project, API service, indexed operations runner, PostgreSQL, public TreeDX federation nodes, capacity-provider service bindings when selected, variables, volumes, domains, deployments, and HTTP health without building or deploying the root web UI.

Mixed app release selects affected apps by dependency graph. API changes deploy API-owned resources first when web depends on new API behavior. UI-only changes skip API verify/deploy/smoke and may run only a lightweight configured API health check.

TreeDX staging updates reconcile the package repository source build and API-hosted public node consumption without publishing registry artifacts. TreeDX production releases reconcile package repository credentials, Docker Hub config, semantic image publication, immutable image ref selection, and API-hosted public node consumption. SDK/profile publication gates run after successful production TreeDX image publication.

Capacity provider lifecycle reconciles provider registration, secrets, local or hosted runtime, health, and cleanup through the same run model. Provider check-ins, next-assignment polling, lease renewal, completion/failure, mode-run telemetry, and usage settlement are runtime API behavior and must not be modeled as infrastructure drift. Capacity runtime acceptance may create tagged diagnostic assignments and mode runs as audit evidence, but those records remain API control-plane records rather than reconciled resources.

Local dev reconciles process supervisors, ports, local DB, local API, local runner, Mailpit, and generated config. SDK-managed API and operations-runner instance records persist a deterministic SHA-256 closure of their API source, migrations, runtime package configuration, and consumed SDK distribution. Refresh compares the live instance's start digest with the current closure: a healthy PID with a stale closure is `update` drift, is restarted through reconciliation, and must pass fresh health plus digest postconditions before the run reports success. Unchanged closures converge to `noop`. The local report also states whether web is using a local API or configured remote API.

## Live Test Framework

`trsd reconcile test-live --provider railway|cloudflare|github|local|all --environment staging --json` is the fast read-only smoke test. It verifies credentials, provider API reachability, canonical report shape, and observable provider surfaces.

`trsd reconcile test-live --mode acceptance --provider railway|cloudflare|github|local|all --environment staging --yes --json` is the full periodic acceptance suite. It exercises isolated deterministic test prefixes, creates, updates, replaces or reattaches where supported, verifies, destroys supported resource types, and fails if cleanup leaves undeclared Treeseed-owned resources.

`trsd reconcile test-live --mode cleanup --provider railway|cloudflare|github|local|all --environment staging --yes --json` removes leftover isolated live-test resources by stable provider prefix and fails when cleanup drift remains. Run cleanup before and after every full acceptance run. A platform change that affects hosting, release, capacity, provider credentials, or adapter behavior is not complete until provider acceptance and final cleanup both pass, or the blocked provider capability is explicitly accepted as unavailable.

Live scenarios include:

- Railway project, environment, service, image service, PostgreSQL, volume attach/reattach/delete, generated domain, custom domain, variables, deployment health. Railway creates at most one test project per provider run and tests every project-scoped resource inside that single project because Railway project creation is capped.
- Cloudflare Pages, Worker, D1, R2, KV, Queue, DNS, Turnstile, secrets, and cache rules.
- GitHub repository/bootstrap/branch/rule/environment lifecycle, secret and variable bindings, workflow dispatch/observation, and central-token routing for `treeseed-ai/*`.
- Local process, port, local DB, local runner, Docker Compose capacity provider, and `capacity-provider-assignment-proof`.
- Railway `capacity-provider-runtime-assignment-proof`, which uses an approved provider membership and short-lived access token, leases a tagged assignment through the canonical provider protocol, emits mode-run and artifact-manifest telemetry, settles usage, completes the assignment, and verifies durable project evidence.
- TreeDX Railway source build consumed by the API-hosted public node and verified over HTTP.

The live command reports capability coverage by provider and resource type. Mutation-capable scenarios compile isolated desired resources and exercise the adapter lifecycle: refresh, diff, plan, validate, apply, refresh, verify, persist, destroy, refresh, verify-cleanup. Provider-private probes are allowed only for credential/API reachability checks that cannot be modeled as desired resources. Missing adapter coverage, failed cleanup drift, or an unavailable required credential is a failing `blocked` result, not a silent skip.

Capacity runtime proof requires a capacity-provider manifest with an Ed25519 identity and an approved team membership. The proof obtains a short-lived membership access token through the same credential-exchange path used by normal providers; no permanent provider API key is accepted. Missing registration, approval, grant, allocation, or identity prerequisites block the proof before assignment admission. Cleanup removes provider infrastructure only; completed diagnostic assignments, mode runs, artifact manifests, usage actuals, and settlements are retained with the live-test run id for operator audit.

## Review Rounds

Round 1 verifies architecture: no command bypasses the canonical engine, adapters share lifecycle and report shape, and docs match implementation.

Round 2 verifies drift and failure behavior: offline services, missing domains, detached volumes, wrong image refs, missing secrets, duplicate provider resources, stale resources, and failed deployments must fail plan/apply/verify correctly.

Round 3 verifies live providers: Railway, Cloudflare, GitHub, local/dev, TreeDX, and capacity scenarios run and cleanup leaves no undeclared resources.

Round 4 verifies package integration: SDK, CLI, Core, Agent, API, TreeDX, and root UI can join by manifests and registries rather than bespoke orchestration.
