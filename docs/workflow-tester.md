# Treeseed Workflow Tester And Scene Video Platform

Treeseed workflow testing is the planned manifest-driven platform for automated browser acceptance, workflow evidence, and demo-video production. It will execute user workflows against Treeseed web applications with Playwright, capture debugging artifacts, and render education or demo videos from the same scene definition through a pluggable renderer model. Remotion is the first renderer plugin.

The platform should become the central Treeseed tool for:

- automated end-to-end workflow acceptance testing
- reproducible local, staging, and eventually production smoke workflows
- rich debugging artifacts for UI, API, and control-plane failures
- scriptable demo walkthroughs
- education and training videos
- long-running guided scenario recordings, including 20-30 minute demos
- future workflow evidence attached to staging, release, and training pipelines

The core principle is:

```text
A scene is an executable workflow contract. It should be useful as a test, a debug trace, and a video production source without forking the workflow definition.
```

Scene testing complements reconciliation live tests. It does not replace provider exact-state reconciliation acceptance, hosted-service verification, release gates, or package-local verification. It proves product workflows from the user's point of view and emits evidence that humans can inspect.

## Authoring Guide

Use [Scene Authoring Guide](scene-authoring.md) as the standalone reference for designing clear scene manifests, desktop/tablet/mobile walkthroughs, overlays, diagrams, training outputs, evidence bundles, publish plans, and local exports.

Phase 11 also includes `trsd scene visual-audit`, a screenshot review matrix for user-facing routes. Visual audits discover public, auth, market, app, and content-backed paths, then capture viewport screenshots across role fixtures and desktop/tablet/mobile device profiles for look-and-feel QA without rendering video or publishing externally.

The canonical broad visual audit scene is `scenes/site-visual-audit.yaml`. It writes `.treeseed/scenes/visual-audits/<scene-id>/<timestamp>-<audit-id>/manifest.json`, `report.md`, grouped viewport screenshots, and deterministic `review/` outputs. Full-page screenshots are opt-in debug artifacts only.

Visual audit review is enabled by default. It captures client-side console/page/request/HTTP errors, DOM summaries, functional/access signals, and display heuristics, then writes `review/findings.json`, `review/findings.md`, `review/agent-brief.md`, `review/client-errors.jsonl`, and local HTML contact sheets. The agent brief is designed to feed repair agents directly and to steer fixes toward reusable package architecture: `@treeseed/ui` for shared controls/styles, `@treeseed/admin` for app composition and client behavior, `@treeseed/core` for public/book style loading, `@treeseed/market` for tenant branding, and `@treeseed/api` for fixture/session/data issues.

Local authenticated visual audits seed owner, admin, and member fixtures through the API-owned `/v1/acceptance/seed` route. That route owns the required PostgreSQL writes in `@treeseed/api`; the scene SDK does not write directly to the database. A recent full local smoke captured 110 discovered routes across anonymous, owner, admin, and member roles on desktop, tablet, and mobile devices, producing 1185 screenshots with no skipped or failed captures.

## Architectural Principles

1. **One Scene, Many Outputs**

   The YAML scene manifest is the source of truth. The same manifest can produce a test result, Playwright trace, screenshot set, timeline JSON, rendered video, transcript, and educational material. Video authoring must not fork away from acceptance workflow authoring.

2. **SDK Owns Runtime Semantics**

   `@treeseed/sdk` owns manifest parsing, validation, scene graph compilation, run orchestration, artifact contracts, plugin interfaces, and report models. `@treeseed/cli` exposes the command surface only. `@treeseed/ui`, `@treeseed/admin`, `@treeseed/core`, and root Market consume the runner by adding stable selectors, fixtures, and scenario manifests.

3. **CLI Is A Thin Command Surface**

   Command specs follow existing Treeseed conventions in `packages/cli/src/cli/operations-registry.ts`. Scene commands should be handler-backed and should dispatch to SDK-owned runtime services. They should prefer structured `--json` output for agents, CI, and future release-evidence pipelines.

4. **Manifest-Driven, Not Code-Only**

   YAML describes intent and workflow steps. TypeScript plugins provide advanced actions, assertions, renderers, fixtures, diagram components, and specialized integrations. Manifests should remain readable by non-implementers where possible.

5. **Pluggable By Default**

   Actions, assertions, capture providers, data fixtures, environment providers, artifact writers, video renderers, overlays, diagrams, narration providers, and report generators are extension points. Remotion is the first video renderer plugin, not a hard-coded runtime dependency of the entire platform.

6. **Long Workflow First-Class Support**

   The runtime must support 20-30 minute scenes through checkpointing, chapters, resumable execution, segmented recording, artifact streaming, and recoverable failure reports. It must not assume scenes are short Playwright tests.

7. **Determinism Over Fragility**

   Scenes use stable `data-scene`, `data-testid`, role/name selectors, or semantic selectors. They prefer named app surfaces and semantic operations over raw coordinates. Mouse movement, cursor trails, and timing are video-production concerns unless they are part of the acceptance behavior being tested.

8. **Debuggability Is A Product Requirement**

   Every run emits machine-readable and human-readable reports. Reports link failures to step id, selector, screenshot, trace segment, console logs, network events, app logs, and any relevant Treeseed operation id.

   Guarantee-backed service journeys include full-page screenshots for every executed step in the guarantee result evidence. Viewport captures are debug/render fallback artifacts and should not be surfaced as primary reviewer screenshots.

9. **No Provider Mutation Outside Canonical Systems**

   Scene setup may request local dev, seeds, auth, readiness checks, staging smoke, or operation polling through existing `trsd` workflows and SDK services. It must not directly mutate Railway, Cloudflare, GitHub, Docker, provider config, or secret state outside canonical Treeseed commands.

10. **Video Rendering Is Downstream Of Evidence**

    Playwright execution emits a normalized timeline. Remotion consumes that timeline and selected media artifacts. Rendering must be reproducible without rerunning the browser workflow when artifacts are present.

11. **Guarantee Dependencies Are Execution Semantics**

    Guarantee planning uses a dependency graph, not a display sort. `dependencies.guarantees`, `dependencies.journeys`, verifier-based dependencies, implicit authenticated app dependencies, and scene state producer/consumer links order execution. Failed prerequisites block dependents before browser or verifier execution.

## Package Ownership

- `@treeseed/sdk`
  - scene manifest schema and parser
  - typed scene graph compiler
  - Playwright runner orchestration
  - artifact directory conventions
  - timeline/event model
  - plugin contracts
  - report writers
  - environment integration with dev, seed, auth, and readiness workflows
  - Remotion plugin interface types

- `@treeseed/cli`
  - `trsd scene ...` command registration
  - argument parsing and help text
  - dispatch to SDK
  - JSON and human-readable output formatting

- `@treeseed/core`
  - optional local runtime hooks needed by scenes
  - stable app shell semantics for scene navigation

- `@treeseed/admin`
  - stable selectors for admin routes
  - fixture-aware UI states where appropriate
  - scene manifests for admin and operator workflows

- `@treeseed/ui`
  - reusable selector conventions
  - optional sandbox scenes for reusable components
  - visual-regression bridge to existing Playwright e2e coverage

- root `@treeseed/market`
  - canonical product scenes
  - demo scripts
  - training scenes
  - public-site and Market app acceptance scenes

- `@treeseed/api`
  - operation polling and assertion helpers exposed through SDK/API surfaces
  - test fixture and seed support for backend-backed workflows

- `@treeseed/agent`
  - future long-running capacity and workday scene fixtures
  - optional scene steps for capacity-provider demonstrations

## Command Surface

The initial command family is:

```bash
trsd scene validate <scene.yaml> --json
trsd scene plan <scene.yaml> --environment local|staging|prod --json
trsd scene run <scene.yaml> --environment local|staging|prod --record --json
trsd scene report <run-id-or-path> --json
trsd scene render <scene.yaml> --from <run-path> --renderer remotion --format mp4 --json
trsd scene list --json
```

Later commands are:

```bash
trsd scene clean <run-id-or-path> --json
trsd scene inspect <run-id-or-path> --step <step-id> --json
trsd scene resume <run-id-or-path> --from-checkpoint <checkpoint-id> --json
trsd scene publish <scene.yaml> --from <run-id-or-path> --target local|release --redaction-policy <path> --json
```

Command naming should prefer subcommands under `scene`, following the `trsd dev start/status/logs/stop` pattern, rather than many colon-separated top-level commands. The CLI package should register command metadata, examples, options, and help text, then delegate runtime work to SDK services.

## Scene Manifest Model

Canonical project-level scenes live at:

```text
scenes/<scene-id>.yaml
```

Package-local scenes may live in package roots when they test package-owned behavior:

```text
packages/admin/scenes/<scene-id>.yaml
packages/ui/scenes/<scene-id>.yaml
packages/agent/scenes/<scene-id>.yaml
```

Draft manifest:

