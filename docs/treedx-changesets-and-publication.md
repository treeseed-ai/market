# TreeDX changesets and separate repository tracks

TreeSeed has two independently governed, commit-addressed repository tracks. The primary repository is the software workbench and the paired content repository is the knowledge history. Git remains durable history for both; neither Discussion nor other Astro content history is stored in PostgreSQL.

## Content mutations

Agents, the TreeSeed UI, and API clients mutate text content with `treedx.changeset/v1`. A request contains one standard multi-file Git unified diff, its SHA-256 digest, an idempotency key, the exact base ref and commit, and either the expected workspace version or expected destination head. Standard HTTP `Content-Encoding: gzip` is supported. TreeDX parses file headers without regenerating the diff, authorizes every path, applies every hunk in one bounded workspace transaction, and rejects the entire changeset on conflict.

The low-level workspace endpoint applies the changeset to the TreeDX overlay bound to the content repository. The SDK content adapter then commits that workspace once and performs one guarded push. It never invokes the software repository save path. The resulting receipt records the base and result commit, branch, patch digest, changed paths, before/after content digests, workspace version, replay status, and stable `treeseed.artifact-ref/v1` references. A failed post-apply commit or push leaves the TreeDX workspace available for inspected recovery rather than hiding partial external effects.

Single-file write and patch endpoints remain generic TreeDX operations. TreeSeed content tools use changesets; they do not send a complete document to the single-file PATCH endpoint.

## Repository saves

Software changes use `trsd save` in the primary repository. That workflow versions and verifies only the software repository graph; it does not clone or commit the paired content repository.

Content changes use assignment-scoped TreeDX operations or a future explicit content-repository operator workflow. TreeDX pushes the guarded content commit and records its receipt. A single commit must never mix software and knowledge. `trsd stage` promotes exact verified software refs; content publication advances only from an exact verified content ref. `trsd release` remains unavailable while hosted application deployment is suspended.

## Publication layout

The SDK-owned publication reconciler writes only these canonical R2 keys:

- `teams/{teamId}/objects/sha256/{digest}` for immutable objects;
- `teams/{teamId}/published/manifests/{revision}.json` for immutable manifests;
- `teams/{teamId}/published/common.json` for the production pointer;
- `teams/{teamId}/published/staging.json` for the staging pointer;
- `teams/{teamId}/previews/{projectId}/{refDigest}/manifest.json` for task previews.

Objects are uploaded only when their digest key is absent. Immutable manifests use create-only writes. Mutable pointers use conditional replacement against the observed ETag. The reconciler reads the manifest and pointer back and compares their exact bytes before issuing a secret-free receipt. Signed URLs and credentials are never durable artifacts.

The legacy `knowledge-publications/**` namespace and its fallback reader are removed. All readers and writers use the canonical team layout.

## CI and local convergence

Every publishable content repository owns content validation and publication policy. Pull requests validate without R2 authority. Publication is invoked explicitly through the SDK-owned content reconciler: task refs can publish preview overlays, `staging` can advance the staging pointer, and `main` can advance `common.json`. A Git push alone does not mutate R2. Protected `preview`, `staging`, and `production` authorities provide separate R2 credentials to the reconciler.

`trsd run` owns continuous local software reconciliation. Its tracked, fast-forward-only update operation spans the configured software portfolio and package repositories but never materializes content repositories. It never stashes, resets, force-pulls, or saves. Dirty or diverged software checkouts remain blocked drift. TreeDX indexing and publication receipts are postconditions of content convergence, not reasons to synthesize a software commit.

PostgreSQL may retain publication jobs and operational state. Git/TreeDX retain content and changeset-derived events; R2 retains content-addressed serving artifacts.
