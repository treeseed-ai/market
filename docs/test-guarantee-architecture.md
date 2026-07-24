# Test And Guarantee Architecture

## Purpose

Treeseed tests and guarantees are owned by the smallest independently buildable repository that can prove the behavior without importing sibling implementation. Market owns only tenant behavior and deliberate cross-repository integration proof.

The July 2026 baseline audit found 113 valid guarantees, 38 handwritten tests above 500 lines, and approximately 154 handwritten source or test files above 500 lines. It also found parallel root `test/` and `tests/` trees, CLI tests under `scripts/`, and stale root API acceptance data duplicated by `@treeseed/api`.

## Test Layout

TypeScript repositories use one `tests/` root:

- `unit/<domain>` for isolated functions, types, components, and repositories
- `integration/<domain>` for multiple modules or local service boundaries
- `contract/<domain>` for exports, package shape, architecture, schemas, and provider contracts
- `acceptance/<domain>` for product/API acceptance matrices and harnesses
- `e2e/<domain>` for real user or runtime workflows
- `performance/<domain>` for bounded load and performance assertions
- `fixtures` for inert inputs and code fixtures
- `support` for reusable harnesses, setup, and assertions

TreeDX preserves language-native roots required by Cargo, Mix, pytest, and its SDK toolchains. Those roots still organize tests by behavior and keep handwritten files below the hard limit.

## Ownership Rules

- Agent owns provider runtime, provider manager/runner, AgentKernel, execution-provider, handler, trace, and provider-local lifecycle tests and guarantees.
- API owns durable capacity, assignment, lease, reservation, usage, settlement, workday, and TreeDX authorization tests and guarantees.
- SDK owns portable contracts, reconciliation, configuration, provider-neutral helpers, and guarantee infrastructure tests.
- CLI, Admin, UI, Core, and Reviewer own tests and guarantees for their public/operator surfaces.
- Market owns its tenant behavior, integrated package-boundary checks, starter workflows, and cross-repository local acceptance.
- A test that imports implementation from two or more independent repositories is an integrated Market test unless the dependency graph is changed to expose a legitimate public contract.
- Guarantees remain under `guarantees/<type>/<subtype>/`. Verifier registries may be split by domain, but guarantee ids, journey indexes, verifier ids, and evidence contracts remain stable during organization-only changes.

The six Market capacity guarantees remain Market-owned because they compose SDK contracts, API control-plane state, Agent provider-local execution, CLI/operator behavior, starter repositories, and the reconciled local stack. Package-local verifier cases referenced by those aggregates stay in their owning packages.

## File Size Policy

Handwritten executable source, scripts, tests, and code fixtures have a hard maximum of 500 physical lines and a target of 250-350. Splits follow cohesive responsibilities and preserve canonical public exports.

The checker excludes generated output, vendor/dependency trees, build artifacts, migrations, snapshots, lockfiles, declarative data, and documentation. There is no waiver list. A generated file must be located or named as generated so the exclusion is reviewable.

Generic numbered partitions and ordinal test collisions are not an acceptable way to meet the limit. Each repository rejects `part-N`, `module-N`, `chunk-N`, `section-N`, and `segment-N` files, ordinal test/scenario suffixes, API route-range names, the retired mechanical split scripts, parallel `test/` and `tests/` roots, and tests under `scripts/`. Semantic numbers such as HTTP status codes remain valid.

## Verification Contract

Each repository runs its file-length audit, package build/type checks, tests, and focused guarantees without relying on sibling source checkouts. Market runs its own suites plus integrated portfolio verification. Test moves must preserve the collected test-case inventory unless removal of an obsolete duplicate is recorded in the implementation change.

Staging saves invoke only push-triggered, non-mutating verification workflows. Publish, release, documentation deployment, and hosted deployment workflows are not part of save verification.

## Modernization Status

The dependency-ordered migration is complete and package verification is green for SDK, UI, Core, Admin, Agent, API, CLI, and Reviewer. The final SDK fast-release inventory is 1,250 tests; UI has 54 unit/contract and 12 Chromium E2E tests; Core has 103 tests plus packed-install smoke; Admin has 6 tests; Agent has 178 tests plus AgentKernel, provider-container, and packed-install smoke; API has 427 tests plus its isolated local HTTP acceptance catalog; CLI has 197 tests plus packed-install binary smoke; and Reviewer has 25 tests. Each package-local verifier enforces the 500-line hard limit.