```yaml
schemaVersion: treeseed.scene/v1
id: market-project-deploy-demo
title: Team Service Management Demo
description: Guided workflow proving provider connection, encrypted custody, and operation-lease evidence.
audience:
  - operator
  - evaluator
  - trainee
mode:
  test: true
  demo: true
  training: true

target:
  app: market
  environment: local
  baseUrl: auto
  viewport:
    width: 1440
    height: 1000
  browser: chromium

setup:
  dev:
    required: true
    command: trsd dev start --web-runtime local --json
    reuseExisting: true
  auth:
    profile: local
    required: true
  seed:
    name: treeseed
    environments:
      - local
    apply: true

artifacts:
  trace: true
  video: true
  screenshots: true
  console: true
  network: true
  timeline: true
  appLogs: true

workflow:
  - id: open-projects
    title: Open projects
    action:
      goto: /app/projects
    expect:
      visible:
        - scene: projects.index

  - id: open-market-project
    title: Open Market project
    action:
      click:
        role: link
        name: Market
    expect:
      urlIncludes: /app/projects/

  - id: open-deploy-panel
    title: Open deployment panel
    action:
      click:
        role: tab
        name: Deploy
    expect:
      text: Staging

  - id: queue-staging-deploy
    title: Queue staging deployment
    action:
      click:
        role: button
        name: Deploy staging
    expect:
      operation:
        kind: project.web_deployment
        status:
          - queued
          - running
          - completed
        timeoutSeconds: 300

chapters:
  - id: context
    title: Project context
    startsAt: open-projects
  - id: deployment
    title: Deployment as governed operation
    startsAt: open-deploy-panel

overlays:
  - id: deployment-callout
    at: open-deploy-panel
    renderer: remotion
    type: callout
    text: Deployment is represented as an auditable operation.
    anchor:
      scene: project.deploy.timeline

diagrams:
  - id: deployment-operation-flow
    renderer: remotion
    at: queue-staging-deploy
    component: OperationFlowDiagram
    props:
      stages:
        - queued
        - claimed
        - running
        - verified
        - completed

render:
  remotion:
    composition: treeseed-training-default
    output:
      format: mp4
      fps: 30
      resolution:
        width: 1920
        height: 1080
```

## Manifest Design Rules

- `schemaVersion` is required.
- `id` is stable and filesystem-safe.
- Every workflow step has a stable `id`.
- Long scenes must define chapters.
- Assertions must be explicit; steps without assertions are allowed only when marked `demoOnly: true`.
- Setup can call Treeseed workflows but cannot run arbitrary provider mutations by default.
- Selectors should prefer semantic selector objects over CSS strings.
- Raw CSS selectors are allowed for escape hatches and must be marked as brittle or internal.
- Video overlays refer to timeline step ids, not absolute timestamps, unless the overlay is intentionally post-production only.
- Remotion components receive typed props validated by the scene compiler.

## Scene Graph Compiler

The SDK compiles YAML into a typed graph before execution:

```text
load -> parse -> validate -> normalize -> resolve plugins -> compile graph -> plan run
```

Compiled nodes include:

- scene metadata
- target app/environment
- setup requirements
- browser context
- workflow step graph
- assertions
- capture requirements
- checkpoints
- chapters
- overlay events
- diagram events
- render jobs
- artifact writers
- plugin bindings

Compiler output is available through:

```bash
trsd scene plan <scene.yaml> --json
```

The plan report includes:

- resolved base URL
- selected environment
- required dev/auth/seed steps
- browser/device plan
- workflow steps
- enabled plugins
- artifact paths
- render outputs
- warnings
- blockers
- estimated duration when known

Planning must be non-mutating. It may inspect the workspace, discover scenes, validate target app ownership, and resolve managed dev instance records, but it must not start processes, apply seeds, authenticate, run browser actions, or render video.

## Runtime Architecture

The run lifecycle is:

```text
discover workspace
load scene
compile scene graph
prepare environment
start or reuse dev runtime
apply or validate seed
establish auth
open browser context
execute workflow
capture timeline and artifacts
run assertions
write reports
optionally render video
return structured result
```

Long workflows are segmented:

```text
scene
  chapter
    segment
      step
        action
        assertions
        capture event
        checkpoint
```

Long workflow support includes:

- chapter-level boundaries
- segment-level video recording
- periodic checkpoints
- resumable state where feasible
- failure isolation to a step and chapter
- artifact flushing during execution
- heartbeat/progress events
- timeout controls at scene, chapter, and step level
- optional `continueOnFailure` for demo capture
- strict failure behavior for acceptance mode

The runner should stream progress as JSON events when `--json` is selected, while also writing durable run artifacts under `.treeseed/scenes/runs`. A terminal crash should not erase evidence already flushed to disk.

## Artifact Directory Contract

Run artifacts live under:

```text
.treeseed/scenes/runs/<scene-id>/<timestamp>-<short-run-id>/
```

Each run directory contains:

```text
scene.normalized.json
scene.plan.json
run.json
timeline.json
report.md
report.html
playwright/
  trace.zip
  videos/
  screenshots/
  network.jsonl
  console.jsonl
  errors.jsonl
logs/
  dev.jsonl
  api.jsonl
  operations-runner.jsonl
segments/
  <chapter-id>/<segment-id>/
render/
  remotion/
    composition.json
    frames/
    output.mp4
training/
  captions.vtt
  captions.srt
  transcript.md
  narration.md
  glossary.md
  chapter-clips.json
evidence/
  manifest.json
  report.md
  bundle/
publish/
  local/
    manifest.json
    report.md
    bundle/
publish-plan/
  manifest.json
  report.md
  export/
```

`.treeseed/scenes/runs` is generated local state and should not be committed by default. Phase 9-11 commands copy selected sanitized and redacted artifacts into local evidence, publish, and export folders for review. Remote publication apply remains deferred and must route through canonical Treeseed reconciliation adapters.

## Report Contract

Every run emits:

- `ok`
- `sceneId`
- `runId`
- `startedAt`
- `finishedAt`
- `durationMs`
- `environment`
- `baseUrl`
- `browser`
- `workflowStatus`
- `steps`
- `failedStep`
- `assertions`
- `artifacts`
- `timelinePath`
- `playwrightTracePath`
- `videoPaths`
- `renderedVideoPaths`
- `logs`
- `warnings`
- `blockers`

Each step report includes:

- step id
- title
- action type
- start/end time
- status
- retry count
- assertion results
- screenshot path
- trace location if available
- console/network errors observed during the step
- linked Treeseed operation ids when applicable

Human reports should prioritize the first actionable failure, include a concise step timeline, and link every artifact by relative path. Machine reports should remain stable across minor presentation changes.

## Plugin Architecture

Scene execution is plugin-based. The initial implementation may use static built-in plugins, but the core runner loop should be written against plugin interfaces from the start.

- `ActionPlugin`
  - adds executable actions such as `goto`, `click`, `fill`, `upload`, `drag`, `keyboard`, `apiRequest`, and `waitForOperation`

- `AssertionPlugin`
  - adds checks such as `visible`, `text`, `url`, `operation`, `network`, `a11y`, `screenshot`, and `databaseRecord`

- `EnvironmentPlugin`
  - prepares local/staging/prod target context
  - integrates with `trsd dev`, `trsd ready`, `trsd seed`, auth, and workspace discovery

- `CapturePlugin`
  - records video, screenshots, traces, network, console, app logs, and custom telemetry

- `ArtifactPlugin`
  - writes reports, timeline files, HTML output, Markdown output, JSON output, and future release evidence

- `RendererPlugin`
  - consumes timeline and media artifacts to render final output
  - renderer hosts are swappable SDK adapters; Remotion is the first built-in adapter

- `DiagramPlugin`
  - provides typed diagram components and animation primitives for video overlays

- `NarrationPlugin`
  - future text-to-speech, voiceover script, captions, transcript, and training copy support

Interface sketch:

```ts
export interface TreeseedScenePlugin {
  id: string;
  version: string;
  actions?: Record<string, TreeseedSceneActionHandler>;
  assertions?: Record<string, TreeseedSceneAssertionHandler>;
  captures?: Record<string, TreeseedSceneCaptureProvider>;
  renderers?: Record<string, TreeseedSceneRenderer>;
  diagrams?: Record<string, TreeseedSceneDiagramProvider>;
}
```

Plugin loading should initially be static and built-in. Later phases can support package discovery from package manifests or explicit scene configuration, but the first implementation should avoid dynamic code execution from untrusted manifests.

## Remotion Renderer Plugin

Remotion is the first renderer plugin. The Playwright runner records browser media and emits `timeline.json`. The Remotion plugin reads:

- normalized scene manifest
- timeline events
- screenshots/video segments
- overlay definitions
- diagram definitions
- narration and caption scripts

Remotion renders:

- full demo videos
- chapter clips
- training clips
- failure explanation clips

The renderer host owns these concepts through an SDK adapter boundary:

- composition registry
- scene timeline adapter
- overlay components
- callout components
- cursor and click visualization
- zoom/pan components
- chapter title components
- lower-third components
- training mode vs demo mode rendering

First built-in Remotion compositions:

- `treeseed-demo-default`
- `treeseed-training-default`
- `treeseed-failure-review`
- `treeseed-diagram-only`

Rendering must support `render-only` from a previous run directory. A video render should not require a new browser execution unless the requested artifacts are missing.

Typed animated diagrams are implemented through SDK diagram providers and Remotion composition support. Narration is not stubbed in the Remotion integration; deterministic narration scripts, transcripts, captions, glossary output, and chapter clip manifests are implemented as Phase 8 training outputs without AI or TTS.

## Animated Diagram Model

Diagrams are typed TypeScript components referenced by YAML:

```yaml
diagrams:
  - id: operation-lifecycle
    renderer: remotion
    component: OperationLifecycleDiagram
    at: queue-staging-deploy
    durationSeconds: 12
    props:
      states:
        - queued
        - claimed
        - running
        - verified
        - completed
```

Principles:

- YAML references diagrams and passes serializable props.
- Diagram implementation lives in TypeScript.
- Diagram props are validated at compile time where possible and runtime otherwise.
- Diagrams are reusable across scenes.
- Diagrams can render as overlays or standalone interstitials.
- Diagrams should explain platform concepts such as operation lifecycle, reconciliation flow, staging promotion, capacity provider handoff, and content publishing.

The diagram system should prioritize reusable conceptual components. A scene should not need to hand-author frame-by-frame animations for standard Treeseed concepts.

## Long Workflow Orchestration

Long scenes are not just longer Playwright tests. They are durable workflow productions with test, demo, and training requirements. A 20-30 minute scene needs:

- durable run ids
- chapter segmentation
- step checkpointing
- partial replay
- ability to resume after app crash or browser crash where state allows
- ability to render from completed segments even if later steps fail
- progress events suitable for `--json`
- log streaming during execution
- memory-safe artifact writing
- video segment stitching
- configurable timeouts
- automatic cleanup boundaries
- optional operator intervention steps
- manual pause/resume for live demos
- deterministic seeded data
- failure report that points to the exact scene chapter and step

