# Workday Parity Runbook

Use this runbook when a processing parity or dogfood check fails.

## First Checks

1. Run `npm run processing:test-local`.
2. Open `.treeseed/test-reports/processing-parity-local.md`.
3. Check `Non-Parity Behaviors` for loop mode, source mode, stub providers, or
   non-`/data` storage.
4. Open `.treeseed/test-reports/processing-parity-diff.md` and look for
   disallowed differences.

When the failure is container-specific, run the container smoke commands
directly:

```bash
npm run processing:build
docker run --rm treeseed-processing:local healthcheck
docker run --rm treeseed-processing:local parity-plan --environment local --json
docker run --rm treeseed-processing:local api --help
docker run --rm treeseed-processing:local manager --dry-run --json
docker run --rm treeseed-processing:local worker --dry-run --json
```

`healthcheck` is intentionally minimal-env friendly for local containers as long
as `/data` is writable. Missing Codex auth is a local warning. In staging and
production, `doctor` remains strict about required credentials, stub providers,
and non-`/data` worker roots.

If Docker is not available, `processing:test-local` reports that the container
was not exercised. That fallback is useful for package CI, but Docker acceptance
requires the image build and smoke commands above to pass.

## Package Closure Failures

If the container starts but processing roles fail from a packed package, check
the agent package closure smoke:

```bash
npm -w packages/agent run build:dist
npm -w packages/agent run test:unit -- test/package/package-shape.test.ts
npm -w packages/agent run verify:local
```

The packed-install smoke must not rely on `packages/agent/src`,
`scripts/run-ts.mjs`, or workspace-relative imports. Package-shape tests also
assert that `.ts-run-*` temp modules do not ship in `dist` or the npm package.

## Manager Failures

The parity manager must run one bounded reconciliation cycle. If the report
shows `manager_loop_mode`, set:

```bash
TREESEED_MANAGER_MODE=reconcile
```

Repeated manager runs must not duplicate startup tasks such as graph refresh or
documentation scan tasks.

## Worker Failures

Workers must use `/data`. If a worker writes under `.treeseed-runner`, check:

```bash
TREESEED_PROCESSING_PARITY=1
TREESEED_DATA_DIR=/data
TREESEED_RUNNER_VOLUME_ROOT=/data
```

For Railway, verify the worker-runner volume is mounted at `/data`.

## Codex Auth Failures

If hosted `doctor` reports missing Codex auth, the worker does not have the
subscription login file Codex expects. Bootstrap the file from a secret and keep
the live copy on the persistent worker volume:

```text
TREESEED_CODEX_AUTH_JSON_B64=<base64 encoded ~/.codex/auth.json>
TREESEED_CODEX_AUTH_FILE=/data/codex/auth.json
```

Store these through `treeseed config` and sync Railway for the target
environment. `treeseed-processing` materializes the file only when it is absent
and sets `CODEX_HOME` internally for Codex child processes. Do not set
`TREESEED_CODEX_AUTH_OVERWRITE=1` unless rotating the login, because the live
file may contain refreshed tokens newer than the bootstrap secret.

## Governance Failures

No canonical content mutation is correct without a matching approval and
verification record. For dogfood failures, inspect the approval, changed paths,
verification result, and workday report sections before rerunning.
