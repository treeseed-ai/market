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

The operation authenticates every `treeseed-ai/*` read and push with the central `TREESEED_GITHUB_TOKEN`, never overwrites an existing target branch, persists partial branch receipts under `.treeseed/repository-migrations/`, and reports `noop` on replay only when the source commit, normalized content path, live target commit, and verified journal receipt all match. A `history_verified` receipt covers Git history bootstrap only; TreeDX binding and immutable R2 publication remain separate required cutover gates.

The old software-repository content workflow remains in place until the matching content repository and R2 publication verify. After cutover, content publication is manual or release-driven through `trsd content publish`; a Git push does not directly mutate R2.

## Runtime paths

Published objects are immutable:

```text
content/<project-id>/<environment>/releases/<content-sha>/manifest.json
content/<project-id>/<environment>/releases/<content-sha>/content/**
content/<project-id>/<environment>/channels/current.json
content/<project-id>/previews/<preview-id>/manifest.json
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