Manual intervention example:

```yaml
workflow:
  - id: pause-before-production
    title: Pause before production deployment
    action:
      pause:
        mode: manual
        prompt: Confirm production deployment for live demo.
    demoOnly: true
```

Modes:

- `acceptance` fails fast or fails at the first critical assertion.
- `demo` may continue through recoverable issues to collect footage.
- `training` prioritizes captions, overlays, and chapter clarity.
- `record-only` captures without rendering.
- `render-only` renders from previous artifacts.

Checkpointing must be explicit. The runner can always preserve artifacts, but it can only resume safely from steps whose setup and data state are deterministic or whose scene definition marks the checkpoint as resumable.

## Integration With Treeseed Workflows

Scene setup and verification should integrate with existing Treeseed workflows:

- `trsd dev start --web-runtime local --json` for local runtime setup
- `trsd dev status --json` to discover existing runtime URL and logs
- `trsd ready local|staging|prod --json` for preflight readiness
- `trsd seed <name> --validate|--plan|--apply --json` for deterministic data
- `trsd auth:login` and auth profile discovery for local/staging sessions
- `trsd operations smoke` and operation polling for backend workflow proof
- `trsd reconcile test-live` for provider acceptance, separate from browser scene testing
- `trsd save/stage/release` may later attach scene reports as proof artifacts

Scene testing must not become a second infrastructure orchestrator. It may invoke or consume existing Treeseed workflow APIs, but hosted resources, provider credentials, local process supervisors, config sync, and package workflows stay under their existing SDK-owned systems.

## Selector And UI Contract

Treeseed scenes need stable user-workflow landmarks. The preferred selector convention is:

- Use `data-scene="<surface.id>"` for user workflow landmarks.
- Use `data-testid` where component testing already relies on it.
- Prefer role/name selectors for user-facing controls.
- Use CSS selectors only for internal escape hatches.
- Stable scene ids should describe product surfaces, not implementation details.

Examples:

```html
<section data-scene="projects.index">
<button data-scene="project.deploy.staging.queue">
<div data-scene="project.deploy.timeline">
```

Scenes should fail when required landmarks are missing. Missing landmarks are product testability bugs unless the scene is stale and the intended workflow no longer exists.

## Phased Implementation Plan

### Phase 0: Architecture Document And Spike

Scope:

- add `docs/workflow-tester.md`
- confirm command naming
- confirm ownership
- add SDK scene foundation types and Phase 0 status reporting
- add pure artifact path planning for future run outputs
- expose `@treeseed/sdk/scenes`
- expose `trsd scene status --json`
- document Playwright and Remotion as deferred dependencies behind future plugin boundaries

Acceptance:

- document merged
- `trsd scene status --json` reports foundation readiness
- `@treeseed/sdk/scenes` exports Phase 0 report and artifact path planning APIs
- SDK scene artifact path planning is covered by tests
- CLI scene command status and unsupported-action behavior are covered by tests
- Playwright and Remotion are documented as deferred dependencies
- no scene command mutates provider state, workspace state, local dev runtime, secrets, or generated run artifacts

## Phase 0 Implementation Notes

Phase 0 makes the scene platform visible without executing browser workflows. It establishes the SDK-owned scene module, the CLI-owned `trsd scene status` command, deterministic artifact path planning, and explicit dependency boundaries for Playwright and Remotion. It intentionally does not import Playwright or Remotion yet.

The implemented Phase 0 surface is:

```bash
trsd scene
trsd scene status
trsd scene status --json
```

The SDK export is:

```ts
import {
  createTreeseedScenePhase0Report,
  planTreeseedSceneArtifactPaths,
} from '@treeseed/sdk/scenes';
```

`createTreeseedScenePhase0Report` identifies the platform as the central TreeSeed acceptance test harness and demo / educational video generator, reports available Phase 0 capability, lists deferred dependencies, and points to Phase 1.

`planTreeseedSceneArtifactPaths` is pure. It validates filesystem-safe scene ids and returns the future `.treeseed/scenes/runs/<scene-id>/<timestamp>-<run-id>/` path layout without creating files or directories.

Verification for Phase 0 should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
rg "Phase 0|trsd scene|central TreeSeed acceptance test harness and demo / educational video generator|Remotion|Playwright" docs/workflow-tester.md
```

### Phase 1: Scene Manifest Foundation

Scope:

- add SDK scene types
- add YAML parser using existing `yaml` dependency pattern
- add schema validation
- add `trsd scene validate`
- add `trsd scene plan`
- add normalized manifest output
- define artifact path planner
- static built-in action/assertion registry only

Acceptance:

- invalid YAML reports diagnostics with line/source where possible
- valid sample scene produces deterministic plan JSON
- unit tests cover parser, defaults, diagnostics, and path planning

## Phase 1 Implementation Notes

Phase 1 implements the manifest foundation for the central TreeSeed acceptance test harness and demo / educational video generator. It keeps the platform non-executing: validation and planning do not launch browsers, start dev services, apply seeds, authenticate, render video, or write `.treeseed/scenes/runs` artifacts.

The implemented Phase 1 surface is:

```bash
trsd scene validate <scene.yaml> --json
trsd scene plan <scene.yaml> --environment local|staging|prod --json
```

The SDK export now includes:

```ts
import {
  formatTreeseedSceneDiagnostics,
  loadTreeseedSceneDocument,
  parseTreeseedSceneManifest,
  planTreeseedScene,
  validateTreeseedScene,
} from '@treeseed/sdk/scenes';
```

Supported Phase 1 manifest features:

- `schemaVersion: treeseed.scene/v1`
- scene id, title, description, audience, mode, target, setup, artifacts, workflow, chapters, overlays, diagrams, and Remotion render config
- action declarations for `goto`, `click`, `fill`, `keyboard`, `pause`, `apiRequest`, and `waitForOperation`
- expectation declarations for `visible`, `text`, `urlIncludes`, and `operation`
- semantic selectors using `scene`, `testId`, `role/name`, and `text`
- CSS selectors as an escape hatch with warnings unless marked `brittle` or `internal`
- static built-in action/assertion/renderer registries, with Remotion present as a deferred renderer

Validation reports include normalized scene manifests and path-specific diagnostics. Plan reports include selected environment, base URL, browser, viewport, workflow step summaries, enabled actions/assertions/renderers, and the deterministic future artifact path layout.

Phase 1 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
npm -w packages/cli run verify:local
rg "Phase 1|trsd scene validate|trsd scene plan|central TreeSeed acceptance test harness and demo / educational video generator|Remotion|Playwright" docs/workflow-tester.md
```

`npm -w packages/sdk run verify:local` should also be run. If it remains blocked by the existing unrelated SDK fast-suite failures, report those failures separately from the focused scene verification.

### Phase 2: Playwright Runner MVP

Scope:

- add Playwright dependency in the correct package boundary
- implement `trsd scene run`
- support `goto`, `click`, `fill`, `expectText`, `expectVisible`, `expectUrl`
- support base URL resolution from local dev status
- support trace, screenshots, video, console logs
- emit `run.json`, `timeline.json`, `report.md`

Acceptance:

- one local Market scene runs against `trsd dev start`
- failure report links step id to screenshot and trace
- JSON output is stable and useful for automation

## Phase 2 Implementation Notes

Phase 2 adds the first executable layer for the central TreeSeed acceptance test harness and demo / educational video generator. The runner is SDK-owned and the CLI remains a thin command surface. `trsd scene run` now executes browser-safe Playwright workflows, records debugging evidence, and writes the Phase 2 run artifact bundle.

The implemented Phase 2 command surface is:

```bash
trsd scene run <scene.yaml> --environment local|staging|prod --record --json
```

The SDK export now includes:

```ts
import {
  formatTreeseedSceneMarkdownReport,
  resolveTreeseedSceneBaseUrl,
  runTreeseedScene,
  writeTreeseedSceneRunArtifacts,
} from '@treeseed/sdk/scenes';
```

Supported Phase 2 runtime actions:

- `goto`
- `click`
- `fill`
- `keyboard`

Supported Phase 2 runtime assertions:

- `visible`
- `text`
- `urlIncludes`

Accepted but non-executable until later phases:

- `apiRequest` actions wait for the Phase 4 plugin contract.
- `pause`, checkpointing, resume, manual intervention, and long-workflow segmented execution wait for Phase 5.
- Remotion rendering waits for Phase 6.

Phase 2 did not start dev services, apply seeds, authenticate, mutate provider state, render video with Remotion, publish artifacts, or resume long workflows. Those setup responsibilities are added in Phase 3 through canonical SDK services.

`target.baseUrl: auto` is local-only in Phase 2. For `local`, the runner reads the existing managed dev web instance through SDK local-dev state and uses its HTTP health URL when the instance is running. If no local web instance is running, the run blocks with `scene.local_dev_not_running` and instructs the operator to start local dev with:

```bash
trsd dev start --web-runtime local --json
```

For `staging` and `prod`, `baseUrl: auto` is resolved in Phase 3 from canonical deploy configuration when available.

`trsd scene run` writes:

```text
.treeseed/scenes/runs/<scene-id>/<timestamp>-<short-run-id>/
  scene.normalized.json
  scene.plan.json
  run.json
  timeline.json
  report.md
  playwright/
    trace.zip
    screenshots/
    videos/
    network.jsonl
    console.jsonl
    errors.jsonl
```

The runner dynamically imports Playwright when execution begins. If the package or browser executable is unavailable, the run returns `scene.playwright_unavailable` or `scene.playwright_browser_missing`. Browser installation remediation is:

```bash
npm -w packages/sdk exec playwright install chromium
```

