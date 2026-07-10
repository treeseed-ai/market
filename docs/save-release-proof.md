# Treeseed Save, Stage, And Release Proof

Treeseed uses three deliberately separate workflow boundaries:

- `trsd save` creates a fast, coherent checkpoint across the independent repositories.
- `trsd stage` promotes one immutable candidate and waits for its hosted staging attestation.
- `trsd release` dispatches production promotion for the latest attested candidate.

Guarantees are authoritative promotion evidence. They do not run during a routine save, and the complete collection runs once for an exact deployed staging candidate.

## Save Contract

Save discovers the dirty repository closure, commits repositories in dependency order, updates exact internal refs and submodule pointers, validates lock metadata without a network install, and pushes only after the complete local graph is coherent. It does not deploy, wait for hosted workflows, delete caches, prune Docker, or delete guarantee evidence.

Use `--verify local` when a checkpoint also needs package-local verification. An interrupted save records its journal as interrupted and reports the exact `trsd resume <run-id>` command.

## Stage Contract

Stage requires a clean pushed task branch. It merges current staging down before promotion, resolves generated internal-reference and lock metadata conflicts, and stops with file-level diagnostics for source conflicts. Package refs are promoted with expected-head protection and the Market staging ref moves last.

The root `staging-candidate.yml` workflow owns staging proof. It builds and verifies the integrated graph, creates exact-source package tarballs without rerunning package lifecycle scripts, reconciles API and web staging, and runs all 208 guarantees once. Its attestation records the candidate hash, root and submodule SHAs, guarantee run id, and pass/fail counts. `trsd stage` downloads and validates that exact workflow-run artifact before returning. `trsd stage --async` is the explicit exception that returns while hosted proof is pending.

## Release Contract

Live `trsd release` dispatches `production-release.yml`; local execution is plan-only. The hosted workflow hydrates the exact staging attestation, rejects source or count drift, and invokes the resumable SDK release engine. Published package and image work remains ordered by the dependency graph. Production runs reconciliation verification and the smoke guarantee subset, reusing the immutable 208/208 staging proof instead of rerunning the complete collection.

Reviewer is a local-only package. It participates in save, verification, artifact, and publication ordering, but its manifest forbids hosted deployment.

## CI/CD Truth

GitHub-hosted workflow results for exact branch and head SHA are the authoritative CI/CD proof.

Local checks are still useful:

- `verify:local` proves package-local behavior on the developer machine.
- `verify:action` proves the workflow is not obviously broken under local GitHub `act` simulation.
- `github-hosted` proof proves release viability.

GitHub `act` proof is advisory. It cannot satisfy an authoritative hosted proof requirement.

## Why GitHub `act` Can Pass When GitHub Fails

GitHub `act` is a local simulation, not the GitHub Actions service. Important differences include:

- GitHub-hosted runners have different OS images, preinstalled tools, users, permissions, and filesystem layout.
- GitHub workflow events include exact payloads, refs, environment protections, permissions, and tokens that GitHub `act` approximates.
- Secrets and environment variables differ, especially protected `staging` and `production` environments.
- `actions/checkout`, submodules, fetch depth, and Git credential behavior can differ.
- Service containers and Docker networking differ.
- Cache restore and save behavior differs.
- Matrix jobs, concurrency, workflow dispatch inputs, and reusable workflow calls can behave differently.
- GitHub enforces permissions and environment rules that local Docker does not.
- Hosted CI sees the pushed repository state, not the local working tree or a copied rehearsal workspace.

## Commands

Routine checkpoint:

```bash
npx trsd save --json "message"
```

Local confidence check:

```bash
npx trsd save --verify local --json "message"
```

Plan release proof:

```bash
npx trsd proof plan --target staging --json
```

Promote and prove an immutable staging candidate:

```bash
npx trsd stage --json
```

Deliberately return before hosted proof finishes:

```bash
npx trsd stage --async --json
```

Release the latest successful candidate through GitHub Actions:

```bash
npx trsd release --patch --json
```

Inspect failures:

```bash
npx trsd proof failures --json
```

Explain slow proof runs:

```bash
npx trsd proof explain --last --json
```

## Proof Records

Proof records live under:

```text
.treeseed/workflow/proofs/
```

They are keyed by subject, driver, and input hash. A passed proof is reusable only when the subject, driver, and inputs still match.

Failed, pending, blocked, skipped, and advisory records do not satisfy authoritative release proof.

Candidate manifests and attestations live under `.treeseed/workflow/stage-candidates/`. Workflow journals live under `.treeseed/workflow/runs/`. Save, stage, release, and routine cleanup never delete these records or `.treeseed/guarantees/` evidence.
