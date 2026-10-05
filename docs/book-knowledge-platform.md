# Book Knowledge Platform

TreeSeed books are repository-native knowledge products. A book definition and its pages live in the owning project's Git repository, TreeDX indexes and edits exact repository revisions, and PostgreSQL records workflow state. Readers and knowledge-pack builds consume an immutable, visibility-partitioned federated publication manifest selected through a compare-and-swap current pointer. A failed project refresh therefore leaves the previous complete library revision available instead of exposing a mixed revision.

## Canonical lifecycle

1. An authorized author opens a TreeDX workspace from an exact publication ref.
2. Book metadata or page Markdown is saved to that workspace with optimistic workspace and file versions.
3. SDK schemas validate identity, visibility, navigation, relationships, and safe Markdown/MDX boundaries.
4. Submission commits an operation-named feature branch and creates a review record.
5. A different authorized reviewer inspects the diff and records approval or requested changes.
6. The operations runner integrates the exact reviewed commit, refreshes the TreeDX graph and search index, verifies graph/source commit parity, writes immutable publication objects, validates the complete federated manifest, and atomically advances the current pointer.
7. Core renders the resulting book overview and pages through Starlight.
8. Knowledge packs are immutable artifacts built from exact TreeDX source closures. Selected packs never pull related books into scope implicitly.

## Source layout

- Market: `src/content/books` and `src/content/knowledge`
- Package projects: `docs/src/content/books` and `docs/src/content/knowledge`

Security-owned project, repository, team, and commit metadata comes from control-plane bindings and cannot be changed through frontmatter.

## Synchronization

`npx trsd content sync --project <project-id> --branch staging --plan --json` compares the local checkout, authoritative upstream ref, and the ref resolved by the project's bound TreeDX repository. Live execution omits `--plan` and only fast-forwards a clean attached checkout after the exact observations still match. Dirty, detached, missing, stale, force-pushed, or diverged state fails closed. Local work is never reset or discarded.

The older build-time filesystem exporter has been removed. Builds do not scan local book roots and create mutable download artifacts as a side effect.

## Current release posture

Journeys 65–73 and 90–91 and the five release-required knowledge aggregates are active. The canonical graph executes one shared 155-step rendered workflow on desktop, mobile, and tablet Chromium. It creates a real book and page, validates rejected mutations, links knowledge, handles request changes and a different-user approval, publishes through the operations runner, proves exact Git/TreeDX graph parity, exercises Starlight and contextual knowledge, creates single-book and selected-book packs, and archives and restores both the page and book. Actor-specific negative scenes prove anonymous, non-member, read-only, and contributor lifecycle denials through the rendered UI.

The August 1, 2026 acceptance matrix passed all 20 planned graph nodes, including authentication dependencies, with zero failed, blocked, skipped, or release-blocking nodes. Run-correlated verifiers consumed the exact per-device workspace, review, publication, commit, collection, pack, and lifecycle identifiers. Package evidence included 32 API knowledge-control-plane tests, safe-content corpus validation, clean/dirty/diverged/idempotent Git synchronization tests, deterministic pack tests, contextual authorization tests, Admin UI ownership tests, and a complete Core Starlight check with zero diagnostics. The source closure matched from graph start through completion.

The cleanup acceptance exposed an interrupted-cleanup defect after one device had already removed its TreeDX branch and workflow rows. Cleanup now treats an absent source workspace as complete only when the current immutable manifest also proves that the run content is absent; it independently derives the owning team from the project; it tolerates already-retired refs and already-closed workspaces; and it remains fail-closed when published content survives without its source record. Repeated cleanup is idempotent. The postcondition is a 69-entry canonical manifest with no run entries, two readable rollback revisions, no missing objects, empty knowledge workflow and pack tables, and no `refs/heads/knowledge/*` branches.

The superseded blocked endpoint guarantee and its unrelated contextual-help-only verifier were removed. The canonical API promise is now the run-correlated `knowledge.collaboration.production-readiness` aggregate; it cannot pass from a generic role test or an unrelated read endpoint.

The prior July evidence remains inadmissible because it used unrelated read-only verifiers rather than UI-created records. The first August diagnostic graph is also inadmissible because a verifier-command correction changed its source closure. Only a complete unchanged-source graph whose cleanup postconditions pass is admissible.
