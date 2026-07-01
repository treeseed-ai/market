# TreeSeed Guarantees

TreeSeed guarantees are release-blocking product contracts. A guarantee is stronger than a browser test: it describes the user or operator promise, the allowed and forbidden actors, the required devices, the UI scene, API verifier references, content and audit expectations, negative cases, and the evidence required to trust the result.

Guarantees are authored as YAML files. CSV, JSON, and Markdown views are generated reports only.

## Source Of Truth

The canonical source is:

```text
guarantees/<type>/<subtype>/<journey>.guarantee.yaml
packages/*/guarantees/<type>/<subtype>/<journey>.guarantee.yaml
```

Do not hand-edit generated CSV files. Generate tabular views with:

```bash
npx trsd guarantees export --format csv --output .treeseed/generated/guarantees/treeseed.guarantees.csv --json
```

## Taxonomy

`type` and `subtype` must be lowercase kebab-case:

```yaml
type: project
subtype: question
```

The directory must match the manifest:

```text
packages/admin/guarantees/project/question/ask-question.guarantee.yaml
```

Mixed-case values such as `Project`, `Question`, `MarketplaceSeller`, and `TreeDX` are invalid.

## Authoring

A guarantee uses schema `treeseed.guarantee/v1` and includes:

- identity: `id`, `journeyIndex`, `type`, `subtype`, `journey`, `ownerPackage`
- surface: `admin-ui`, `agent-runtime`, `api-control-plane`, `market-ui`, `cli`, `scene`, or `content-runtime`
- lifecycle: `status`, `gates`
- actors: `allowed`, `forbidden`
- devices: required browser/device profiles
- dependencies: other guarantees or journey indexes
- scene: a `treeseed.scene/v1` workflow manifest for UI/video evidence
- api/content/audit: verifier references owned by package-local registries
- negative cases: denied actors, validation failures, and destructive safety checks
- evidence: trace, video, API logs, audit event IDs, and content refs

Use `status: planned` or `status: backlog` for promises that are not implemented yet. Do not make an incomplete guarantee `active` or release-gating. Active guarantees must have resolvable verifier references and at least one required scene, API, content, or audit contract.

## Ownership

- root Market owns public buyer marketplace, checkout, service, capacity discovery, Commons participant, and public profile guarantees.
- `@treeseed/admin` owns admin/control-plane UI guarantees.
- `@treeseed/api` owns durable backend, commerce, Commons, capacity leases, workday records, audit, operations, and TreeDX routing guarantees.
- `@treeseed/agent` owns provider runtime, provider manager/runner, AgentKernel, assignment execution, and mode-run guarantees.
- `@treeseed/core` owns installable public site and Knowledge Hub runtime guarantees.
- `@treeseed/cli` owns operator command guarantees.
- Do not add TreeSeed guarantee manifests to `packages/treedx`; TreeDX remains product-neutral.

Agent monitoring is split by surface:

- `@treeseed/agent` owns runtime forensic guarantees such as assignment, mode-run, handler, usage, error, and trace correlation.
- `@treeseed/api` owns durable control-plane guarantees such as provider sessions, assignment leases, mode-run records, usage actuals, ledger settlement, TreeDX proxy authorization, and audit records.
- `@treeseed/admin` owns operator UI guarantees that prove humans can inspect agents, assignments, mode runs, fallback outputs, usage, TreeDX proxy audit, and settlement evidence without moving scheduling into Admin.

## Scenes

Guarantee scenes use the existing `treeseed.scene/v1` schema and live beside the guarantee:

```text
packages/admin/guarantees/project/question/scenes/ask-question.scene.yaml
```

Acceptance scenes should use stable `data-scene` or `testId` selectors, include expectations for every non-demo-only step, and capture trace, video, screenshots, console, network, timeline, and app logs. Scene videos can be rendered as demo or training artifacts from the same workflow evidence.

## API And Verifier References

Guarantees reference verifier IDs instead of embedding endpoint details:

```yaml
api:
  required: true
  verifierRefs:
    - api.project.question.create
```

