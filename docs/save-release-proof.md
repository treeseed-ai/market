# Treeseed Save, Stage, And Release Proof

Treeseed uses three deliberately separate workflow boundaries:

- `trsd save` creates a fast, coherent checkpoint across the independent repositories.
- `trsd stage` promotes one immutable candidate and waits for exact-SHA verification and deployment workflows.
- `trsd release` tags and promotes the staged repositories, then waits for tag-driven deployment workflows.

Guarantees are authoritative live acceptance evidence, but they do not run during routine save or deployment workflows. The manual API and Market release gates run focused live guarantee collections against staging or production.

## Save Contract

Save discovers the dirty repository closure, commits repositories in dependency order, updates exact internal refs and submodule pointers, validates lock metadata without a network install, and pushes only after the complete local graph is coherent. It does not deploy, wait for hosted workflows, delete caches, prune Docker, or delete guarantee evidence.

Use `--verify local` when a checkpoint also needs package-local verification. An interrupted save records its journal as interrupted and reports the exact `trsd resume <run-id>` command.

## Stage Contract

Stage requires a clean pushed task branch. It merges current staging down before promotion, resolves generated internal-reference and lock metadata conflicts, and stops with file-level diagnostics for source conflicts. Package refs are promoted with expected-head protection and the Market staging ref moves last.

Every promoted repository must pass `verify.yml` for its exact staging SHA. Market and each changed hostable package must also pass `deploy.yml` for that SHA. API deploys staging from Git source; Market deploys the web surface through TreeSeed reconciliation. `trsd stage` returns only after all required workflows succeed, then synchronizes every checkout to `staging`. `trsd stage --async` is the explicit exception that returns while hosted verification is pending.

## Release Contract

Live `trsd release` uses the resumable SDK release engine to promote and tag repositories in dependency order. Stable tag pushes trigger each package's publication workflow; hostable packages use `deploy.yml`. API publishes immutable versioned images before production reconciliation, and Market deploys the tagged web revision. Production completion requires those exact tag-driven workflows to succeed.

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

Promote and verify an immutable staging candidate:

```bash
npx trsd stage --json
```

Deliberately return before hosted proof finishes:

```bash
npx trsd stage --async --json
```

Release the latest successful staged candidate:

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

Candidate manifests live under `.treeseed/workflow/stage-candidates/`. Workflow journals live under `.treeseed/workflow/runs/`. Save, stage, release, and routine cleanup never delete these records or `.treeseed/guarantees/` evidence.
