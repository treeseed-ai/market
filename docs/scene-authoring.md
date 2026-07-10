# TreeSeed Scene Authoring Guide

This is the canonical authoring guide for designing TreeSeed scenes as the central TreeSeed acceptance test harness and demo / educational video generator.

A scene is one executable workflow manifest that can produce many outputs: browser acceptance evidence, Playwright recordings, screenshots, timelines, rendered MP4 demos, training captions, transcripts, narration scripts, glossary entries, evidence manifests, sanitized publish bundles, publication plans, and local exports.

## Quick Start

Start local dev:

```bash
npx trsd dev start --web-runtime local --json
```

Validate and plan a scene:

```bash
npx trsd scene validate scenes/my-scene.yaml --json
npx trsd scene plan scenes/my-scene.yaml --environment local --json
```

Run and render:

```bash
npx trsd scene run scenes/my-scene.yaml --environment local --record --mode training --device desktop --json
npx trsd scene inspect <run-root> --json
npx trsd scene render scenes/my-scene.yaml --from <run-root> --mode training --json
```

Generate downstream artifacts:

```bash
npx trsd scene training scenes/my-scene.yaml --from <run-root> --json
npx trsd scene evidence scenes/my-scene.yaml --from <run-root> --target local --bundle sanitized --json
npx trsd scene publish scenes/my-scene.yaml --from <run-root> --target local --json
npx trsd scene publish-plan scenes/my-scene.yaml --from <run-root> --json
npx trsd scene export scenes/my-scene.yaml --from <run-root> --json
```

Create a UI screenshot review matrix instead of a video:

```bash
npx trsd scene visual-audit scenes/site-visual-audit.yaml \
  --environment local \
  --roles anonymous,owner,admin,member \
  --device all \
  --json
```

Run every configured device profile:

```bash
npx trsd scene run scenes/my-scene.yaml --environment local --record --mode training --device all --json
```

## Scene Lifecycle

`validate` parses YAML, normalizes defaults, checks selectors, actions, assertions, devices, overlays, diagrams, training config, and references.

`plan` compiles a deterministic report without mutation. It lists workflow steps, enabled actions, assertions, renderers, diagram plugins, training outputs, devices, plugins, artifact paths, and diagnostics.

`run` executes the browser workflow with Playwright, captures run artifacts, writes checkpoints, records video when requested, and stores reports under `.treeseed/scenes/runs/<scene-id>/<timestamp>-<run-id>/`.

`resume` continues from a checkpoint when a long scene fails or needs manual intervention.

`inspect` reads run artifacts, steps, diagnostics, checkpoints, traces, screenshots, videos, timeline, and logs.

`render` consumes existing run artifacts. It does not rerun Playwright. Remotion is the first renderer adapter and remains downstream of SDK render input.

`training` writes deterministic captions, transcripts, narration scripts, glossary, and chapter clip manifests. It does not use AI or TTS.

`evidence` writes an evidence manifest, Markdown report, and optional sanitized local bundle.

`publish` writes a deny-by-default redacted local or release publish bundle. Release target writes local release evidence records only.

`publish-plan` and `export` turn redacted publish bundles into plan-only docs, training, release-evidence, and artifact-store publication intents. No external store is mutated.

## Complete Manifest Reference

Core fields:

```yaml
schemaVersion: treeseed.scene/v1
id: my-scene
title: My Scene
description: What the workflow proves.
audience:
  - operator
  - trainee
```

`mode` declares intent:

```yaml
mode:
  test: true
  demo: true
  training: true
```

`target` defines the app and default browser context:

```yaml
target:
  app: market
  environment: local
  baseUrl: auto
  browser: chromium
  viewport:
    width: 1600
    height: 900
```

`devices` defines desktop, tablet, mobile, or custom walkthrough profiles:

```yaml
devices:
  defaultProfile: desktop
  profiles:
    - id: desktop
      title: Desktop
      orientation: landscape
      viewport: { width: 1600, height: 900 }
      video: { width: 1600, height: 900 }
      output: { width: 1920, height: 1080 }
      deviceScaleFactor: 1
      isMobile: false
      hasTouch: false
    - id: tablet
      title: Tablet
      orientation: landscape
      viewport: { width: 1024, height: 768 }
      video: { width: 1024, height: 768 }
      output: { width: 1440, height: 1080 }
      isMobile: true
      hasTouch: true
    - id: mobile
      title: Mobile
      orientation: portrait
      viewport: { width: 390, height: 844 }
      video: { width: 390, height: 844 }
      output: { width: 1080, height: 1920 }
      deviceScaleFactor: 2
      isMobile: true
      hasTouch: true
```