The corrective functional-remediation audit removed the line-budget/declaration-order splitters and replaced every identified mechanical partition. SDK exports are organized into nine domain barrels; UI composes nine deterministic catalog contribution sets; CLI composes named operation and overlay domains; API support is divided into acceptance, descriptor, projection, seed, and runner responsibilities, while 38 route-range installers use bounded-context names. The four ordinal hosted-deployment scenarios now form one lifecycle suite, API collectors are grouped into six bounded contexts, and 175 one-case SDK/Core/Agent files use their complete scenario responsibility rather than a generated ordinal suffix. Two SDK tests stranded under `scripts/` now execute from `tests/integration` against their canonical source owners.

Package-local architecture checks now run through the existing verification scripts. No TreeDX workflow was added: TreeDX continues to use only `release-gate.yml`.

SDK Git-heavy workflow lifecycle tests use a dedicated serial Vitest configuration. The normal unit suite includes that group as a second phase, while the fast release suite excludes it unless `TREESEED_SDK_VERIFY_WORKFLOW_LIFECYCLE=1` explicitly enables the lifecycle gate. Provider-status scenarios clear inherited provider-token aliases so package verification measures fixture state rather than the operator machine's credentials.

The TreeDX phase is complete locally. Its SDK specification validator, store types, profiler CLI, profiler portfolio state, request generation, scenario execution, repository query, workspace file modules, and Rust NIF registry have been divided by responsibility without changing public entrypoints. The file-size gate checks 715 handwritten code files with zero hard-limit errors, the TreeDX API has 133 passing tests, and the profiler has 71 passing tests.

TreeDX owns `scripts/check-file-lengths.sh`, and the fast package verifier invokes it. The existing `release-gate.yml` remains the sole TreeDX verification workflow: it invokes `scripts/release-gate.sh`, which invokes `scripts/test-all.sh`, which invokes `scripts/test-treedx-fast.sh`. No additional verify workflow is used. Both pull-request and push path filters include the file-length checker. The complete local release gate passes, including package tests, SDK packages, security checks, a release-mode Docker build, and the MVP smoke workflow. The federation live check exits successfully as not configured when its external node variables are absent.

The first exact-commit TreeDX staging run correctly used `release-gate.yml` and detected newly published Mint advisories in the profiler's 1.9.1 lock. The profiler now locks Mint 1.9.3. The unchanged release-gate chain passes locally with both Hex scans advisory-free and both Trivy image scans reporting zero high/critical vulnerabilities.

Market now has one `tests/` root, no root `test/` directory, and no duplicated root API acceptance dataset. Its check, 94-test unit/contract suite, production build, and direct verification pass. All 113 guarantee identities validate with zero errors and warnings. Verifier registries reference the package-local post-migration API and CLI test paths, and those focused verifier targets pass from their independent package roots.

The coordinated corrective `trsd save --verify local` completed across Market, every package, both starter templates, and the shared fixture. The first exact saved-commit inspection found three remote-only defects: Market CI discovery still expected the intentionally suspended `deploy.yml`; the root agent ladder retained the removed `test:manager-worker` command; and two boundary assertions assumed Git would preserve an empty `src/pages` directory. The canonical workflow policy now selects root `verify.yml`, selects package gates through each package manifest, and therefore selects TreeDX's existing `release-gate.yml` without creating a duplicate workflow. The root ladder uses `test:provider-runtime`, optional empty directories are handled as empty collections, and staging/save gates no longer add deployment workflows while hosted deployment is suspended.

The corrective exact-commit staging inspection is green. Strict package inspection reports 9/9 successful workflows with zero pending, missing, or failed checks, and strict Market inspection reports 1/1 successful workflow. TreeDX commit `87c124f2d88d` passed existing `release-gate.yml` run `30050552337`, including both architecture release gates, every language SDK suite, security checks, architecture/performance profiles, and both federation modes. Market commit `2147aeaf244d` passed `verify.yml` run `30050565639`. The workspace and every independent repository are clean, pushed, staging-aligned, and free of package blockers.