The non-executing draft scene at `scenes/drafts/university-study-group-workday.yaml` captures the future university study-group training scenario. It describes a student creating the `comparative-inquiry-study-group`, creating Psychology 101, Macro Economics 301, and Art History projects, assigning core objectives, allocating a third of the portfolio to each project, attaching a Codex-capable capacity provider at 30% daily allocation, and simulating 10 governed workdays that produce proposals, decisions, objective updates, books of knowledge, and exportable knowledge packs. This scene is intentionally a draft because it still requires future API/capacity/agent plugins before it can become a strict executable acceptance workflow.

Phase 2 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
npm -w packages/cli run verify:local
rg "Phase 2|trsd scene run|central TreeSeed acceptance test harness and demo / educational video generator|Playwright|university-study-group" docs/workflow-tester.md
```

`npm -w packages/sdk run verify:local` should also be run. If it remains blocked by the existing unrelated SDK fast-suite failures, report those failures separately from the focused scene verification.

### Phase 3: Treeseed Environment Integration

Scope:

- integrate scene setup with `trsd ready`
- integrate local dev reuse/start behavior
- integrate seed validation/apply
- integrate auth profile setup
- integrate API operation polling assertion
- collect dev/API/runner logs where available

Acceptance:

- scene can prepare a local Market run from a cold but configured workspace
- operation-backed workflow assertions can wait for completion
- reports include linked operation ids and relevant logs

## Phase 3 Implementation Notes

Phase 3 makes `trsd scene run` environment-aware while preserving the core positioning of the platform as the central TreeSeed acceptance test harness and demo / educational video generator. The CLI remains a thin command surface. Environment preparation, auth resolution, seed planning/apply, operation polling, and log collection live in `@treeseed/sdk/scenes`.

The implemented Phase 3 command surface remains:

```bash
trsd scene run <scene.yaml> --environment local|staging|prod --record --json
```

No new top-level commands are introduced. `trsd scene validate` and `trsd scene plan` remain non-mutating. `trsd scene run` is the first scene command that may start managed local dev services or apply seed data, and only when the manifest explicitly requests those setup behaviors.

The SDK export now includes:

```ts
import {
  collectTreeseedSceneLogs,
  planOrApplyTreeseedSceneSeed,
  prepareTreeseedSceneEnvironment,
  resolveTreeseedSceneAuth,
  runTreeseedScene,
  waitForTreeseedSceneOperation,
} from '@treeseed/sdk/scenes';
```

Supported Phase 3 setup behavior:

- `setup.dev.required: true` authorizes canonical managed local dev reuse/start through SDK local-dev services.
- `setup.dev.command` is informational and is not executed as arbitrary shell.
- `setup.auth.required: true` requires an existing Treeseed market session; the runner does not start interactive login.
- `setup.seed.name` plans or validates deterministic seed data through the SDK seed planner.
- `setup.seed.apply: true` explicitly authorizes canonical seed apply. Local apply uses the existing local seed apply service pattern; hosted apply uses `MarketClient.applySeed`.
- readiness preflight uses `collectTreeseedDeploymentReadiness`.
- dev/API/operations-runner logs are copied as bounded local artifacts when available.

Supported Phase 3 runtime operation behavior:

- `waitForOperation` is executable.
- `expect.operation` is executable.
- explicit operation ids are preferred.
- operation ids observed from browser network responses are linked to the current run when response JSON contains common fields such as `operationId`, `operation.id`, or `payload.operation.id`.
- operation polling defaults to 300 seconds with a 2 second poll interval.
- operation ids are included in step reports, operation reports, timeline events, and Markdown failure details.

`apiRequest` remains deferred until Phase 4 because it should enter through the formal action plugin contract rather than as an ad hoc runner branch.

Phase 3 writes the Phase 2 artifact bundle plus:

```text
.treeseed/scenes/runs/<scene-id>/<timestamp>-<short-run-id>/
  setup.json
  logs/
    dev.jsonl
    api.jsonl
    operations-runner.jsonl
```

`run.json` now includes:

- `phase: 3`
- `setup.environment`
- `setup.auth`
- `setup.seed`
- `operations`
- log artifact paths

`timeline.json` can now include:

```text
setup.start
setup.end
readiness.start
readiness.end
seed.plan.start
seed.plan.end
seed.apply.start
seed.apply.end
auth.resolve
operation.detected
operation.poll.start
operation.poll.tick
operation.poll.end
```

Blocked setup runs return structured reports before browser launch. Blockers include invalid scene plans, readiness failures, required auth without a session, seed plan/apply failures, base URL resolution failures, and local dev startup failures. Provider mutation is still forbidden outside canonical Treeseed SDK and `trsd` workflows.

Phase 3 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts test/utils/scenes-environment.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
npm -w packages/cli run verify:local
rg "Phase 3|trsd scene run|central TreeSeed acceptance test harness and demo / educational video generator|waitForOperation|operation|seed|auth|local dev" docs/workflow-tester.md
```

`npm -w packages/sdk run verify:local` should also be run. If it remains blocked by unrelated existing SDK fast-suite failures, report those failures separately from the focused scene verification.

### Phase 4: Plugin Contract

Scope:

- formalize plugin interfaces
- convert built-in actions/assertions/capture/render hooks to internal plugins
- add plugin registry
- add plugin diagnostics to plan output
- support package-local plugin registration later without implementing dynamic discovery yet

Acceptance:

- built-in behavior runs through plugin interfaces
- adding a new action does not require modifying the core runner loop
- tests cover plugin resolution and unknown action diagnostics

## Phase 4 Implementation Notes

Phase 4 implements the static SDK plugin contract for the central TreeSeed acceptance test harness and demo / educational video generator. The public command surface is unchanged: `trsd scene status`, `trsd scene validate`, `trsd scene plan`, and `trsd scene run` continue to work as before, while `@treeseed/sdk/scenes` now owns formal plugin interfaces and built-in plugin resolution.

The SDK exports `TreeseedScenePlugin`, `TreeseedSceneActionHandler`, `TreeseedSceneAssertionHandler`, `TreeseedSceneEnvironmentProvider`, capture/artifact/renderer/diagram/narration provider contracts, and registry helpers such as:

```ts
createBuiltInTreeseedScenePluginRegistry()
resolveTreeseedScenePlugins()
listBuiltInTreeseedScenePlugins()
createTreeseedSceneRuntimePluginContext()
```

Static built-in plugin loading is implemented. Dynamic package discovery and manifest-loaded plugin code are explicitly deferred so scene manifests do not become an arbitrary code execution path.

Built-in Phase 4 plugins:

- `treeseed.scene.browser-actions`
  - category: `action`
  - available: `goto`, `click`, `fill`, `keyboard`
  - deferred: `apiRequest`
- `treeseed.scene.operation-actions`
  - category: `action`
  - available: `waitForOperation`
- `treeseed.scene.browser-assertions`
  - category: `assertion`
  - available: `visible`, `text`, `urlIncludes`
- `treeseed.scene.operation-assertions`
  - category: `assertion`
  - available: `operation`
- `treeseed.scene.environment`
  - category: `environment`
  - delegates to canonical SDK environment preparation, auth resolution, seed planning/apply, and base URL resolution
- `treeseed.scene.capture.playwright`
  - category: `capture`
  - declares `playwright-trace`, `playwright-video`, `playwright-screenshots`, `playwright-console`, `playwright-network`, and `operation-id-detection`
- `treeseed.scene.artifacts.default`
  - category: `artifact`
  - declares JSON run/timeline/plan/normalized-scene writers, Markdown report writing, setup JSON, and managed-dev log capture
- `treeseed.scene.renderer.remotion`
  - category: `renderer`
  - status: `deferred`
  - phase: 6

The runner now resolves action and assertion handlers from the plugin registry instead of switching directly on every workflow key. Environment setup is exposed through the internal environment provider, while existing test seams still override those hooks for deterministic tests. Capture and artifact behavior remains mostly in the runner and artifact modules in Phase 4, but it is now represented as named built-in provider capabilities so later phases can extract those concerns without changing the command surface.

`trsd scene plan --json` now includes plugin-aware fields while preserving existing compatibility fields:

```json
{
  "plugins": [],
  "enabledPlugins": [],
  "pluginDiagnostics": [],
  "enabledActions": [],
  "enabledAssertions": [],
  "enabledRenderers": []
}
```

`plugins` lists all static built-ins with id, version, status, category, phase, and summary. `enabledPlugins` lists only the plugin ids backing the actions, assertions, and renderers referenced by the scene. `pluginDiagnostics` reports duplicate or invalid plugin metadata, including `scene.plugin_duplicate` and `scene.plugin_invalid`.

`apiRequest` remains manifest-valid but runtime-deferred. Remotion remains represented only as a deferred renderer plugin; Phase 4 does not import Remotion and does not render video. Provider mutation remains limited to canonical SDK services already introduced in Phase 3.