`setup` may require managed local dev:

```yaml
setup:
  dev:
    required: true
    command: trsd dev start --web-runtime local --json
    reuseExisting: true
```

`artifacts` controls run evidence:

```yaml
artifacts:
  trace: true
  video: true
  screenshots: true
  console: true
  network: true
  timeline: true
  appLogs: true
```

For scenes used by active guarantees, declare the service journey contract:

```yaml
journey:
  kind: service
  proves:
    - user can create a project
    - project appears in the project list
  minimumSteps: 3
  requiresInteractiveAction: true
  producesState:
    - key: project.primary
      kind: project
  consumesState:
    - key: auth.owner
      kind: user
```

Active guarantee scenes must prove a workflow, not just a route. Include a `goto`, interactive actions, assertions on each acceptance step, and enough distinct steps for the reviewer to inspect the journey. Use `data-scene`, `data-testid`, role/name, label, or text selectors. Raw CSS selectors should be marked internal or brittle and avoided for release-facing guarantee proof.

Scene runs capture a full-page screenshot after every executed step. Viewport screenshots are internal debug/render fallback artifacts and should not be treated as primary reviewer evidence.

`runtime` controls long scenes:

```yaml
runtime:
  mode: training
  checkpoints:
    enabled: true
    defaultResumable: true
    everyStep: true
  failure:
    continueOnFailure: true
```

`workflow` is the executable step list. `chapters` group steps for reports, captions, training, and video structure. `overlays` add video callouts and animated visual objects. `diagrams` add typed animated diagram components. `render` configures Remotion output and capture. `training` configures captions, transcript, narration script, glossary, and chapter clip manifests.

`visualAudit` configures the screenshot review matrix:

```yaml
visualAudit:
  enabled: true
  roles:
    - anonymous
    - owner
    - admin
    - member
  pathRoots:
    - /
    - /auth
    - /market
    - /app
  pathGlobs:
    - /app/projects/**
    - '**/settings'
  excludePathGlobs:
    - '**/delete'
    - /auth/callback/**
  includeFullPage: false
  review:
    enabled: true
    detail: standard
    maxFindings: 250
    contactSheets: true
  routeDiscovery:
    core: true
    admin: true
    tenantOverrides: true
    contentCollections: true
```

When `pathRoots`, `pathGlobs`, and `excludePathGlobs` are empty, visual audit captures all discovered user-facing routes. Use `pathRoots` for broad route families such as `/app/projects` or `/auth`; use `pathGlobs` for precise include filters such as `/app/projects/**`, `**/settings`, or `/market/templates/*`; use `excludePathGlobs` to remove known irrelevant paths such as `**/delete` or `/auth/callback/**`. `includeFullPage: false` is the recommended default because viewport screenshots show the actual browser window; full-page screenshots are debugging supplements. Review output is enabled by default and generates deterministic functional, client-error, display, and architecture findings plus an agent repair brief.

## Selectors

Prefer selectors in this order:

1. `scene`
2. `testId`
3. `role`
4. `text`
5. `css`

Example:

```yaml
action:
  click:
    role: button
    name: Create project
```

Raw CSS selectors should be marked when unstable:

```yaml
action:
  fill:
    css: input[name="email"]
    brittle: true
    value: user@example.test
```

Use `internal: true` when a CSS selector intentionally targets implementation detail that is acceptable for a local diagnostic scene.

## Actions

Supported actions:

- `goto`: navigate to an absolute URL or path relative to `target.baseUrl`.
- `click`: click a selector.
- `fill`: fill a selector with text.
- `select`: choose a dropdown option by `value` or `label`.
- `keyboard`: press a key such as `Enter`.
- `pause`: wait for a duration or manual checkpoint.
- `mailpitConfirmLatest`: confirm the latest local Mailpit email for a generated address.
- `waitForOperation`: wait for a TreeSeed operation when a workflow exposes an operation id.
- `apiRequest`: manifest-valid but runtime-deferred unless a future SDK plugin implements the request path.

