# TreeSeed Seed

The `treeseed` seed describes the integrated development portfolio used by the
local control plane. It contains deterministic, non-secret product records:

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
unchanged resources rather than creating duplicates. Sensitive values and
provider credentials are invalid seed input.
