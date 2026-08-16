# TreeSeed Seed

The `treeseed` seed creates the initial deterministic, non-secret resources in
a team:

- the TreeSeed team;
- first-party projects and their repository identity metadata;
- products and catalog artifacts;
- content and TreeDX bindings that are part of the current project model.

The seed does not create service connections, vault grants, credential
envelopes, provider resources, deployments, capacity providers, or secrets.
Service connections are created through the authenticated Services UI or its
API/CLI contracts so their encrypted custody and actor-specific grants can be
proved.

## Commands

Validate or inspect the deterministic plan:

```bash
npx trsd seed treeseed --validate
npx trsd seed treeseed --environments local --plan --json
```

Apply to the local control plane:

```bash
npx trsd seed treeseed --environments local --apply --json
```

Seed input is declarative and idempotent. Repeated application must report
unchanged resources rather than creating duplicates. After creation, the live
team project inventory—not the seed—is authoritative for current project
membership and repository bindings. Sensitive values and provider credentials
are invalid seed input.

## Branch-safe workspace snapshots

Singleton workspace reconciliation is explicit about both its mutation branch and committed inputs. It never infers `main` and never snapshots a dirty ambient checkout:

```bash
npx trsd seed platform-workspace treeseed --branch staging --source-ref <market-staging-sha> --plan --json
npx trsd seed market-api-workspace market-singleton --branch staging --sdk-ref <sdk-staging-sha> --admin-api-ref <api-staging-sha> --plan --json
```

Apply requires the same arguments plus `--apply --yes`. Receipts bind the dependency refs, target branch, snapshot digest, target commit, and fresh remote read-back. Stale journals, cross-branch inputs, dirty dependency checkouts, moved source refs, and implicit main mutations fail closed.