Verifier registries live under package-local guarantee folders:

```text
packages/api/guarantees/verifiers/api.verifiers.yaml
packages/admin/guarantees/verifiers/ui.verifiers.yaml
packages/agent/guarantees/verifiers/runtime.verifiers.yaml
```

The API package owns API acceptance case definitions and TreeDX routing verifiers. Content and audit verifier refs should prove durable state, TreeDX content refs, provenance, authorization, and audit event IDs.

Supported verifier kinds are:

- `apiAcceptanceCase`: runs a named API acceptance case through `packages/api/scripts/api-acceptance.ts`.
- `vitestCase`: runs a package-local Vitest file, optionally filtered by test name.
- `nodeScript`: runs a package-owned TypeScript script through `node --import tsx`.
- `packageScript`: runs a package script through `npm -w <package> run`.
- `scene`: links a verifier ref to scene evidence.
- `manualEvidence`: records non-release manual evidence.
- `todo`: placeholder refs for planned/backlog work only.

Release and security guarantees cannot depend on `manualEvidence` or `todo` verifier refs.

## Commands

Validate everything:

```bash
npx trsd guarantees validate --json
```

Plan focused work:

```bash
npx trsd guarantees plan --type project --subtype question --json
npx trsd guarantees plan --type capacity --json
```

Run active guarantees:

```bash
npx trsd guarantees run --owner-package @treeseed/agent --environment local --json
npx trsd guarantees run --type project --subtype agent --environment local --json
```

By default, `run` executes only `active` guarantees and expands dependencies. Use `--include-planned` to include planned/backlog entries in the report as skipped records, and `--no-dependencies` for narrow local diagnostics.

Export generated reports:

```bash
npx trsd guarantees export --format csv --output .treeseed/generated/guarantees/guarantees.csv --json
```

Filters are available for `--type`, `--subtype`, `--gate`, `--owner-package`, `--status`, `--id`, and `--journey-index`. Filter values for `type` and `subtype` must be lowercase kebab-case.

## Release Policy

The TreeSeed product guarantee is: no tagged production release is cut unless all required active release guarantees pass.

Release workflows must call the release CLI command. The release command validates the registry, plans release guarantees, runs active release guarantees, writes evidence, and blocks tag/publish phases on failed, blocked, or skipped release-required guarantees. GitHub Actions may upload guarantee evidence artifacts, but must not reimplement or bypass guarantee gating.

Release evidence should include:

```text
.treeseed/guarantees/release/<run-id>/plan.json
.treeseed/guarantees/release/<run-id>/report.json
.treeseed/guarantees/release/<run-id>/report.md
.treeseed/guarantees/release/<run-id>/generated.csv
.treeseed/guarantees/release/<run-id>/evidence/
```

## Maintenance

When adding a feature, add or update the guarantee that describes the product promise. When changing API behavior, update verifier references or API acceptance cases. When changing UI behavior, update scene manifests and stable selectors. When deleting behavior, deprecate the guarantee with a reason instead of silently removing the promise.

Bug fixes should strengthen or add guarantees when the bug represents a product promise that should not regress.

To activate a guarantee:

1. Replace `todo.*` refs with package-local verifier refs.
2. Add or update the verifier registry.
3. Ensure required scene manifests exist when `scene.required: true`.
4. Run `npx trsd guarantees validate --id <guarantee-id> --json`.
5. Run `npx trsd guarantees run --id <guarantee-id> --environment local --json`.
6. Change `status` to `active` only after the verifier evidence is repeatable.

## Framework Testing

The guarantee framework carries release trust, so it needs unusually broad tests:

- schema and malformed YAML tests
- lowercase taxonomy tests
- discovery and package ownership tests
- dependency graph and cycle tests
- filtering tests
- CSV/JSON/Markdown export tests
- verifier registry tests
- release gate planning tests
- CLI command tests
- runner and evidence report tests
- release blocking tests
- workspace integration tests that prove the initial registry has 179 guarantees