Keep product demos browser-first. Use `apiRequest` only to document future capability or when the runtime plugin is present.

## Expectations

Supported expectations:

- `visible`: one or more selectors must be visible.
- `text`: page text must be present.
- `urlIncludes`: the current URL must include a substring.
- `operation`: a TreeSeed operation must satisfy the expected state.

Every acceptance step should have an expectation unless it is explicitly `demoOnly`.

## Workflow Design Patterns

Acceptance scenes should be narrow, deterministic, and selector-stable.

Demo scenes should use real workflows, visible overlays, chapters, and training captions.

Training scenes should enable `runtime.mode: training`, captions, transcript, narration scripts, glossary, diagrams, and chapter clip manifests.

Failure-review scenes should keep enough evidence to explain what failed and how to resume.

Long-running scenes should use chapters, segments, checkpoints, progress heartbeats, and `continueOnFailure` only when the goal is diagnostic video evidence.

Product-gap capture scenes should show the expected behavior and the observed gap in an overlay rather than pretending unsupported behavior exists.

## Device Profiles

Device walkthroughs are separate runs, not one combined MP4. This keeps capture dimensions stable and realistic.

Defaults:

- `desktop`: viewport/video `1600x900`, output `1920x1080`
- `tablet`: viewport/video `1024x768`, output `1440x1080`
- `mobile`: viewport/video `390x844`, output `1080x1920`

Run one profile:

```bash
npx trsd scene run scenes/my-scene.yaml --record --mode training --device mobile --json
```

Run the matrix:

```bash
npx trsd scene run scenes/my-scene.yaml --record --mode training --device all --json
```

Render from a recorded run:

```bash
npx trsd scene render scenes/my-scene.yaml --from <run-root> --mode training --json
```

The run metadata records the selected profile. Rendering uses the run device output by default. Passing `--device` to render asserts that the requested profile matches the source run.

Fixed-browser evidence prevents resizing and flicker by recording a fixed Playwright video size and rendering that video inside a stable evidence rectangle. Viewport screenshots are fallback. Full-page screenshots are evidence/debugging artifacts and should not drive the normal video frame.

## Artifacts And Evidence

Run roots contain:

```text
run.json
scene.normalized.json
scene.plan.json
timeline.json
progress.jsonl
playwright/
  screenshots/
  screenshots/viewport/
  videos/
  traces/
checkpoints/
segments/
render/
training/
evidence/
publish/
publish-plan/
```

Playwright video is the primary visual evidence for rendered workflow playback. Viewport screenshots are the render fallback. Full-page screenshots remain useful for debugging tall pages, but they can make a video look shrunken if used as primary media.

Evidence manifests record included and excluded artifacts. Sanitized bundles include reports, timeline, setup, progress, selected screenshots, render reports, and training output. Raw traces, raw videos, network logs, console logs, and full app logs are excluded by default until redaction policy can safely handle them.

Visual audit artifacts are separate from run roots:

```text
.treeseed/scenes/visual-audits/<scene-id>/<timestamp>-<audit-id>/
  manifest.json
  report.md
  screenshots/
    anonymous/
      desktop/
      tablet/
      mobile/
    owner/
    admin/
    member/
  full-page/
    ... only when --full-page is used
```

`manifest.json` records every discovered route and every capture with role, device, path root, final URL, status, HTTP status, screenshot path, and diagnostics. `report.md` groups captures by path root so design and QA review can scan by product area.

For local authenticated visual audits, fixture users and seeded team/project records are created through the API-owned `/v1/acceptance/seed` route using the configured Treeseed service credential. This keeps API and PostgreSQL mutation in `@treeseed/api`. The scene SDK uses those seeded users only to establish browser sessions and capture screenshots.

## Rendering

Render modes:

- `demo`
- `training`
- `failure-review`
- `chapter`
- `diagram-only`

Remotion is adapter-hosted. The SDK builds render input, stages media, selects the composition, and writes reports. The renderer consumes existing run artifacts and never reruns the browser workflow.

MP4 is the standard output. Local Playwright video is staged into the Remotion public directory rather than referenced by `file://`. When ffmpeg is available, video normalization can make browser evidence more stable.

Recommended render capture:

