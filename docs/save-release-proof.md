# Treeseed Save And Release Proof

Treeseed save has two different jobs:

- Fast checkpointing keeps development moving.
- Release proof decides whether exact refs are viable for staging or production.

The fast save lane should stay fast. Promotion proof must be incremental, reusable, and tied to the actual hosted systems that will release the software.

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

Run authoritative hosted proof:

```bash
npx trsd proof run --target staging --driver github-hosted --json
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