Phase 4 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts test/utils/scenes-environment.test.ts test/utils/scenes-plugins.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
rg "Phase 4|Plugin Contract|central TreeSeed acceptance test harness and demo / educational video generator|TreeseedScenePlugin|enabledPlugins|Remotion|Phase 5" docs/workflow-tester.md
```

`npm -w packages/cli run verify:local` and `npm -w packages/sdk run verify:local` should also be run. If SDK `verify:local` remains blocked by unrelated existing SDK fast-suite failures, those failures should be reported separately from focused scene verification.

Phase 5 is now the long workflow runtime boundary. It should add chapter segmentation, durable checkpoints, resume/inspect commands, heartbeat progress events, manual pause behavior, timeout hierarchy, partial render-from-artifacts support, and memory-safe artifact flushing for 20-30 minute scenes.

### Phase 5: Long Workflow Runtime

Scope:

- add chapters
- add segments
- add checkpoints
- add `trsd scene resume`
- add `trsd scene inspect`
- add heartbeat/progress JSON events
- add configurable timeout hierarchy
- support manual pause steps
- support render-from-partial-artifacts

Acceptance:

- a 20-minute synthetic scene can run without unbounded memory growth
- a failed late step preserves earlier artifacts
- a run can resume from a checkpoint when the scene marks the checkpoint as resumable

## Phase 5 Implementation Notes

Phase 5 implements the long workflow runtime for the central TreeSeed acceptance test harness and demo / educational video generator. It keeps the Phase 4 plugin contract intact while adding durable runtime structure for 20-30 minute acceptance, demo, and training scenes.

Implemented Phase 5 command surface:

```bash
trsd scene run <scene.yaml> --environment local|staging|prod --record --json
trsd scene inspect <run-id-or-path> --step <step-id> --json
trsd scene resume <run-id-or-path> --from-checkpoint <checkpoint-id> --json
```

`trsd scene run --json` and `trsd scene resume --json` now emit newline-delimited JSON. Progress events are emitted as they happen, followed by a single final report envelope:

```json
{"command":"scene run","kind":"event","event":{"type":"step.started"}}
{"command":"scene run","kind":"event","event":{"type":"checkpoint.written"}}
{"command":"scene run","kind":"final","ok":true,"report":{}}
```

The normalized manifest now includes runtime configuration:

```yaml
runtime:
  mode: acceptance
  timeouts:
    sceneSeconds: null
    chapterSeconds: null
    stepSeconds: 120
  checkpoints:
    enabled: true
    defaultResumable: false
    everyStep: true
  progress:
    heartbeatSeconds: 15
  failure:
    continueOnFailure: false
```

Step-level runtime controls are supported:

```yaml
workflow:
  - id: review-staging-result
    title: Review staging result
    action:
      goto: /app/projects/market/deployments
    expect:
      text: Completed
    timeoutSeconds: 180
    checkpoint:
      resumable: true
```

The runner derives chapter ranges from the existing `chapters[*].startsAt` manifest model. It derives segments at chapter boundaries and after resumable checkpoints. Segment metadata is written under:

```text
segments/<chapter-id>/<segment-id>/
  segment.json
  timeline.json
  steps.json
```

Checkpoints are written after successful steps when checkpointing is enabled:

```text
checkpoints/<checkpoint-id>.json
```

Checkpoint resume uses replay rather than Playwright storage-state snapshots. `trsd scene resume` reads the original run artifacts, validates the checkpoint is resumable, creates a new run root, records `resumedFrom`, and continues from the checkpoint's `nextStepId`. This is deterministic with the current runner and does not require storing browser state.

`trsd scene inspect` reads `run.json`, `timeline.json`, segment metadata, checkpoint metadata, and an optional selected step. It is intended for late-step failure review and for agents that need structured context before deciding whether to resume or repair a scene.

Manual and timed pause actions are now available through the built-in scene action plugin:

- timed pauses wait for `durationSeconds`
- manual pauses require an interactive terminal or injected pause controller
- non-interactive manual pauses fail with `scene.manual_pause_requires_tty`

Phase 5 adds step timeout handling through the normalized runtime hierarchy. Scene and chapter timeout configuration is parsed and reported for the long-runtime contract, while the first enforced timeout boundary is step execution. Timeout diagnostics use `scene.step_timeout`, `scene.chapter_timeout`, and `scene.scene_timeout` as the stable code family.

Run artifacts now include:

```text
progress.jsonl
checkpoints/
segments/
```

Existing Phase 2 and Phase 3 artifacts remain compatible. `scene.plan` is still non-mutating and does not create `.treeseed/scenes/runs`.

Remotion remains deferred until Phase 6. Segment video references are metadata over the run-level Playwright recording so Phase 6 can render from completed evidence without rerunning browser workflows. Dynamic plugin discovery also remains deferred. Provider mutation still goes only through canonical Treeseed SDK and `trsd` systems.

Phase 5 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts test/utils/scenes-environment.test.ts test/utils/scenes-plugins.test.ts test/utils/scenes-long-workflow.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
rg "Phase 5|Long Workflow Runtime|central TreeSeed acceptance test harness and demo / educational video generator|checkpoint|resume|inspect|progress.jsonl|Remotion|Phase 6" docs/workflow-tester.md
```

`npm -w packages/cli run verify:local` and `npm -w packages/sdk run verify:local` should also be run. If SDK `verify:local` remains blocked by unrelated existing SDK fast-suite failures, report those separately from focused scene verification.

Phase 6 is now the Remotion renderer boundary. It should consume timeline, segment, checkpoint, screenshot, trace, and video evidence to render demos, chapter clips, training videos, and failure review clips without rerunning browser workflows.

### Phase 6: Remotion Renderer MVP

Scope:

- add Remotion renderer plugin
- define composition registry
- render browser recording with title cards, chapters, callouts, captions, cursor/click highlights
- add `trsd scene render`
- support render-only from previous run artifacts

Acceptance:

- sample scene renders MP4 from existing Playwright artifacts
- rendering does not require rerunning browser workflow
- overlays anchor to step ids and timeline events

## Phase 6 Implementation Notes

Phase 6 implements the Remotion Renderer MVP for the central TreeSeed acceptance test harness and demo / educational video generator. Rendering is now downstream of scene evidence: `trsd scene render` consumes an existing run directory, timeline, checkpoints, segment metadata, screenshots, and video paths without rerunning Playwright, starting dev services, applying seeds, authenticating, or mutating providers.

Implemented Phase 6 command surface:

```bash
trsd scene render <scene.yaml> --from <run-id-or-path> --renderer remotion --format mp4 --json
trsd scene render <scene.yaml> --from <run-id-or-path> --mode failure-review --json
trsd scene render <scene.yaml> --from <run-id-or-path> --mode chapter --chapter <chapter-id> --json
trsd scene render <scene.yaml> --from <run-id-or-path> --mode diagram-only --json
```

The renderer implementation lives in `@treeseed/sdk/scenes`. `@treeseed/cli` only parses arguments, dispatches to the SDK, and formats the result. Remotion dependencies are SDK-owned and exact-versioned:

```text
remotion@4.0.477
@remotion/renderer@4.0.477
@remotion/bundler@4.0.477
```

Remotion code is isolated behind the render path. The public scene SDK can validate, plan, run, inspect, and resume without loading Remotion component modules. `renderTreeseedScene()` resolves a renderer id through the plugin registry, then uses a `TreeseedSceneRendererAdapter` supplied directly, supplied by a renderer adapter factory, or created by the built-in Remotion adapter factory. The default Remotion adapter dynamically imports `@remotion/bundler` and `@remotion/renderer`, bundles the built-in composition entrypoint, selects the requested composition, and renders MP4 through `renderMedia`.

The adapter boundary is intentional. Remotion is the first host implementation, not the platform contract. If licensing, runtime constraints, or deployment needs require a different renderer later, a replacement renderer can register a renderer plugin id and provide a `TreeseedSceneRendererAdapter` without changing scene manifests, run artifacts, timeline JSON, or CLI dispatch.

Phase 6 writes render artifacts under the existing run root:

```text
render/
  remotion/
    input.json
    composition.json
    progress.jsonl
    report.json
    output.mp4
```

On successful render, `run.json.renderedVideoPaths` is appended with the output MP4 path. Existing scene evidence is otherwise left intact: normalized scene, plan, timeline, checkpoints, segments, Playwright trace, screenshots, videos, console logs, and network logs are not rewritten.

Built-in Remotion compositions:

- `treeseed-demo-default`
- `treeseed-training-default`
- `treeseed-failure-review`
- `treeseed-diagram-only`

The demo and training compositions render browser media or screenshot slideshows with title cards, chapter context, lower-third step labels, callout overlays anchored to scene steps, and Phase 7 typed diagrams where present. Failure-review mode emphasizes the failed step, diagnostic context, available evidence, and nearby diagrams. Chapter mode filters render input to the selected chapter. If a run has screenshots but no Playwright video, rendering falls back to a screenshot slideshow and emits `scene.render_video_missing` as a warning. If neither screenshots nor videos exist, non-diagram renders block with `scene.render_missing_media`.

Primary render diagnostics:

- `scene.run_not_found`
- `scene.run_ambiguous`
- `scene.render_missing_scene`
- `scene.render_missing_run`
- `scene.render_missing_timeline`
- `scene.render_missing_media`
- `scene.render_video_missing`
- `scene.renderer_unknown`
- `scene.renderer_unavailable`
- `scene.render_format_unsupported`
- `scene.render_composition_unknown`
- `scene.render_chapter_not_found`
- `scene.render_missing_diagram`
- `scene.remotion_unavailable`
- `scene.remotion_browser_missing`
- `scene.remotion_bundle_failed`
- `scene.remotion_composition_failed`
- `scene.remotion_render_failed`
- `scene.render_run_update_failed`

Phase 6 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts test/utils/scenes-environment.test.ts test/utils/scenes-plugins.test.ts test/utils/scenes-long-workflow.test.ts test/utils/scenes-render.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
rg "Phase 6|Remotion Renderer MVP|central TreeSeed acceptance test harness and demo / educational video generator|trsd scene render|render-only|screenshot slideshow|Phase 7" docs/workflow-tester.md
```

`npm -w packages/cli run verify:local` and `npm -w packages/sdk run verify:local` should also be run. If SDK `verify:local` remains blocked by unrelated existing SDK fast-suite failures, report those separately from focused scene verification.

## Phase 7 Implementation Notes

Phase 7 implements the Animated Diagram System for the central TreeSeed acceptance test harness and demo / educational video generator. Diagrams are now typed SDK provider components referenced by YAML, validated during scene validate/plan, normalized into render input, and rendered through the existing Remotion renderer adapter from prior run artifacts. Rendering diagrams does not rerun Playwright, start dev services, apply seeds, authenticate, or mutate providers.

Built-in diagram plugin:

- `treeseed.scene.diagrams.remotion`

Built-in provider id:

- `treeseed-remotion-diagrams`

Built-in component ids:

- `OperationLifecycleDiagram`
- `ReconciliationLifecycleDiagram`
- `DevRuntimeTopologyDiagram`
- `SceneExecutionTimelineDiagram`

Supported placements:

- `overlay`: compact diagram panel over browser evidence.
- `interstitial`: full-screen diagram sequence near the referenced step.
- `standalone`: full-screen diagram sequence available to diagram-only renders.

Example YAML:

```yaml
diagrams:
  - id: operation-lifecycle
    renderer: remotion
    component: OperationLifecycleDiagram
    at: queue-staging-deploy
    placement: interstitial
    durationSeconds: 12
    props:
      states:
        - queued
        - claimed
        - running
        - verified
        - completed
