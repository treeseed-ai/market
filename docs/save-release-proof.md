# Treeseed Save, Stage, And Release Proof

Treeseed uses three deliberately separate workflow boundaries:

- `trsd save` creates a fast, coherent checkpoint across the independent repositories.
- `trsd stage` promotes one locally verified immutable candidate without deploying hosted infrastructure.
- `trsd release` is intentionally unavailable while hosted deployment automation is suspended.

Guarantees are authoritative live acceptance evidence, but they do not run during routine save or deployment workflows. The manual API and Market release gates run focused live guarantee collections against staging or production.

## Save Contract

Save defaults to the independent repository containing the invocation directory. It commits and pushes that repository and writes a repository-scoped `treeseed.integration-change-set/v1` receipt without sweeping sibling or parent changes. `trsd save --federated` explicitly discovers the checked-out repository closure, commits repositories in dependency order, updates exact internal refs, validates lock metadata without a network install, and pushes only after the complete local graph is coherent. It then freshly reads every selected remote ref and writes a federated receipt containing exact repository identities, commits, dependency edges, contract digests, verification dispositions, and governed execution authorities whose integrated commits remain in the saved history. It does not deploy, wait for hosted workflows, delete caches, prune Docker, or delete guarantee evidence.

`trsd capacity checkpoint-integrate --execute` writes governance execution authority to workset-local `.treeseed` state after validating the API-selected decision graph, assignment, deliverable, review, verification, repository, base commit, checkpoint, and path evidence. That receipt does not push or stage anything. Save turns it into candidate provenance only after the repository save and fresh remote proof succeed. A commit receipt proves what exists; the decision chain proves why that work was allowed.

Recursive workspace save and gitlink refresh remain a compatibility adapter while local worksets are introduced. They are not the candidate identity: stage consumes the integration receipt, and a moved or mismatched remote ref invalidates that receipt before promotion.

Platform worksets are reconstructed from `treeseed.portfolio.json` with `trsd platform workset --plan|--apply`. The workset receipt under `.treeseed/worksets/platform/` proves local materialization only; the integration change-set receipt under `.treeseed/workflow/integration-receipts/` proves a pushed candidate. Neither receipt substitutes for the other.

Use `--verify local` when a checkpoint also needs package-local verification. An interrupted save records its journal as interrupted and reports the exact `trsd resume <run-id>` command.

## Stage Contract

Stage requires a clean pushed task branch. It merges current staging down before promotion, resolves generated internal-reference and lock metadata conflicts, and stops with file-level diagnostics for source conflicts. Package refs are promoted with expected-head protection and the Market staging ref moves last.

Stage runs local proof, promotes exact package refs with expected-head protection, moves Market staging last, verifies the remote refs, and synchronizes every checkout to `staging`. Push-triggered `verify.yml` workflows remain advisory non-mutating feedback. Hosted monitoring is explicit with `--ci hosted` and must not be used while deployment automation is suspended.

## Release Contract

Production release is fail-closed while Market and API hosted deployment workflows are absent. A future release path must be restored only after an OpenTofu-based Railway/Cloudflare design has passed isolated acceptance testing and GitHub Actions remains the sole deployment authority.

Reviewer is a local-only package. It participates in save, verification, artifact, and publication ordering, but its manifest forbids hosted deployment.

## CI/CD Truth

Local verification and exact staging refs are the current staging proof. GitHub-hosted `verify.yml` results provide additional non-mutating feedback but are not deployment gates while hosted release automation is suspended.

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

Reviewed integration checkpoint required before stage:

```bash
npx trsd save --federated --json "integrate repository checkpoints"
```

Local confidence check:

```bash
npx trsd save --verify local --json "message"
```

Plan release proof:

```bash
npx trsd proof plan --target staging --json
```

Promote a locally verified immutable staging candidate:

```bash
npx trsd stage --json
```

Explicitly request hosted proof only after hosted automation is restored:

```bash
npx trsd stage --ci hosted --json
```

Production release is intentionally blocked until hosted automation is restored:

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
