# Treeseed Reconciliation Platform

Treeseed infrastructure is reconciled from exact desired state. A command may inspect, plan, apply, verify, or destroy infrastructure, but it must do that through the SDK-owned reconciliation platform. Provider CLIs such as Railway, Wrangler, Docker, and GitHub CLI are diagnostic only unless they are invoked as private adapter primitives by the reconciler or live acceptance harness. They are not orchestration systems.

This document is the canonical contract for hosting, configuration, local development, capacity providers, package workflows, TreeDX image publication, staging, and release.

See [Package Ownership](./package-ownership.md) for the current package map.

## Package Ownership In Reconciliation

- `@treeseed/sdk` owns the reconciliation engine, desired-state graph, provider adapters, package workflow discovery, config runtime, and live verification contracts.
- `@treeseed/cli` exposes the command surface that invokes SDK reconciliation.
- `@treeseed/core` contributes web runtime and web-only desired state.
- `@treeseed/admin` contributes site/plugin/runtime/admin surfaces, routes, middleware, and env schema; it does not own hosted infrastructure and has no package-local `treeseed.site.yaml`.
- root `@treeseed/market` owns the real hostable `treeseed.site.yaml`, public content, page overrides, and future ecommerce/business policy.
- `@treeseed/api` owns API, operations runner, PostgreSQL, backend route descriptors, public TreeDX federation app desired state, and durable capacity coordination records such as provider sessions, assignments, mode runs, reservations, and usage settlement.
- `@treeseed/agent` owns capacity-provider runtime artifacts, provider desired state, provider manager/runner behavior, AgentKernel execution, and provider-local lifecycle.
- `packages/treedx` owns the TreeDX image/service artifact; API hosting consumes selected TreeDX images.
- `@treeseed/ui` owns no infrastructure; it contributes components and styles only.

## Non-Negotiable Rules

1. Desired state is compiled first. `treeseed.site.yaml`, `treeseed.package.yaml`, package environment registries, app `src/env.yaml`, provider overlays, config state, and CLI filters become typed desired resource nodes before provider mutation begins.
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

Dry runs stop before mutation but still compile desired state, refresh live state where requested, and report the exact planned actions.

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
- `api:railway-service:treeseed-api`
- `api:railway-service:treeseed-api-operations-runner-01`
- `api:railway-volume:treeseed-api-operations-runner-01-volume`
- `api:railway-postgres:treeseed-api-postgres`
- `api:treedx-node:public-treedx-node-01`
- `treedx:github-workflow:dev-staging-image`
- `agent:capacity-provider:local-docker`

The graph compiler is SDK-owned. Hosting graph APIs, config sync, dev orchestration, package image commands, capacity lifecycle commands, stage, and release can expose specialized CLI surfaces, but they must consume the same compiled graph model. Legacy hosting graph apply is only a deprecated facade over `reconcileTreeseedTarget`; it must not call provider deploy helpers directly.

Task-branch Git workflow commands remain SDK-owned and GitRunner-backed. `trsd update --from staging` is the canonical inverse of `stage`: it merges staging down into the current task branch across the root repo and checked-out package repos, including manifest-only packages such as TreeDX. It does not mutate providers or hosted resources; all Git reads and mutations go through GitRunner.

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

## Ownership Boundaries

- Root web app owns Cloudflare web resources, web build/deploy, proxy metadata, and the configured API connection.
- `packages/api` owns the API service, operations runner, PostgreSQL, Railway project, API domains, and public TreeDX federation hosting.
- `packages/treedx` owns TreeDX implementation, Docker image workflows, generated SDK publication, and profile image gates.
- `packages/agent` owns capacity-provider runtime resources.
- SDK owns reconciliation contracts, graph compilation, adapter contracts, state, reporting, and test harnesses.
- CLI owns command surfaces and user interaction, but not provider orchestration.

## Provider Coverage

Railway adapters cover projects, environments, services, image sources, deployments, managed PostgreSQL, domains, variables, volumes, schedules, logs, and health.

Cloudflare adapters cover Pages, Workers, D1, R2, KV, Queues, Turnstile, DNS, cache rules, secrets, routes, preview domains, and production domains.

Cloudflare token setup should use the dashboard permission names when configuring Treeseed credentials. Account-level live acceptance needs Pages Write, Workers Scripts Write, Workers KV Storage Write, Workers R2 Storage Write, D1 Write, Queues Write, Turnstile Sites Write, Account Rulesets Write, and Account Rule Lists Write. The target zone needs Zone Read, DNS Write, Cache Settings Write, and SSL and Certificates Write. Cloudflare API docs may call Cache Settings the Cache Rules permission, and Account Rule Lists the Account Filter Lists permission.

GitHub adapters cover repository-scoped credentials, environments, secrets, variables, workflow dispatch, workflow observation, package release workflows, and image workflows.