```

Plan reports now include diagram fields while preserving existing action/assertion/renderer compatibility fields:

```json
{
  "enabledDiagrams": ["OperationLifecycleDiagram"],
  "enabledDiagramPlugins": ["treeseed.scene.diagrams.remotion"],
  "enabledPlugins": [
    "treeseed.scene.browser-actions",
    "treeseed.scene.browser-assertions",
    "treeseed.scene.diagrams.remotion",
    "treeseed.scene.renderer.remotion"
  ]
}
```

Diagram validation diagnostics:

- `scene.diagram_unknown_component`
- `scene.diagram_renderer_mismatch`
- `scene.diagram_invalid_props`
- `scene.diagram_unknown_prop`
- `scene.diagram_invalid_placement`
- `scene.render_missing_diagram`

`trsd scene render --mode diagram-only` is available when the source run and scene include at least one valid diagram. If a chapter is selected, diagram-only rendering includes only diagrams attached to steps in that chapter. Demo, training, and failure-review renders include overlay and interstitial diagrams alongside the existing browser evidence and screenshot fallback.

Remotion remains an adapter host, not the platform contract. The typed diagram provider model is SDK-owned and renderer-aware, but it does not make Remotion mandatory for validation, planning, running, inspect, or resume. Dynamic plugin discovery remains deferred. Provider mutation remains limited to canonical SDK and `trsd` systems.

Phase 7 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts test/utils/scenes-environment.test.ts test/utils/scenes-plugins.test.ts test/utils/scenes-long-workflow.test.ts test/utils/scenes-render.test.ts test/utils/scenes-diagrams.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
rg "Phase 7|Animated Diagram System|central TreeSeed acceptance test harness and demo / educational video generator|OperationLifecycleDiagram|ReconciliationLifecycleDiagram|DevRuntimeTopologyDiagram|SceneExecutionTimelineDiagram|diagram-only|Phase 8" docs/workflow-tester.md
```

`npm -w packages/cli run verify:local` and `npm -w packages/sdk run verify:local` should also be run.

## Phase 8 Implementation Notes

Phase 8 implements deterministic Training And Education Outputs for the central TreeSeed acceptance test harness and demo / educational video generator. The SDK now derives education artifacts from existing scene manifests, run reports, timelines, chapters, segments, checkpoints, overlays, and typed diagrams. It does not call AI models, generate TTS/audio, rerun Playwright, start dev services, apply seeds, authenticate, mutate providers, or use dynamic plugin discovery.

`@treeseed/sdk/scenes` exports:

- `generateTreeseedSceneTrainingOutputs`
- `buildTreeseedSceneTrainingOutputs`
- `writeTreeseedSceneTrainingOutputs`
- `formatTreeseedSceneCaptionsVtt`
- `formatTreeseedSceneCaptionsSrt`
- `formatTreeseedSceneTranscriptMarkdown`
- `formatTreeseedSceneNarrationMarkdown`

`trsd scene training` generates sidecar education artifacts from an existing run:

```bash
trsd scene training <scene.yaml> --from <run-id-or-path> --format json|markdown|vtt|srt --json
```

The `--format` option may be omitted to write the default set: JSON, Markdown, VTT, and SRT. It may also be supplied as a comma-separated subset such as `--format vtt` for caption-only output.

Training artifacts are written under the source run root:

```text
training/
  input.json
  report.json
  captions.vtt
  captions.srt
  transcript.json
  transcript.md
  narration.json
  narration.md
  glossary.json
  glossary.md
  chapter-clips.json
```

The only allowed mutation of existing run artifacts is an additive `run.json.trainingOutputPaths` update. Existing normalized scenes, plans, timelines, progress logs, checkpoints, segments, Playwright traces, screenshots, videos, console logs, network logs, and rendered videos are not rewritten.

Manifest defaults:

```yaml
training:
  enabled: true
  captions:
    enabled: true
    formats:
      - vtt
      - srt
    maxCueSeconds: 6
    renderInTrainingVideo: true
  transcript:
    enabled: true
    formats:
      - json
      - markdown
  narration:
    enabled: true
    style: instructional
    includeDiagnostics: true
  glossary:
    enabled: true
    terms: []
  chapterClips:
    enabled: true
    format: manifest
```

Caption cues are generated from chapter starts, workflow step titles, overlay text, diagram titles, and failure diagnostics. Cue timing uses step timeline events, clamps cue duration to `training.captions.maxCueSeconds`, and writes both VTT and SRT when configured.

Transcript output is deterministic JSON plus Markdown. Entries cover scene title/description, audience, chapters, steps, overlays, diagrams, diagnostics, and failed-step details. Narration scripts are deterministic text only, with `concise`, `instructional`, and `operator` styles. No audio files are generated.

Glossary output merges explicit `training.glossary.terms` with built-in Treeseed concepts detected in scene evidence: reconciliation, operation, checkpoint, segment, managed dev, seed, auth, provider, Remotion, and Playwright. Explicit definitions override built-in definitions.

Chapter clip output is a manifest, not rendered MP4 clips. `chapter-clips.json` records chapter id/title, start/end offsets, duration, step ids, segment ids, and a suggested future output name. Separate chapter video rendering and publishing remain future work.

Training render integration:

- `loadTreeseedSceneRenderInput()` includes generated training data in `renderInput.training`.
- `trsd scene render --mode training` writes training artifacts before render report finalization.
- `TreeseedSceneRenderReport.phase` remains `6`.
- Training render reports include `trainingOutputPaths`.
- The `treeseed-training-default` composition displays generated captions when `training.captions.renderInTrainingVideo` is true.

Built-in training plugin:

- `treeseed.scene.training.deterministic`

It exposes deterministic narration generation and training artifact writers through the existing SDK plugin registry. Planning remains non-mutating and now includes:

```json
{
  "enabledTrainingOutputs": ["captions", "transcript", "narration", "glossary", "chapter-clips"],
  "enabledNarrationPlugins": ["treeseed.scene.training.deterministic"],
  "enabledPlugins": ["treeseed.scene.training.deterministic"]
}
```

Phase 8 diagnostics include:

- `scene.training_invalid_config`
- `scene.training_missing_scene`
- `scene.training_missing_run`
- `scene.training_missing_timeline`
- `scene.training_scene_mismatch`
- `scene.training_write_failed`
- `scene.training_run_update_failed`

Phase 8 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts test/utils/scenes-environment.test.ts test/utils/scenes-plugins.test.ts test/utils/scenes-long-workflow.test.ts test/utils/scenes-render.test.ts test/utils/scenes-diagrams.test.ts test/utils/scenes-training.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
rg "Phase 8|Training And Education Outputs|central TreeSeed acceptance test harness and demo / educational video generator|caption|transcript|narration|glossary|chapter clip|Phase 9" docs/workflow-tester.md
```

`npm -w packages/cli run verify:local` and `npm -w packages/sdk run verify:local` should also pass.

## Phase 9 Implementation Notes

Phase 9 implements CI, Release, And Evidence Integration for the central TreeSeed acceptance test harness and demo / educational video generator. It adds deterministic evidence manifests and local sanitized evidence bundles derived from existing scene run artifacts. Evidence generation does not rerun Playwright, invoke Remotion, start dev services, apply seeds, authenticate, mutate providers, publish externally, or use dynamic plugin discovery.

`@treeseed/sdk/scenes` exports:

- `generateTreeseedSceneEvidence`
- `buildTreeseedSceneEvidenceManifest`
- `writeTreeseedSceneEvidence`
- `formatTreeseedSceneEvidenceMarkdownReport`

`trsd scene evidence` generates downstream evidence from a previous run:

```bash
trsd scene evidence <scene.yaml> --from <run-id-or-path> --target local|ci|release --bundle metadata-only|sanitized --json
```

Defaults:

- `--target local`
- `--bundle sanitized`

Evidence artifacts are written under the source run root:

```text
evidence/
  manifest.json
  report.md
  bundle/
    bundle-manifest.json
    run.json
    report.md
    timeline.json
    setup.json
    progress.jsonl
    training/
      captions.vtt
      transcript.md
      narration.md
      glossary.md
      chapter-clips.json
    render/
      remotion/
        report.json
