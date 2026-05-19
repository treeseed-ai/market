# Railway Processing Deploy

Railway processing services use one processing image and role-specific commands.

## Roles

```text
api             node ./packages/agent/dist/scripts/treeseed-processing.js api
workdayManager  node ./packages/agent/dist/scripts/treeseed-processing.js manager
workerRunner    node ./packages/agent/dist/scripts/treeseed-processing.js worker
```

When Railway invokes the processing image entrypoint directly, the command may
be just the role name:

```text
api
manager
worker
```

The service build command may build the API/package artifacts, but the start
command must not chain `npm run build:*`. Projection tests should fail if a
staging or production start command contains a runtime build chain such as
`npm run build:api && ...`.

The processing image is the integration artifact: `@treeseed/agent` supplies
runtime code and bins, while the Market repo supplies tenant content specs,
seeds, migrations, and deployment config.

## Manager

The manager is scheduled. It runs bounded reconciliation and exits. Long-running
manager loops are development-only and should appear as non-parity in
`parity-plan`.

## Worker Runner

Worker runner services are cold by default and use a Railway volume mounted at
`/data`. Runner services and volume names are derived by Treeseed; do not add
concrete runner names or volume names to `treeseed.site.yaml`.

## Codex Subscription Auth

Subscription-backed Codex expects a Codex login `auth.json` file. Do not bake
that file into `Dockerfile.processing`, and do not print it into logs. For
Railway workers, store a bootstrap copy as a secret and materialize it onto the
persistent `/data` volume:

```text
TREESEED_CODEX_AUTH_JSON_B64=<base64 encoded auth.json>
TREESEED_CODEX_AUTH_FILE=/data/codex/auth.json
```

Store these through `treeseed config` for `staging` and `prod`, then sync
Railway so the registry deploys `TREESEED_CODEX_AUTH_JSON_B64` as a secret and
the file path/policy values as variables. `treeseed-processing` writes the auth
file only when it is missing and sets `CODEX_HOME` internally for the child
Codex process. This matters because Codex may refresh and rewrite `auth.json`;
overwriting it from a stale secret on every boot can invalidate the worker. Use
`TREESEED_CODEX_AUTH_OVERWRITE=1` only for an intentional rotation.

Use one automation login per environment, and prefer one auth file per worker
runner volume. If multiple workers need to execute Codex concurrently, provision
separate automation seats/auth files rather than copying one refresh-token file
across independent volumes.

## Verification

Before staging promotion, run:

```bash
npm run processing:build
npm run test:processing-parity-local
npm run processing:test-local
```

The Docker smoke sequence is:

```bash
docker run --rm treeseed-processing:local healthcheck
docker run --rm treeseed-processing:local parity-plan --environment local --json
docker run --rm treeseed-processing:local api --help
docker run --rm treeseed-processing:local manager --dry-run --json
docker run --rm treeseed-processing:local worker --dry-run --json
```

For hosted checks, use the `Processing Parity` workflow dispatch and inspect the
uploaded reports.
