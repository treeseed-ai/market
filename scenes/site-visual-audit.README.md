# Site Visual Audit Scene

This scene drives `trsd scene visual-audit`, a screenshot review matrix for user-facing TreeSeed routes.

The audit is intended for UI QA, visual regression triage, and design review. It captures viewport screenshots across route roots, roles, and device profiles. It does not render video, generate training outputs, publish evidence, or mutate external providers.

Visual audit is integrated into the scene platform rather than being a separate screenshot script. It uses the same manifest parser, device profiles, environment resolution, Playwright adapter, diagnostics, and artifact layout conventions as the rest of `trsd scene`.

## Run

Start local dev:

```bash
npx trsd dev start --web-runtime local --force --json
```

Capture the full default matrix:

```bash
npx trsd scene visual-audit scenes/site-visual-audit.yaml \
  --environment local \
  --roles anonymous,owner,admin,member \
  --device all \
  --json
```

Capture the full matrix with maximum deterministic review detail for AI repair handoff:

```bash
npx trsd scene visual-audit scenes/site-visual-audit.yaml \
  --environment local \
  --roles anonymous,owner,admin,member \
  --device all \
  --review-detail full \
  --max-findings 500 \
  --json
```

Capture authenticated app routes for the owner on desktop:

```bash
npx trsd scene visual-audit scenes/site-visual-audit.yaml \
  --environment local \
  --roles owner \
  --device desktop \
  --path-root /app \
  --json
```

Capture only public/auth routes:

```bash
npx trsd scene visual-audit scenes/site-visual-audit.yaml \
  --environment local \
  --roles anonymous \
  --device all \
  --path-root /,/auth,/market,/books \
  --json
```

Add full-page debug screenshots:

```bash
npx trsd scene visual-audit scenes/site-visual-audit.yaml \
  --environment local \
  --roles anonymous \
  --device desktop \
  --full-page \
  --json
```

Capture screenshots only, without review findings or contact sheets:

```bash
npx trsd scene visual-audit scenes/site-visual-audit.yaml \
  --environment local \
  --roles anonymous \
  --device desktop \
  --no-review \
  --json
```

## Output

Visual audit artifacts are written under:

```text
.treeseed/scenes/visual-audits/site-visual-audit/<timestamp>-<audit-id>/
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
  review/
    summary.json
    findings.json
    findings.md
    agent-brief.md
    client-errors.jsonl
    routes.json
    contact-sheets/
      index.html
      flagged.html
```

Viewport screenshots are the source of truth for visual review. Full-page screenshots are optional debugging artifacts.

The `manifest.json` file is the machine-readable source for tooling. The `report.md` file groups captures by path root and lists any failed or skipped routes.

The `review/agent-brief.md` file is the preferred handoff document for AI repair agents. It prioritizes client-side errors, high-severity functional/access issues, and repeated display regressions. It also includes architecture guidance so repairs start with reusable package ownership instead of divergent route-local patches:

- `@treeseed/ui` for shared controls, links, buttons, forms, editor surfaces, cards, and `ts-*` styling.
- `@treeseed/admin` for app shell, route composition, auth/session behavior, and client-side admin functionality.
- `@treeseed/core` for public/book route style loading.
- `@treeseed/market` for root tenant branding.
- `@treeseed/api` for fixture, session, authorization, or PostgreSQL-backed data issues.

The `review/contact-sheets/*.html` files are local HTML indexes that show screenshots grouped by path root and flagged findings. They require no network access.

## Authenticated Roles

Local authenticated roles are deterministic fixtures:

- `visual.owner@treeseed.io`
- `visual.admin@treeseed.io`
- `visual.member@treeseed.io`

Password:

```text
TreeSeedVisualAudit!2026
```

The fixtures are created through the API-owned `/v1/acceptance/seed` route using the configured Treeseed service credential. This keeps API and PostgreSQL mutation in `@treeseed/api`; the scene SDK only asks the API for seeded fixture state, establishes Playwright sessions, and captures screenshots.

The local dev stack must include:

- the web runtime
- the API runtime
- the API-owned PostgreSQL service from `packages/api`

If authenticated captures are skipped, check for `scene.visual_audit_role_login_failed` in `manifest.json` and verify the API and PostgreSQL services are healthy. Database or acceptance-seed failures should be fixed in `@treeseed/api`, not by adding SDK-side database writes.

## Recent Local Smoke Shape

A full local smoke run of this scene captured:

```text
Roles: anonymous, owner, admin, member
Devices: desktop, tablet, mobile
Routes: 110
Captures: 1185
Failed: 0
Skipped: 0
```

The exact route count can change as user-facing pages are added or removed, but a healthy full matrix should produce screenshots for all three device profiles and all requested roles.