```

`metadata-only` writes `manifest.json` and `report.md` only. `sanitized` also writes a local bundle with selected safe proof artifacts.

The evidence manifest schema is:

```json
{
  "schemaVersion": "treeseed.scene.evidence/v1",
  "target": "local",
  "bundlePolicy": "sanitized",
  "sceneId": "market-project-deploy-demo",
  "sourceRunId": "run-id",
  "summary": {},
  "artifacts": [],
  "recommendations": []
}
```

Included artifacts are hashed with SHA-256. The sanitized bundle includes run summaries, Markdown reports, timelines, setup/progress metadata, checkpoints, segment metadata, training outputs, render reports, and selected failure screenshots. It excludes raw Playwright traces, raw browser videos, network logs, console logs, error logs, and app logs by default. Excluded artifacts remain visible in `manifest.json` with `includedInBundle: false` and `redactionStatus: "excluded-sensitive"` so CI and release reviewers can see what was intentionally withheld.

Evidence recommendations are deterministic:

- failed runs recommend `trsd scene inspect`
- failed runs with a resumable checkpoint recommend `trsd scene resume`
- runs without training outputs recommend `trsd scene training`
- runs without rendered videos recommend `trsd scene render`
- release-target evidence for a failed workflow includes a blocking recommendation

The only allowed mutation of existing run artifacts is an additive `run.json.evidencePaths` update. Existing normalized scenes, plans, timelines, progress logs, checkpoints, segments, Playwright traces, screenshots, videos, console logs, network logs, rendered videos, and training outputs are not rewritten.

Phase 9 intentionally stops at local manifest and bundle generation. Phase 10 adds local publishing and redaction. Phase 11 adds publish plans and local exports. External apply to docs, training sites, release stores, or remote artifact storage remains deferred to Phase 12+ and must route through reconciled Treeseed workflows rather than provider-specific one-off mutation. Provider mutation remains only through canonical SDK and `trsd` systems.

Phase 9 diagnostics include:

- `scene.evidence_missing_scene`
- `scene.evidence_missing_run`
- `scene.evidence_missing_timeline`
- `scene.evidence_scene_mismatch`
- `scene.evidence_write_failed`
- `scene.evidence_run_update_failed`
- `scene.evidence_bundle_failed`

Phase 9 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts test/utils/scenes-environment.test.ts test/utils/scenes-plugins.test.ts test/utils/scenes-long-workflow.test.ts test/utils/scenes-render.test.ts test/utils/scenes-diagrams.test.ts test/utils/scenes-training.test.ts test/utils/scenes-evidence.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
rg "Phase 9|CI, Release, And Evidence Integration|central TreeSeed acceptance test harness and demo / educational video generator|scene evidence|evidence manifest|sanitized bundle|Phase 10" docs/workflow-tester.md
```

`npm -w packages/cli run verify:local` and `npm -w packages/sdk run verify:local` should also pass.

## Phase 10 Implementation Notes

Phase 10 implements Evidence Publishing And Redaction for the central TreeSeed acceptance test harness and demo / educational video generator. It adds SDK-owned publish manifests, deny-by-default redaction policies, local redacted publish bundles, and local release-evidence export records derived from existing Phase 9 evidence. Publishing does not rerun Playwright, invoke Remotion, generate training outputs, start dev services, apply seeds, authenticate, mutate providers, publish externally, or use dynamic plugin discovery.

`@treeseed/sdk/scenes` exports:

- `publishTreeseedSceneEvidence`
- `buildTreeseedScenePublishManifest`
- `writeTreeseedScenePublish`
- `createDefaultTreeseedSceneRedactionPolicy`
- `validateTreeseedSceneRedactionPolicy`
- `formatTreeseedScenePublishMarkdownReport`

`trsd scene publish` publishes downstream evidence from a previous run:

```bash
trsd scene publish <scene.yaml> --from <run-id-or-path> --target local|release --redaction-policy <path> --json
```

Defaults:

- `--target local`
- no custom redaction policy, which uses the built-in deny-by-default policy

Publish artifacts are written under the source run root:

```text
publish/
  local/
    manifest.json
    report.md
    bundle/
      bundle-manifest.json
      run.json
      report.md
      timeline.json
      setup.json
      progress.jsonl
      training/
      render/
  release/
    manifest.json
    report.md
    bundle/
      bundle-manifest.json
      ...
```

For `--target release`, Phase 10 also writes a local release-evidence export record:

```text
.treeseed/workflow/scene-evidence/<scene-id>/<run-id>.json
```

This record is local generated state for future release/promotion workflows. It is not a GitHub, Railway, Cloudflare, docs, training, or artifact-store mutation.

The publish manifest schema is:

```json
{
  "schemaVersion": "treeseed.scene.publish/v1",
  "phase": 10,
  "target": "local",
  "sourceEvidenceManifestPath": ".treeseed/.../evidence/manifest.json",
  "sourceRunRoot": ".treeseed/.../runs/<scene>/<run>",
  "sceneId": "market-project-deploy-demo",
  "sourceRunId": "run-id",
  "workflowStatus": "passed",
  "redactionPolicy": {},
  "artifacts": [],
  "releaseRecordPath": null,
  "diagnostics": []
}
```

Published artifact records include:

- source path
- published path when copied
- relative path
- SHA-256
- byte size
- redaction decision
- reason

Redaction is deny-by-default. The built-in policy includes only explicit safe artifact kinds:

- run report
- Markdown report
- timeline
- setup summary
- progress events
- segment metadata
- checkpoint metadata
- screenshots already selected by the sanitized evidence bundle
- render reports
- training outputs

The built-in policy excludes raw videos, traces, network logs, console logs, error logs, full app logs, log summaries, and any artifact kind not explicitly allowed. Excluded artifacts remain visible in `publish/<target>/manifest.json` with `decision: "exclude-sensitive"` or `decision: "exclude-not-allowed"` so reviewers can see what was intentionally withheld.

Custom policies may be JSON or YAML:

```yaml
schemaVersion: treeseed.scene.redaction-policy/v1
id: release-safe
mode: deny-by-default
rules:
  - id: include-run-report
    artifactKind: run-report
    include: true
    reason: Run metadata is safe for release evidence.
```

Policy validation requires:

- `schemaVersion: treeseed.scene.redaction-policy/v1`
- `mode: deny-by-default`
- unique rule ids
- valid evidence artifact kinds
- boolean `include`
- non-empty `reason`
- valid optional `allowWhen.target` and `allowWhen.workflowStatus`

Invalid policies block with `scene.publish_redaction_policy_invalid`.

If `evidence/manifest.json` is missing, `trsd scene publish` first generates Phase 9 sanitized evidence from existing run artifacts and emits `scene.publish_generated_evidence` as a warning. It still does not rerun browser workflows or mutate providers.

Release-target publishing blocks failed workflows with `scene.publish_release_blocked`. Local publishing can publish failed evidence for debugging and review. The only allowed mutation of existing run artifacts is an additive `run.json.publishPaths` update. If that update fails after publish artifacts are written, the report remains `ok: true` and includes warning `scene.publish_run_update_failed`.

Phase 10 diagnostics include:

- `scene.publish_missing_evidence`
- `scene.publish_generated_evidence`
- `scene.publish_scene_mismatch`
- `scene.publish_redaction_policy_invalid`
- `scene.publish_no_artifacts`
- `scene.publish_write_failed`
- `scene.publish_run_update_failed`
- `scene.publish_release_blocked`
- `scene.publish_target_unsupported`

Phase 10 intentionally stops at local and release export publishing. Phase 11 turns those redacted publish manifests into publish plans and local exports. Provider mutation remains only through canonical SDK and `trsd` systems.

Phase 10 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts test/utils/scenes-environment.test.ts test/utils/scenes-plugins.test.ts test/utils/scenes-long-workflow.test.ts test/utils/scenes-render.test.ts test/utils/scenes-diagrams.test.ts test/utils/scenes-training.test.ts test/utils/scenes-evidence.test.ts test/utils/scenes-publish.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
rg "Phase 10|Evidence Publishing And Redaction|central TreeSeed acceptance test harness and demo / educational video generator|scene publish|redaction|deny-by-default|Phase 11" docs/workflow-tester.md
```

`npm -w packages/cli run verify:local` and `npm -w packages/sdk run verify:local` should also pass.

## Phase 11 Implementation Notes

Phase 11 implements Docs, Training, And Remote Evidence Publishing as a Plan+Local layer for the central TreeSeed acceptance test harness and demo / educational video generator. It consumes Phase 10 local publish manifests, produces reproducible publication plans, writes local export bundles, and records reconciliation-ready intent objects. It does not upload to docs sites, training sites, release stores, remote artifact stores, GitHub, Railway, Cloudflare, or any provider.

`@treeseed/sdk/scenes` exports:

- `planTreeseedScenePublication`
- `exportTreeseedScenePublication`
- `buildTreeseedScenePublishPlanManifest`
- `writeTreeseedScenePublishPlan`
- `formatTreeseedScenePublishPlanMarkdownReport`

The CLI adds:

```bash
trsd scene publish-plan <scene.yaml> --from <run-id-or-path> --target docs,training,release-evidence,artifact-store --json
trsd scene export <scene.yaml> --from <run-id-or-path> --target docs,training,release-evidence,artifact-store --json
```

Defaults:

- `publish-plan`: `docs,training,release-evidence`
- `export`: `docs,training,release-evidence`
- `artifact-store` is supported as plan-only metadata and never uploads in Phase 11.

Phase 11 artifacts are written under the source run root:

```text
publish-plan/
  manifest.json
  report.md
  export/
    export-manifest.json
    docs/
    training/
    release-evidence/
    artifact-store/
