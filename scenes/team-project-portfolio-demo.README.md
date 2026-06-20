# Team Project Portfolio Demo Scene

This scene is a real local probe for the central TreeSeed acceptance test harness and demo / educational video generator. It registers a normal user, confirms email through Mailpit, opens `/app`, creates the TreeSeed team, attempts a Bylaws project launch from the research template, and captures the current SDK linked-project gap.

It is intentionally not a polished golden-path demo. The goal is to produce useful video and evidence while exposing gaps in selectors, admin flows, project launch, Mailpit confirmation, rendering, training outputs, evidence, publishing, and export.

## Files

- `scenes/team-project-portfolio-demo.yaml` is the tracked scene template.
- `scenes/team-project-portfolio-demo.generate.mjs` writes a runnable local copy with a generated user and current local URLs.
- Generated scenes are written to `.treeseed/scenes/generated/team-project-portfolio-demo.local.yaml`.
- The generator clears the local Mailpit inbox before registration through `DELETE /api/v1/messages` so the newest confirmation message is unambiguous. Set `TREESEED_SCENE_CLEAR_MAILPIT=false` to skip cleanup.

## Run

Start local dev first:

```bash
npx trsd dev start --web-runtime local --json
```

Generate the runnable local scene:

```bash
node scenes/team-project-portfolio-demo.generate.mjs
```

Validate and plan:

```bash
npx trsd scene validate .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --json
npx trsd scene plan .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --json
```

Run the browser workflow and capture artifacts:

```bash
npx trsd scene run .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --record --mode training --json
```

Run a specific device profile:

```bash
npx trsd scene run .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --record --mode training --device desktop --json
npx trsd scene run .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --record --mode training --device tablet --json
npx trsd scene run .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --record --mode training --device mobile --json
```

Run the device matrix:

```bash
npx trsd scene run .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --environment local --record --mode training --device all --json
```

Each device profile creates its own normal run root. Desktop renders to `1920x1080`, tablet renders to `1440x1080`, and mobile renders to portrait `1080x1920`.

Then use the reported run root:

```bash
npx trsd scene inspect <run-root> --json
npx trsd scene render .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --from <run-root> --mode training --json
npx trsd scene training .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --from <run-root> --json
npx trsd scene evidence .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --from <run-root> --target local --bundle sanitized --json
npx trsd scene publish .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --from <run-root> --target local --json
npx trsd scene publish-plan .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --from <run-root> --json
npx trsd scene export .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --from <run-root> --json
```

Rendering normally uses the device metadata recorded in the run. You can pass `--device <profile>` to assert the render matches the expected source profile:

```bash
npx trsd scene render .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --from <desktop-run-root> --mode training --device desktop --json
npx trsd scene render .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --from <tablet-run-root> --mode training --device tablet --json
npx trsd scene render .treeseed/scenes/generated/team-project-portfolio-demo.local.yaml --from <mobile-run-root> --mode training --device mobile --json
```

## Expected Artifacts

A successful or partially successful run should produce:

- `run.json`
- `timeline.json`
- screenshots
- Playwright video when available
- checkpoints
- `progress.jsonl`
- `render/remotion/output.mp4`
- device-specific MP4 dimensions from the recorded profile
- `training/captions.vtt`
- `training/transcript.md`
- `training/narration.md`
- `training/glossary.md`
- `evidence/manifest.json`
- `publish/local/manifest.json`
- `publish-plan/manifest.json`
- `publish-plan/export/`

## Expected Gaps

Mailpit confirmation is attempted through browser selectors against the Mailpit UI after the generator clears older messages. Those selectors are intentionally marked brittle because Mailpit is not a TreeSeed-owned UI surface. If confirmation fails, open the generated email manually in Mailpit, follow the confirmation link, then resume from a checkpoint or rerun the later scene steps after auth is established.

The SDK linked software project requirement is captured as a visible scene gap. The intended product behavior is:

- Create a TreeSeed project named `SDK` with slug `sdk`.
- Link it to the public upstream repository `github.com/treeseed-ai/sdk`.
- Request or create a docs repository for that SDK project.

The current project creation UI appears template-oriented, and `apiRequest` scene actions are runtime-deferred unless a future plugin implements them. This first scenario should not fake that operation.

## Selector Hardening Follow-Up

If the run fails because of selectors, add stable admin selectors in a separate product-hardening pass:

- `data-scene="auth.register"`
- `data-scene="auth.check-email"`
- `data-scene="app.home"`
- `data-scene="teams.new"`
- `data-scene="projects.new"`
- `data-scene="project.template.research"`
- `data-scene="project.launch.submit"`

Keep those fixes separate from this scene so the first real run can show what breaks today.