```yaml
render:
  remotion:
    output:
      format: mp4
      fps: 30
      resolution: { width: 1920, height: 1080 }
    capture:
      viewport: { width: 1600, height: 900 }
      video: { width: 1600, height: 900 }
      evidenceFit: fixed-browser
    browserFrame:
      enabled: false
```

## Overlays

Overlay variants:

- `callout`
- `spotlight`
- `label`
- `panel`
- `lower-third`
- `badge`
- `cursor`
- `custom`

Regions:

- `top-left`, `top`, `top-right`
- `left`, `center`, `right`
- `bottom-left`, `bottom`, `bottom-right`

Style fields include `tone`, `background`, `color`, `borderColor`, `borderWidth`, `radius`, `shadow`, and `opacity`.

Motion uses renderer-portable keyframes:

```yaml
overlays:
  - id: explain-submit
    at: submit-form
    renderer: remotion
    type: callout
    variant: panel
    region: top-right
    durationSeconds: 7
    style:
      tone: info
      shadow: medium
    motion:
      keyframes:
        - at: 0
          unit: progress
          opacity: 0
          position: { x: 102, y: 10, unit: percent }
        - at: 0.2
          unit: progress
          opacity: 1
          position: { x: 78, y: 10, unit: percent }
        - at: 1
          unit: progress
          opacity: 1
          position: { x: 78, y: 10, unit: percent }
    objects:
      - id: cursor
        type: cursor
        position: { x: 70, y: 48, unit: percent }
        motion:
          keyframes:
            - at: 0
              unit: progress
              position: { x: 62, y: 45, unit: percent }
            - at: 1
              unit: progress
              position: { x: 70, y: 48, unit: percent }
    text: Submit creates the operation that the rest of the scene observes.
```

Visual object types:

- `text`
- `box`
- `circle`
- `line`
- `arrow`
- `badge`
- `cursor`
- `spotlight`

Keep overlays short, high contrast, and out of the primary click target. Captions use the lower safe area, lower thirds default to bottom-left, and callouts default to top-right.

## Diagrams

Built-in provider:

```text
treeseed.scene.diagrams.remotion
```

Components:

- `OperationLifecycleDiagram`
- `ReconciliationLifecycleDiagram`
- `DevRuntimeTopologyDiagram`
- `SceneExecutionTimelineDiagram`

Placements:

- `overlay`
- `interstitial`
- `standalone`

Diagram props are typed and validated during validate, plan, and render input loading. Diagram objects and motion use the same visual model as overlays:

```yaml
diagrams:
  - id: runtime
    renderer: remotion
    component: DevRuntimeTopologyDiagram
    at: open-mailpit
    placement: overlay
    durationSeconds: 12
    motion:
      keyframes:
        - at: 0
          unit: progress
          opacity: 0
          scale: 0.96
        - at: 0.2
          unit: progress
          opacity: 1
          scale: 1
    objects:
      - id: mail-arrow
        type: arrow
        from: { x: 18, y: 80, unit: percent }
        to: { x: 84, y: 80, unit: percent }
        style: { tone: brand }
    props:
      title: Local runtime
```

## Training Outputs

Training output generation is deterministic:

- captions: VTT and SRT
- transcript: JSON and Markdown
- narration scripts: deterministic text only
- glossary: explicit and detected TreeSeed terms
- chapter clip manifests: JSON manifests, not separate MP4 clips

No AI model calls, TTS, or audio files are generated.

## Publishing Flow

`evidence` creates the evidence manifest and sanitized bundle.

`publish` creates a redacted local or release-target bundle using a deny-by-default policy.

`publish-plan` creates docs, training, release-evidence, and artifact-store publication plans from Phase 10 publish manifests.

`export` copies already-redacted published artifacts into target-specific local export folders.

Phase 11 does not mutate external docs, training sites, release stores, object storage, GitHub, Railway, Cloudflare, or providers. External apply remains Phase 12+ and must route through canonical TreeSeed reconciliation.

## CLI Reference

Status:

```bash
npx trsd scene status --json
```

Validation and planning:

```bash
npx trsd scene validate <scene.yaml> --json
npx trsd scene plan <scene.yaml> --environment local|staging|prod --json
```

Run:

```bash
npx trsd scene run <scene.yaml> --environment local|staging|prod --record --mode acceptance|demo|training --device desktop|tablet|mobile|all --json
```

Inspect and resume:

