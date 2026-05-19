# Processing Parity

TreeSeed processing parity means the local, staging, and production processing
planes use the same role contract:

```bash
treeseed-processing api
treeseed-processing manager
treeseed-processing worker
treeseed-processing workday-start
treeseed-processing workday-report
treeseed-processing healthcheck
treeseed-processing doctor --role worker --environment local
treeseed-processing parity-plan --environment local
treeseed-processing parity-diff --from local --to staging
```

The parity target is a built processing image with role commands only. Runtime
commands must not run `npm run build:*` before starting. Build steps belong in
the image or deploy build phase.

`treeseed-processing` is owned by `@treeseed/agent`. It is a thin role
dispatcher over the built Agent API, bounded manager, worker loop, workday
helpers, processing doctor, and processing plan/diff support. The processing
image combines that package runtime with Market tenant content, seeds,
migrations, and deployment config.

Market remains the owner of tenant-specific Markdown specs:

```text
src/content/agents
src/content/agent-tests
```

`@treeseed/agent` must be runtime self-contained for code: bins, API, manager,
worker, handlers, processing plan/doctor, runtime paths, and testing harnesses
must all ship in the package `dist` and packed tarball.

## Local Parity

Use:

```bash
npm run processing:build
npm run processing:up
npm run processing:parity-plan
npm run processing:test-local
```

`processing:test-local` builds the Docker image when needed and, when Docker is
available, runs the smoke sequence:

```bash
docker run --rm treeseed-processing:local healthcheck
docker run --rm treeseed-processing:local parity-plan --environment local --json
docker run --rm treeseed-processing:local api --help
docker run --rm treeseed-processing:local manager --dry-run --json
docker run --rm treeseed-processing:local worker --dry-run --json
```

Package closure is checked by `npm -w packages/agent run verify:local`. That
verification performs a packed-install smoke and proves the installed package
can run `treeseed-processing` without `packages/agent/src`, workspace-relative
TypeScript loaders, or source-mode temp modules.

Local Compose mounts `.treeseed/local-processing/data` at `/data`. Worker
repository state must resolve under:

```text
/data/repositories/<repository-id>/bare.git
/data/repositories/<repository-id>/worktrees/<task-id>
/data/runners/<runner-id>
/data/tmp
```

Fast-dev loops are allowed, but they are non-parity when the runtime plan shows
manager loop mode, source-mode TypeScript execution, stub providers, or a worker
storage root other than `/data`.

## Container Shape

`Dockerfile.processing` uses Node 22, BuildKit npm cache mounts, reproducible
`npm ci --ignore-scripts`, build-stage package/API builds, and production
dependency pruning before the runtime layer is copied. The runtime image should
contain built package outputs, package manifests, Market runtime `src` content
needed by processing, migrations, seeds, `treeseed.site.yaml`, and
`bin/treeseed-processing`.

The runtime image must not contain `.git`, `.treeseed`, package fixtures,
package source trees, local worktrees, generated caches, or `.ts-run-*` files.
The package build also skips `.ts-run-*` temp modules, and package-shape tests
assert those files do not enter `dist` or `npm pack --dry-run`.

## Reports

Parity commands write Markdown and JSON reports under:

```text
.treeseed/test-reports/processing-parity-local.md
.treeseed/test-reports/processing-parity-diff.md
```

CI uploads `.treeseed/test-reports/**` as artifacts.
