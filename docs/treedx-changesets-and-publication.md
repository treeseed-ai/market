# TreeDX changesets and dual save tracks

TreeSeed has two coordinated, commit-addressed save tracks. Git remains the durable history for both tracks; neither Discussion nor other Astro content history is stored in PostgreSQL.

## Content mutations

Agents, the TreeSeed UI, and API clients mutate text content with `treedx.changeset/v1`. A request contains one standard multi-file Git unified diff, its SHA-256 digest, an idempotency key, the exact base ref and commit, and either the expected workspace version or expected destination head. Standard HTTP `Content-Encoding: gzip` is supported. TreeDX parses file headers without regenerating the diff, authorizes every path, applies every hunk in one bounded workspace transaction, and rejects the entire changeset on conflict.

The low-level workspace endpoint applies the changeset to the TreeDX overlay. The SDK content adapter then commits that workspace once and performs one guarded push. It never invokes `trsd save`. The resulting receipt records the base and result commit, branch, patch digest, changed paths, before/after content digests, workspace version, replay status, and stable `treeseed.artifact-ref/v1` references. A failed post-apply commit or push leaves the TreeDX workspace available for inspected recovery rather than hiding partial external effects.

Single-file write and patch endpoints remain generic TreeDX operations. TreeSeed content tools use changesets; they do not send a complete document to the single-file PATCH endpoint.

## Repository saves

Local content-only changes use `trsd save`. The repository save classifier commits and pushes without package versioning or code verification. TreeDX observes and indexes that exact Git commit; it does not recreate the commit.

Local code, handlers, tests, and manifests use the dependency-ordered repository save path. A mixed save creates one coherent repository commit. The content workflow and non-content verification workflow independently consume the same immutable SHA. `trsd stage` only promotes exact verified refs. `trsd release` remains unavailable while hosted application deployment is suspended.

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

Every publishable project owns `content.yml`, filtered to its declared `contentPath`. Pull requests validate without R2 authority. Task branches publish preview overlays, `staging` advances the staging pointer, and `main` advances `common.json`. Protected `preview`, `staging`, and `production` environments provide separate R2 S3 credentials. `verify.yml` ignores content-only changes; a mixed commit triggers both tracks.

`trsd run` owns continuous local reconciliation. Its tracked, fast-forward-only update operation already spans the configured Market portfolio and package repositories. It never stashes, resets, force-pulls, or saves. Dirty or diverged checkouts remain blocked drift. TreeDX indexing and publication receipts are postconditions of content convergence, not reasons to synthesize another local commit.

PostgreSQL may retain publication jobs and operational state. Git/TreeDX retain content and changeset-derived events; R2 retains content-addressed serving artifacts.