```bash
npx trsd scene inspect <run-id-or-path> --json
npx trsd scene resume <run-id-or-path> --from-checkpoint <checkpoint-id> --json
```

Render:

```bash
npx trsd scene render <scene.yaml> --from <run-id-or-path> --mode demo|training|failure-review|chapter|diagram-only --device <profile> --json
```

Visual audit screenshots:

```bash
npx trsd scene visual-audit <scene.yaml> --environment local --roles anonymous,owner,admin,member --device desktop|tablet|mobile|all --path-root /app,/auth,/market --path /app/projects/** --exclude-path **/delete --review-detail standard --json
```

`trsd scene visual-audit` produces a screenshot review matrix instead of a video. It discovers user-facing routes, groups them by path root, captures viewport screenshots for each requested role and device, and writes `manifest.json` plus `report.md` under `.treeseed/scenes/visual-audits/<scene-id>/<timestamp>-<audit-id>/`. It also writes `review/summary.json`, `review/findings.json`, `review/findings.md`, `review/agent-brief.md`, `review/client-errors.jsonl`, and HTML contact sheets by default. Use `--full-page` only when you need debug screenshots; viewport screenshots are the source of truth for look-and-feel review because they show what is actually visible in the browser window.

Common visual-audit variants:

```bash
# Full default local matrix.
npx trsd scene visual-audit scenes/site-visual-audit.yaml --environment local --roles anonymous,owner,admin,member --device all --json

# Public/auth/market routes only.
npx trsd scene visual-audit scenes/site-visual-audit.yaml --environment local --roles anonymous --device all --path-root /,/auth,/market,/books --json

# Authenticated app review for one role/device.
npx trsd scene visual-audit scenes/site-visual-audit.yaml --environment local --roles owner --device desktop --path-root /app --json

# Focus one app route family with glob includes and exclusions.
npx trsd scene visual-audit scenes/site-visual-audit.yaml --environment local --roles owner --device mobile --path /app/projects/** --exclude-path '**/delete,**/deploy' --review-detail full --json

# Review all settings pages across route roots.
npx trsd scene visual-audit scenes/site-visual-audit.yaml --environment local --roles owner,admin --device desktop --path '**/settings' --json

# Full detail review for agent handoff.
npx trsd scene visual-audit scenes/site-visual-audit.yaml --environment local --roles anonymous,owner,admin,member --device all --review-detail full --max-findings 500 --json

# Screenshot capture only, without findings/contact sheets.
npx trsd scene visual-audit scenes/site-visual-audit.yaml --environment local --roles anonymous --device desktop --no-review --json

# Add debug-only full-page screenshots.
npx trsd scene visual-audit scenes/site-visual-audit.yaml --environment local --roles anonymous --device desktop --full-page --json
```

Training, evidence, publish, plan, and export:

```bash
npx trsd scene training <scene.yaml> --from <run-id-or-path> --format json,markdown,vtt,srt --json
npx trsd scene evidence <scene.yaml> --from <run-id-or-path> --target local|ci|release --bundle metadata-only|sanitized --json
npx trsd scene publish <scene.yaml> --from <run-id-or-path> --target local|release --redaction-policy <path> --json
npx trsd scene publish-plan <scene.yaml> --from <run-id-or-path> --target docs,training,release-evidence,artifact-store --json
npx trsd scene export <scene.yaml> --from <run-id-or-path> --target docs,training,release-evidence,artifact-store --json
```

JSON output is intended for agents and CI. Human output names the created paths and summarizes failures with stable diagnostic codes.

## Authoring Checklist

- Use stable `scene` or `testId` selectors whenever possible.
- Add chapters for scenes longer than a few steps.
- Enable video and screenshots for demos and diagnostics.
- Use desktop, tablet, and mobile device profiles for user-facing walkthroughs.
- Keep Playwright video primary and screenshots as fallback.
- Add overlays only where they explain what the viewer is seeing.
- Use diagrams for lifecycle, topology, timeline, or reconciliation concepts.
- Enable training outputs for educational videos.
- Add product-gap overlays instead of faking unsupported flows.
- Keep setup and provider mutation routed through canonical SDK and `trsd` systems.

## Troubleshooting

Registration/auth: verify local dev is running, Mailpit is reachable, and the test user is unique.

Mailpit: clear old messages before registration or use `mailpitConfirmLatest` with the generated email.

