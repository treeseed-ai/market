# Project Architecture Migration

## Decision

Every TreeSeed project has two independently governed repositories:

- the primary repository is the software workbench;
- the `{primary-name}-content` repository is the knowledge and asset history.

The seed stores both normalized GitHub identities. Content repositories are not workspace submodules and software build, test, and deployment jobs must not clone them. Git remains the durable content history, TreeDX is the only operational query and mutation path, and Cloudflare R2 is the published runtime plane.

Projects use `split_site_content`, `localContentMaterialization: none`, and an R2 runtime source. Local feature development resolves the staging publication plus an immutable preview overlay. It never silently reads a removed `src/content` directory.

## Ownership

- SDK owns repository-policy contracts, desired GitHub units, migration journals, exact-ref verification, TreeDX publication receipts, and R2 channel pointers.
- CLI parses commands, enforces confirmation, and presents SDK results.
- API owns durable project and content-repository bindings plus assignment-scoped TreeDX authorization.
- TreeDX owns content workspaces and changesets in its own repository custody.
- The platform-operation capacity provider may execute approved repository and publication operations.
- Agent providers may author content only through assignment-scoped TreeDX operations.

No service receives both a software checkout and a content checkout as an implicit shared filesystem.

## Repository federation and local worksets

The final development model does not use a parent repository's gitlinks as portfolio authority. Software repositories remain independent and are joined by an SDK-owned `treeseed.integration-change-set/v1` receipt. Each receipt records normalized remote identity, role, source branch, exact commit, dependency names, package/lockfile contract digests, verification disposition, and fresh remote read-back. Its identifier is derived from that canonical state rather than from local paths or a parent commit.

`trsd save` is single-repository scoped by default: it saves only the independent repository containing the invocation directory and emits a repository-scoped receipt. Cross-project work is performed in an ephemeral workset materialized from the Platform portfolio manifest; `trsd save --federated` records and pushes the checked-out repositories in dependency order and emits the integration receipt required by stage. `trsd stage` rejects repository-scoped receipts, verifies that every federated remote still matches the receipt, runs the integration proof, and promotes those exact commits. `trsd release` consumes the staged receipt and its proof instead of reconstructing a portfolio from a checkout.

A clean Platform clone assembles that workset through the SDK-owned operation:

```bash
npx trsd platform workset --plan --json
npx trsd platform workset --apply --yes --json
npx trsd platform workset --apply --yes --branch feature/cross-project-change --json
```

The manifest permits only unique, workspace-contained software paths at exact commits. Apply uses the central token when configured, creates independent repositories atomically, and records `.treeseed/worksets/platform/latest.json`. It never resets or deletes an existing path. A dirty checkout, wrong origin, unexpected branch, moved commit, nested repository, Market identity, or content-repository identity is blocking drift. Repeating an exact successful apply produces thirteen `noop` actions for the canonical Platform portfolio.

During the transition, the existing Market workspace may retain software submodules and the recursive save adapter. That adapter emits the same receipt and may update gitlinks for compatibility, but stage identity is the receipt, not the gitlinks. Content repositories, Market, and Market API are never materialized into a Platform workset. Clean-clone workset, stage, close, recovery, and release-plan acceptance now passes without `.gitmodules`; the compatibility adapter remains only until active development has cut over from the Market workspace to Platform worksets.

## Repository policy

Seed repository policy declares visibility, `create-or-adopt` or `adopt-only`, `retain` or `archive`, fixed `main` and `staging` branches, and GitHub feature settings. Deletion defaults to retain. Repository creation, adoption, settings, branch verification, and remote read-back flow through SDK reconciliation.

Production GitHub mutation is hosted-only. Local `trsd seed repositories` execution is limited to local and staging and requires an inspected plan plus explicit confirmation.

## Migration lifecycle

Each content extraction follows one journaled operation:

```text
validate -> observe source/target -> extract exact refs -> push target -> verify target
  -> bind TreeDX -> publish immutable R2 release -> verify gateway
  -> remove software content path -> save exact repository graph
```

The operation preserves content history from `main`, `staging`, and the active migration branch, maps package `docs/src/content` to content-repository `src/content`, and does not copy software release tags. Replay succeeds only when source, target, branch, tree, TreeDX, and R2 digests match the journal. Unexpected content or ref movement is blocking conflict.

History bootstrap is deliberately applied one project at a time after live repository reconciliation:

```bash
npx trsd seed content-repositories treeseed --project admin --plan --json
npx trsd seed content-repositories treeseed --project admin --apply --yes --json
```

Repository renames and organization moves use the parallel source-history operation before content extraction:

```bash
npx trsd seed source-repositories treeseed --project template-engineering --plan --json
npx trsd seed source-repositories treeseed --project template-engineering --apply --yes --json
```

