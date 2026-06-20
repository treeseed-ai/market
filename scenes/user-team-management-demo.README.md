# User And Team Management Demo Scene

This scene is a strict QA/demo probe for TreeSeed user and team management. It uses fixed demo identities, Mailpit invite delivery, Playwright recording, Remotion rendering, and training/evidence/publish outputs from the central TreeSeed acceptance test harness and demo / educational video generator.

## What It Covers

- Owner registration and email confirmation.
- Account settings tabs: profile, security, and sessions.
- TreeSeed team creation with slug `treeseed`.
- Team invite delivery to Mailpit.
- Invite-bound registration for one project lead and three contributors.
- Team visibility in the team list and user profile.
- Final owner verification of the full team roster.

The scene intentionally skips the account delete/danger tab.

## Demo Identities

- Owner: `TreeSeed Admin <demo.admin@treeseed.io>`
- Project lead: `Avery Project Lead <avery.admin@treeseed.io>`
- Contributors:
  - `Casey Member <casey.member@treeseed.io>`
  - `Jordan Member <jordan.member@treeseed.io>`
  - `Riley Member <riley.member@treeseed.io>`

The emails are fixed. Use a fresh local app database or remove those users/team before rerunning. Duplicate account or team errors are expected fail-fast QA evidence.

## Generate The Local Scene

```bash
npx trsd dev start --web-runtime local --json
node scenes/user-team-management-demo.generate.mjs
```

The generator writes:

```text
.treeseed/scenes/generated/user-team-management-demo.local.yaml
```

It discovers the local web URL and Mailpit URL from `trsd dev status --json`, clears the Mailpit inbox, and does not mutate app/provider data. Set `TREESEED_SCENE_CLEAR_MAILPIT=false` to skip inbox cleanup.

## Validate And Plan

```bash
npx trsd scene validate .treeseed/scenes/generated/user-team-management-demo.local.yaml --json
npx trsd scene plan .treeseed/scenes/generated/user-team-management-demo.local.yaml --environment local --json
```

## Desktop Smoke

Start with desktop until the flow is green:

```bash
npx trsd scene run .treeseed/scenes/generated/user-team-management-demo.local.yaml \
  --environment local \
  --record \
  --mode training \
  --device desktop \
  --json
```

Then render from the reported run root:

```bash
npx trsd scene render .treeseed/scenes/generated/user-team-management-demo.local.yaml \
  --from <run-root> \
  --mode training \
  --json
```

## Training, Evidence, Publish, Plan, Export

```bash
npx trsd scene training .treeseed/scenes/generated/user-team-management-demo.local.yaml --from <run-root> --json
npx trsd scene evidence .treeseed/scenes/generated/user-team-management-demo.local.yaml --from <run-root> --target local --bundle sanitized --json
npx trsd scene publish .treeseed/scenes/generated/user-team-management-demo.local.yaml --from <run-root> --target local --json
npx trsd scene publish-plan .treeseed/scenes/generated/user-team-management-demo.local.yaml --from <run-root> --json
npx trsd scene export .treeseed/scenes/generated/user-team-management-demo.local.yaml --from <run-root> --json
```

## Device Matrix

After desktop is stable:

```bash
npx trsd scene run .treeseed/scenes/generated/user-team-management-demo.local.yaml --environment local --record --mode training --device tablet --json
npx trsd scene run .treeseed/scenes/generated/user-team-management-demo.local.yaml --environment local --record --mode training --device mobile --json
npx trsd scene run .treeseed/scenes/generated/user-team-management-demo.local.yaml --environment local --record --mode training --device all --json
```

Each device profile produces its own run root and render. Mobile output is portrait.

## Expected First Failures

- Existing users or the `treeseed` team may already exist in local state.
- Team invite delivery must send real Mailpit messages.
- Invite-bound registration must prefill and verify the invite email.
- Role selection depends on the SDK `select` action.
- Account/team pages may need more stable `data-scene` selectors if CSS/text selectors drift.

These are useful failures. The scene is designed to expose the gaps quickly.