Missing video: run with `--record`, check `run.json.videoPaths`, and inspect Playwright video artifacts.

Screenshot fallback: viewport screenshots should drive fallback rendering. Full-page screenshots are for debugging.

Aspect mismatch: align device video and output aspect ratios or expect fixed-browser padding.

Render slowness: render from existing runs, keep diagrams short, and avoid unnecessary long pauses.

Missing selectors: add stable `data-scene` attributes in product UI rather than hardening raw CSS in the scene.

Failed operations: inspect the failed step, operation id, console/network diagnostics, and checkpoints.

Resume: use `trsd scene resume <run> --from-checkpoint <checkpoint-id> --json`.

Visual audit auth: authenticated local roles are seeded through the API acceptance seed route and then loaded into Playwright with the normal `ts_market_api_access` app cookie. If all authenticated captures skip, check that `npx trsd dev start --web-runtime local --force --json` has the web, API, and API-owned PostgreSQL service running. API/database-related fixture failures should be fixed in `@treeseed/api`, not by SDK-side database writes.

Visual audit scope: a full `anonymous,owner,admin,member` by `desktop,tablet,mobile` audit can produce more than a thousand screenshots. Use `--path-root` for broad sections, `--path` for include globs, `--exclude-path` for route exclusions, and a single `--roles`/`--device` value for focused iteration. Then run the full matrix before design review.

## Full Example

```yaml
schemaVersion: treeseed.scene/v1
id: portfolio-demo
title: Portfolio Demo
description: Register a user and create a portfolio project.
audience: [operator, trainee]
mode:
  test: false
  demo: true
  training: true
target:
  app: market
  environment: local
  baseUrl: auto
  browser: chromium
  viewport: { width: 1600, height: 900 }
devices:
  defaultProfile: desktop
  profiles:
    - id: desktop
      viewport: { width: 1600, height: 900 }
      video: { width: 1600, height: 900 }
      output: { width: 1920, height: 1080 }
    - id: mobile
      orientation: portrait
      viewport: { width: 390, height: 844 }
      video: { width: 390, height: 844 }
      output: { width: 1080, height: 1920 }
      deviceScaleFactor: 2
      isMobile: true
      hasTouch: true
artifacts:
  video: true
  screenshots: true
  timeline: true
runtime:
  mode: training
  checkpoints:
    enabled: true
    defaultResumable: true
render:
  remotion:
    output:
      format: mp4
      fps: 30
      resolution: { width: 1920, height: 1080 }
    capture:
      viewport: { width: 1600, height: 900 }
      video: { width: 1600, height: 900 }
      evidenceFit: fixed-browser
chapters:
  - id: registration
    title: Registration
    startsAt: open-register
overlays:
  - id: explain
    at: open-register
    renderer: remotion
    type: callout
    variant: panel
    region: top-right
    style: { tone: brand, shadow: medium }
    motion:
      keyframes:
        - at: 0
          unit: progress
          opacity: 0
          position: { x: 102, y: 10, unit: percent }
        - at: 0.2
          unit: progress
          opacity: 1
          position: { x: 80, y: 10, unit: percent }
    objects:
      - id: pulse
        type: circle
        position: { x: 8, y: 20 }
        size: { width: 12, height: 12 }
        style: { tone: success }
    text: This workflow proves registration and portfolio setup.
diagrams:
  - id: lifecycle
    renderer: remotion
    component: OperationLifecycleDiagram
    at: open-register
    placement: overlay
    props:
      states: [queued, running, verified]
training:
  enabled: true
  captions:
    enabled: true
    formats: [vtt, srt]
    maxCueSeconds: 6
    renderInTrainingVideo: true
  transcript:
    enabled: true
    formats: [json, markdown]
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
workflow:
  - id: open-register
    title: Open registration
    action:
      goto: /auth/register?returnTo=/app
    expect:
      text: Create account
```

## Portfolio Demo Reference

Use `scenes/team-project-portfolio-demo.yaml` as the current real scenario. Generate the local copy first:

```bash
node --import tsx scenes/team-project-portfolio-demo.generate.ts
```

Desktop:

```bash
npx trsd scene run .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --record --mode training --device desktop --json
```

Tablet:

```bash
npx trsd scene run .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --record --mode training --device tablet --json
```