Local adapters cover local web, local API, local DB, local runner, Mailpit, Docker Compose, SDK-managed process supervisors, ports, and generated config.

Capacity adapters cover provider registration, local Docker provider runtime, managed provider deployment, provider secrets, health, and lifecycle.

Capacity adapters do not reconcile runtime coordination records such as provider availability sessions, assignment leases, mode runs, usage actuals, or ledger entries. Those are API/control-plane records owned by `@treeseed/api` and consumed by `@treeseed/agent`, Admin, CLI, and SDK clients. Reconciliation proves that the provider runtime exists, has the right image/config/secrets, and is healthy; assignment coordination proves that a live provider can check in, receive leased work, report mode runs, and settle usage.

TreeDX adapters cover dev-image workflow dispatch, image reference selection, public federation services, private team instances, volumes, domains, health, SDK publishing gates, and profile image gates.

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

API-only apply selects `packages/api` resources. It must reconcile the `treeseed-api` Railway project, API service, indexed operations runner, PostgreSQL, public TreeDX federation nodes, variables, volumes, domains, deployments, and HTTP health without building or deploying the root web UI.

Mixed app release selects affected apps by dependency graph. API changes deploy API-owned resources first when web depends on new API behavior. UI-only changes skip API verify/deploy/smoke and may run only a lightweight configured API health check.

TreeDX image update reconciles package repository credentials, Docker Hub config, dev-staging image workflow, immutable image ref selection, and API-hosted public node consumption. SDK/profile publication gates run after successful TreeDX image publication.

Capacity provider lifecycle reconciles provider registration, secrets, local or hosted runtime, health, and cleanup through the same run model. Provider check-ins, next-assignment polling, lease renewal, completion/failure, mode-run telemetry, and usage settlement are runtime API behavior and must not be modeled as infrastructure drift.

Local dev reconciles process supervisors, ports, local DB, local API, local runner, Mailpit, and generated config. It reports whether web is using a local API or configured remote API.

## Live Test Framework

`trsd reconcile test-live --provider railway|cloudflare|github|local|all --environment staging --json` is the fast read-only smoke test. It verifies credentials, provider API reachability, canonical report shape, and observable provider surfaces.

`trsd reconcile test-live --mode acceptance --provider railway|cloudflare|github|local|all --environment staging --yes --json` is the full periodic acceptance suite. It exercises isolated deterministic test prefixes, creates, updates, replaces or reattaches where supported, verifies, destroys supported resource types, and fails if cleanup leaves undeclared Treeseed-owned resources.

`trsd reconcile test-live --mode cleanup --provider railway|cloudflare|github|local|all --environment staging --yes --json` removes leftover isolated live-test resources by stable provider prefix and fails when cleanup drift remains. Run cleanup before and after every full acceptance run. A platform change that affects hosting, release, capacity, provider credentials, or adapter behavior is not complete until provider acceptance and final cleanup both pass, or the blocked provider capability is explicitly accepted as unavailable.

Live scenarios include:

- Railway project, environment, service, image service, PostgreSQL, volume attach/reattach/delete, generated domain, custom domain, variables, deployment health. Railway creates at most one test project per provider run and tests every project-scoped resource inside that single project because Railway project creation is capped.
- Cloudflare Pages, Worker, D1, R2, KV, Queue, DNS, Turnstile, secrets, and cache rules.
- GitHub environment, secret, variable, workflow dispatch, workflow observation, and repository-scoped token routing.
- Local process, port, local DB, local runner, and Docker Compose capacity provider.
- TreeDX `dev-staging` image consumed by API-hosted public node and verified over HTTP.

The live command reports capability coverage by provider and resource type. Mutation-capable scenarios compile isolated desired resources and exercise the adapter lifecycle: refresh, diff, plan, validate, apply, refresh, verify, persist, destroy, refresh, verify-cleanup. Provider-private probes are allowed only for credential/API reachability checks that cannot be modeled as desired resources. Missing adapter coverage, failed cleanup drift, or an unavailable required credential is a failing `blocked` result, not a silent skip.

## Review Rounds

Round 1 verifies architecture: no command bypasses the canonical engine, adapters share lifecycle and report shape, and docs match implementation.

Round 2 verifies drift and failure behavior: offline services, missing domains, detached volumes, wrong image refs, missing secrets, duplicate provider resources, stale resources, and failed deployments must fail plan/apply/verify correctly.

Round 3 verifies live providers: Railway, Cloudflare, GitHub, local/dev, TreeDX, and capacity scenarios run and cleanup leaves no undeclared resources.

Round 4 verifies package integration: SDK, CLI, Core, Agent, API, TreeDX, and root UI can join by manifests and registries rather than bespoke orchestration.