The source operation pushes exact historical refs into empty targets, permits only journal-proven fast-forward augmentation for a required workflow, and blocks unexpected target history. This is the path used to move the template repositories and the public Market repository into `treeseed-ai`; it does not deploy either repository.

Platform is intentionally not migrated with the generic source operation because this transitional workspace still contains the Market application. Its dedicated extraction composes a filtered workspace snapshot from live package/template/fixture refs and excludes Market code, assets, content, host manifests, singleton seeds, and Market repositories:

```bash
npx trsd seed platform-workspace treeseed --plan --json
npx trsd seed platform-workspace treeseed --apply --yes --json
```

Platform content uses an explicit skeleton migration mode so root Market content can never be mistaken for Platform-owned content.

The operation authenticates every `treeseed-ai/*` read and push with the central `TREESEED_GITHUB_TOKEN`, never overwrites an existing target branch, persists partial branch receipts under `.treeseed/repository-migrations/`, and reports `noop` on replay only when the source commit, normalized content path, live target commit, and verified journal receipt all match. A `history_verified` receipt covers Git history bootstrap only; TreeDX binding and immutable R2 publication remain separate required cutover gates. Migration journals prove repository creation/history, while integration change-set receipts prove a development or promotion candidate; neither may be substituted for the other.

The old software-repository content workflow remains in place until the matching content repository and R2 publication verify. After cutover, content publication is manual or release-driven through `trsd content publish`; a Git push does not directly mutate R2.

## Live authority checkpoint

The staging migration now treats the live GitHub repositories as input, not the seed manifest as evidence. The Platform portfolio binds thirteen live primary/template/fixture repositories at exact refs; their paired content repositories remain outside the workset. Content repositories have verified `main`, `staging`, and migration-history refs. `trsd content publish --seed treeseed --branch staging` fetches each exact live staging commit into an isolated checkout, verifies the ref before and after publication, and writes project-scoped immutable R2 releases. Replays reuse every object and upload zero objects.

Local TreeDX reconciliation derives each paired content repository from the seed, fetches only its validated `refs/heads/staging` ref, compares the resolved TreeDX commit with fresh GitHub observations before and after fetch, and indexes that exact commit. Split-content projects never seed TreeDX from the software checkout. Interrupted Git fetch recovery is limited to an expired lock for the exact validated destination ref; unsafe or broad refspecs remain rejected. A converged replay must report `noop` for the TreeDX unit and an exact live-ref verification for every project.

This checkpoint authorizes package metadata cutover to `split_site_content`, `src/content`, `r2_preview_overlay`, and `localContentMaterialization: none`. It does not yet authorize deleting the old software content paths: each runtime must first prove it serves the R2 staging publication without a disk fallback.

The exact-ref publication manifest is also the canonical web-runtime manifest. Contract v3 includes immutable raw source objects plus a deterministic runtime projection (path-qualified entry identities, collection indexes, rendered source payloads, docs tree, and search index) under the same release root. Book-local knowledge slugs remain in entry data while repository-path-qualified runtime slugs prevent collisions between common page names such as `overview`. The environment-scoped channel pointer is `content/{teamId}/{projectId}/{environment}/channels/current.json`, where `prod` resolves to `production`. Published web builds register empty Astro collections and read that exact pointer from `TREESEED_CONTENT_MANIFEST_KEY`; they never probe a local content directory as a fallback.

Software-path removal requires a journaled four-plane gate:

```bash
npx trsd content cutover --seed treeseed --project admin --branch staging --plan --json
npx trsd content cutover --seed treeseed --project admin --branch staging --apply --yes --remove-software-content --json
```

The apply reconciles only the local TreeDX content unit, freshly verifies graph, search, frontmatter, and exact Git ref, compares the live software and content Git trees, requires the current R2 publication receipt, and writes `.treeseed/content-cutovers/<repository>--<branch>.json`. Removal is additionally blocked when the local legacy path is dirty or its `HEAD` tree differs from the verified live source tree.

## Runtime paths

Published objects are immutable:

```text
content/<team-id>/<project-id>/<environment>/releases/<content-sha>/manifest.json
content/<team-id>/<project-id>/<environment>/releases/<content-sha>/content/**
content/<team-id>/<project-id>/<environment>/channels/current.json
content/<team-id>/<project-id>/previews/<preview-id>/manifest.json
```

Production reads the production channel. Staging reads the staging channel. Local development reads staging plus an exact preview overlay when declared. Missing staging content is a readiness blocker, not permission to fall back to disk.

## Rollout gates

1. SDK repository reconciliation and migration recovery tests pass against local bare repositories.
2. Isolated GitHub lifecycle acceptance passes and cleans all test resources.
3. Staging R2 publication and gateway verification pass.
4. One project completes extraction, replay, and software-path removal.
5. Remaining projects migrate in dependency order.
6. Push-triggered software content workflows are removed only after all matching content repositories are authoritative.

No production content or repository mutation is authorized by this document alone.