```

The publish-plan manifest schema is:

```json
{
  "schemaVersion": "treeseed.scene.publish-plan/v1",
  "phase": 11,
  "sourcePublishManifestPath": ".treeseed/.../publish/local/manifest.json",
  "sourceRunRoot": ".treeseed/.../runs/<scene>/<run>",
  "sceneId": "market-project-deploy-demo",
  "sourceRunId": "run-id",
  "workflowStatus": "passed",
  "mode": "plan",
  "targets": ["docs", "training", "release-evidence"],
  "destinations": [],
  "artifacts": [],
  "reconciliationIntents": [],
  "diagnostics": []
}
```

Destination behavior:

- `docs`: plans or exports publish reports, evidence reports, training transcript Markdown, glossary Markdown, chapter clip manifests, and render reports for future docs/site reconciliation.
- `training`: plans or exports captions, transcripts, narration scripts, glossary files, chapter clip manifests, and training render reports for future training-content reconciliation.
- `release-evidence`: plans or exports publish/evidence/run reports, timeline, setup, progress, and release-evidence records. Failed workflows block this target with `scene.publish_plan_release_blocked`.
- `artifact-store`: records metadata and reconciliation intent only. It does not upload files in Phase 11.

Every destination includes a reconciliation resource intent:

```json
{
  "type": "scene-evidence-publication",
  "provider": "local",
  "environment": "release",
  "desiredState": {
    "phase": 11,
    "mode": "plan-only"
  }
}
```

Those records are intentionally `action: "plan-only"`. Remote publication apply is Phase 12+, where these desired-state records can be routed through canonical reconciliation adapters after remote retention and artifact-store policy are finalized.

If `publish/local/manifest.json` is missing, Phase 11 calls the existing Phase 10 local publish flow and emits `scene.publish_plan_missing_publish` as a warning. That repair path still consumes existing run/evidence artifacts only; it does not rerun Playwright, invoke Remotion, generate training outputs, start dev services, apply seeds, authenticate, mutate providers, or upload externally.

`trsd scene export` copies only artifacts already included by the Phase 10 redacted publish manifest. It does not copy raw Playwright traces, raw videos, network logs, console logs, error logs, full app logs, or other excluded-sensitive artifacts.

Phase 11 diagnostics include:

- `scene.publish_plan_missing_publish`
- `scene.publish_plan_missing_run`
- `scene.publish_plan_missing_scene`
- `scene.publish_plan_scene_mismatch`
- `scene.publish_plan_target_unsupported`
- `scene.publish_plan_release_blocked`
- `scene.publish_plan_no_artifacts`
- `scene.publish_plan_write_failed`
- `scene.publish_plan_run_update_failed`
- `scene.publish_plan_export_failed`

Dynamic plugin discovery, AI narration, TTS audio generation, remote artifact-store apply, docs-site mutation, training-site mutation, release-store mutation, and provider mutation remain deferred. Provider mutation remains only through canonical SDK and `trsd` systems.

Phase 11 verification should include:

```bash
npm -w packages/sdk exec vitest run --config ./vitest.fast.config.ts test/utils/scenes-phase0.test.ts test/utils/scenes-manifest.test.ts test/utils/scenes-runner.test.ts test/utils/scenes-environment.test.ts test/utils/scenes-plugins.test.ts test/utils/scenes-long-workflow.test.ts test/utils/scenes-render.test.ts test/utils/scenes-diagrams.test.ts test/utils/scenes-training.test.ts test/utils/scenes-evidence.test.ts test/utils/scenes-publish.test.ts test/utils/scenes-publish-plan.test.ts
npm -w packages/sdk run build:dist
npm -w packages/cli run build:dist
node --import tsx packages/cli/scripts/scene-command.test.ts
rg "Phase 11|Docs, Training, And Remote Evidence Publishing|central TreeSeed acceptance test harness and demo / educational video generator|publish-plan|scene export|reconciliation intent|Phase 12" docs/workflow-tester.md
```

`npm -w packages/cli run verify:local` and `npm -w packages/sdk run verify:local` should also pass.

### Phase 7: Animated Diagram System

Implemented scope:

- add diagram plugin/provider interface
- create first built-in Remotion diagrams:
  - operation lifecycle
  - reconciliation lifecycle
  - dev runtime topology
  - scene execution timeline
- validate diagram props during validate and plan
- support diagram overlays, interstitials, standalone diagrams, and diagram-only renders

Acceptance:

- YAML can reference a TypeScript diagram by component id
- diagram renders inside Remotion output
- invalid diagram props fail during scene plan/compile
- `trsd scene render --mode diagram-only` renders typed diagrams from existing run artifacts

### Phase 8: Training And Education Outputs

Implemented scope:

- captions and transcript files
- deterministic narration scripts
- glossary and callout enrichment for training scenes
- chapter clip manifests
- report links to education artifacts
- captions rendered in `treeseed-training-default`
- no AI, no TTS, no browser rerun, and no provider mutation

Acceptance:

- one scene can generate:
  - acceptance report
  - demo MP4
  - training MP4
  - caption/transcript file
  - narration script
  - glossary
  - chapter clip manifest

### Phase 9: CI, Release, And Evidence Integration

Implemented scope:

- generate evidence manifests for local, CI, and release targets
- generate sanitized local evidence bundles from existing run artifacts
- hash included artifacts for reproducible proof
- record excluded sensitive captures in manifest metadata
- provide deterministic inspect, resume, training, and render recommendations
- store scene run evidence paths additively in `run.json`
- keep external evidence publishing deferred to Phase 10+

Acceptance:

- `trsd scene evidence <scene.yaml> --from <run-id-or-path> --target local|ci|release --bundle metadata-only|sanitized --json` exists
- evidence generation consumes previous run artifacts only
- sanitized bundles include selected safe artifacts and exclude sensitive raw captures
- failed release-target evidence includes a blocking recommendation
- scene reports are ready for local and release-target publish manifests without external mutation

### Phase 10: Evidence Publishing And Redaction

Implemented scope:

- publish selected evidence bundles into local and release-target redacted bundles
- add configurable deny-by-default redaction policy files
- integrate scene evidence with local release-evidence export records and promotion summaries
- keep remote docs, training, and artifact-store apply deferred to Phase 12+
- keep provider mutation outside scene publishing

Acceptance:

- evidence publishing is reproducible from manifest and bundle inputs
- redaction policies are validated before publish
- `trsd scene publish <scene.yaml> --from <run-id-or-path> --target local|release --json` exists
- release-target publishing writes a local `.treeseed/workflow/scene-evidence/<scene-id>/<run-id>.json` export record
- failed workflow release publishing blocks clearly
- remote artifact stores remain deferred to reconciled Treeseed provider adapters in Phase 12+

### Phase 11: Docs, Training, And Remote Evidence Publishing

Implemented scope:

- generate publish plans for docs, training, release-evidence, and artifact-store targets
- create local export bundles from Phase 10 redacted publish artifacts
- emit reconciliation-ready resource intent records with `action: plan-only`
- attach no external side effects to planning or export
- keep publishing reproducible from Phase 10 publish manifests

Acceptance:

- `trsd scene publish-plan <scene.yaml> --from <run-id-or-path> --json` exists
- `trsd scene export <scene.yaml> --from <run-id-or-path> --json` exists
- publish plans consume Phase 10 publish manifests and auto-generate local publish manifests when missing
- docs/training/release evidence references can be recreated from local publish manifests
- local exports copy only already-redacted Phase 10 published artifacts
- remote publication apply is deferred to Phase 12 and must use canonical reconciliation adapters

### Phase 12: Remote Publication Apply

Planned scope:

- apply Phase 11 publication intents through canonical reconciliation adapters
- add provider-backed docs, training, release-evidence, and artifact-store publication when remote retention policy is finalized
- keep provider mutation governed by `trsd` desired-state reconciliation

## Testing Strategy

Unit tests:

- manifest parser
- schema validation
- default normalization
- graph compiler
- plugin registry
- artifact path planner
- report writer
- timeline writer

Integration tests:

- runner against static local HTML test app
- runner against existing UI sandbox
- runner against Market local dev when available
- operation polling with mocked API

End-to-end tests:

- `trsd scene validate`
- `trsd scene plan`
- `trsd scene run`
- `trsd scene render` with fixture artifacts

Long workflow tests:

- synthetic many-step scene
- checkpoint/resume behavior
- segmented artifact flushing
- timeout behavior
- partial render after failure

Video tests:

- Remotion composition smoke render
- timeline-to-overlay mapping
- diagram prop validation
- render-only from existing artifacts

## Dependency Strategy

Decisions:

- Use the existing `yaml` package style for manifest parsing.
- Add Playwright only where the runner executes.
- Avoid making Remotion a required dependency for basic scene validation and Playwright acceptance if possible.
- Consider a separate internal renderer package if dependency weight becomes too large.
- Keep command registration in `@treeseed/cli`, but execution code in `@treeseed/sdk`.

Possible future split:

```text
@treeseed/sdk
@treeseed/cli
@treeseed/scene-remotion
```

Do not create this split immediately unless package size or dependency conflicts force it. The first architecture should keep renderer boundaries clear enough that the split remains possible.

## Security And Safety

- Scene manifests must not contain plaintext secrets.
- Auth uses Treeseed config/auth flows.
- Setup actions must not print decrypted provider environments.
- Browser traces may contain sensitive UI data and should be treated as local artifacts by default.
- Published training/demo artifacts must support redaction later.
- Scenes targeting production must require explicit opt-in and should default to read-only workflows.
- Provider mutations must go through existing Treeseed workflows.

Scene artifacts are operational evidence. Treat them like logs: useful, potentially sensitive, and unsuitable for broad publication until reviewed or redacted.

## Open Questions

- What is the final selector naming convention: `data-scene`, `data-testid`, or both?
- What retention policy should apply to remote scene evidence?
- Which canonical Market workflow should become the first long demo scene?
- What retention policy should apply to large video artifacts?
- Should the runner support remote browser execution later?
- Which provider-specific artifact-store target should own remote scene evidence once Phase 12 applies publication intents?

## Initial Scene Catalog

Likely first scenes:

- `market-project-deploy-demo`
- `market-guided-start`
- `market-team-and-hosts`
- `market-capacity-overview`
- `market-knowledge-publish`
- `admin-secret-manager`
- `ui-component-visual-smoke`
- `agent-workday-demo`
- `reconciliation-platform-explainer`

`market-project-deploy-demo` is the first recommended end-to-end candidate because it aligns with `docs/demo.md` and exercises project navigation, deployment controls, operation visibility, and history.

## Acceptance Criteria For This Documentation Change

This documentation change is complete when:

- `docs/workflow-tester.md` exists.
- It explains purpose, ownership, architecture, command surface, manifest model, plugin architecture, Remotion renderer architecture, long workflow orchestration, artifact contracts, and phases.
- It follows Treeseed package boundaries and CLI naming conventions.
- It does not imply provider mutation outside canonical `trsd`/SDK workflows.
- It frames Remotion as the first renderer plugin, not a hard-coded mandatory path for every test.
- It includes enough implementation detail for a future engineer or agent to begin Phase 1 without making major architectural decisions.