Mobile:

```bash
npx trsd scene run .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --record --mode training --device mobile --json
```

Matrix:

```bash
npx trsd scene run .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --record --mode training --device all --json
```

Each profile creates a separate run root and a separate renderable video. Mobile output is portrait.

## Visual Audit Reference

Use `scenes/site-visual-audit.yaml` for broad look-and-feel review across TreeSeed’s user-facing pages. It is not a video scene and does not run Remotion, training, evidence, publish, or export flows. It is designed for UI QA, visual regression triage, and design review.

Review output is deterministic and local. It does not call AI services. It analyzes capture status, final URLs, HTTP status, browser console/page/request errors, DOM summaries, visible error text, horizontal overflow, default-looking links/buttons, seeded fixture visibility, and repeated architecture-level patterns.

Start review from the prioritized issue queue:

```text
review/query/top-priority.json
```

This file combines root causes and deduplicated client-error incidents, sorted by deterministic priority score. Priority combines severity, frequency, affected path count, affected role/device spread, category, and suspected package owner. Use it as the first one-by-one repair queue.

The most important human-readable review file is:

```text
review/agent-brief.md
```

Use it as the handoff document for AI repair agents. It prioritizes client-side errors first, then high-severity functional/access issues, then shared styling/display regressions. It explicitly encourages reusable architecture fixes:

- shared controls, links, buttons, forms, and editor styling belong in `@treeseed/ui`
- admin route composition, app shell, client initialization, auth, and access belong in `@treeseed/admin`
- public/book style loading belongs in `@treeseed/core`
- tenant branding belongs in `@treeseed/market`
- fixture, auth session, and PostgreSQL-backed data issues belong in `@treeseed/api`

The default scene discovers:

- core public routes
- admin auth and app routes
- root tenant override pages
- content-backed public routes
- fixture-backed app entity routes such as visual-audit team and project pages

The default local roles are:

- `anonymous`
- `owner` using `visual.owner@treeseed.io`
- `admin` using `visual.admin@treeseed.io`
- `member` using `visual.member@treeseed.io`

The deterministic password is:

```text
TreeSeedVisualAudit!2026
```

Authenticated fixture records are seeded through `@treeseed/api` using `/v1/acceptance/seed`; this creates verified users, a `visual-audit` team, a `visual-audit-project`, and related app data. The SDK does not write directly to PostgreSQL.

Review controls:

```bash
--review                 # enabled by default
--no-review              # screenshots and base report only
--review-detail summary  # blocking/high findings only
--review-detail standard # normal deterministic review
--review-detail full     # include richer client/display evidence
--max-findings 250       # cap detailed finding output
--fresh-dev              # restart local managed dev before audit to avoid stale Vite/module graph failures
```

Review artifacts:

```text
review/
  summary.json
  issue-index.json
  root-causes.json
  root-causes.jsonl
  incidents.json
  incidents.jsonl
  findings.json
  findings.jsonl
  findings.md
  agent-brief.md
  client-errors.jsonl
  routes.json
  query/
    top-priority.json
    by-owner.json
    by-path-root.json
    by-route.json
    by-role.json
    by-device.json
    by-code.json
    by-priority.json
  owner-briefs/
    treeseed-ui.md
    treeseed-admin.md
    treeseed-core.md
    treeseed-api.md
    treeseed-market.md
    unknown.md
  contact-sheets/
    index.html
    flagged.html
    root-causes.html
    <path-root>.html
```

Use `root-causes.json` for package-level repair assignments. Use `incidents.json` for deduplicated browser/runtime failures. Use `client-errors.jsonl` only as forensic raw evidence; browser console, HTTP, and aborted request events can duplicate the same route failure. The visual-audit review preserves raw client errors, but the primary work queue is `query/top-priority.json`.

If a full local audit suddenly reports hundreds or thousands of HTTP 500/client errors, rerun with `--fresh-dev`. Visual audit includes a preflight gate for local runs and will block early with `scene.visual_audit_environment_unhealthy` when representative pages show Astro/Vite/module-resolution failures. This prevents stale dev-server state from flooding the review with misleading page-level issues.

Recent smoke shape:

```text
Roles: anonymous, owner, admin, member
Devices: desktop, tablet, mobile
Routes: 110
Captures: 1185
Failed: 0
Skipped: 0
```
