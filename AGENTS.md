# Treeseed Workspace Guide

This repository is the unified development workspace for the Treeseed system and the canonical integration environment for the package repositories in `packages/`.

## Package Roles

- `@treeseed/sdk`: platform, config, plugin, data, and shared non-UI runtime substrate
- `@treeseed/core`: Treeseed Research Hub, Astro/Starlight site runtime, content model, and forms
- `@treeseed/agent`: agent runtime, kernel, adapters, and agent contracts
- `@treeseed/cli`: operator and developer CLI workflows
- `@treeseed/api`: HTTP API and gateway services

## Boundary Rules

- `sdk` must not import from `core` or `agent`.
- `core` must not depend on `agent`.
- `agent` may depend on `sdk`, not `core`.
- Shared fixture references do not imply package ownership.
- Prefer canonical SDK import paths. Do not reintroduce alias exports or compatibility paths in unreleased packages.

## Shared Fixture Model

- `.fixtures/treeseed-fixtures` is the canonical integrated Treeseed project.
- The fixture is intentionally shared across `sdk`, `core`, `cli`, `agent`, and `api`.
- Package-local verification must adapt to the fixture. Do not rewrite the fixture to satisfy one package.
- Fixture shims and package injection exist only to make isolated package verification behave like the canonical integrated project.
- SDK owns the shared fixture support model and the canonical contracts-only Agent shim used when package-only verification does not have a real Agent package checkout.

### Shared Fixture Purpose

The shared fixture exists to validate the full Treeseed project shape in one canonical place:

- content and platform configuration from `sdk`
- Astro/Starlight site runtime from `core`
- agent handler files and contracts from `agent`
- package and deployment workflows exercised by `cli` and `api`

The fixture is not package-specific. It is the integrated reference project for the system.

### Package Verification Intent

- `sdk`
  - owns fixture resolution and package injection support
  - validates shared runtime, config, and fixture support behavior
- `core`
  - validates Research Hub, Astro/Starlight, content, and forms behavior
  - may inject an Agent contracts shim so the integrated fixture can typecheck and build without a real Agent runtime dependency
- `agent`
  - validates the real Agent runtime and real Agent contracts against the shared fixture
- `cli` and `api`
  - validate their own package-owned surfaces while still targeting the same integrated fixture

### Package Injection Modes

The shared fixture support layer uses explicit package injection modes:

- `workspace-link`: use the sibling package checkout when working in the full workspace
- `installed-link`: use the installed package when the sibling checkout is absent
- `contracts-only`: synthesize a minimal fixture-local package exposing only the contract surfaces needed for compilation or typechecking

The canonical `contracts-only` shim currently exists for `@treeseed/agent` contract subpaths used by the shared fixture.

### Allowed Fixture Imports

The shared fixture may import:

- `@treeseed/sdk` surfaces used by content, runtime, and platform config
- `@treeseed/core` site and runtime surfaces
- `@treeseed/agent` contract and runtime surfaces appropriate for integrated project files
- `@treeseed/cli` and `@treeseed/api` surfaces only where the canonical fixture genuinely models those workflows

What matters is that package-local verification adapts correctly, not that the fixture stays artificially minimal.

### What Must Not Happen

- package-specific fixture forks
- ad hoc package-local fixture rewrites hidden inside verification scripts
- multiple incompatible fake Agent shims in different packages
- package boundary violations justified by fixture convenience

## Recommended Workflows

### Package-only work

- Run commands from the package root.
- Use `npm run verify` before considering a package change complete.
- Always run `npm run verify:local` after making any changes inside a package and ensure it passes before marking the task complete.
- Use `npm run verify:action` when you need to reproduce isolated package CI behavior.

### Workspace-integrated work

- Initialize submodules before installing.
- Use the root workspace when changing behavior across package boundaries.
- Re-run the affected package verifies after integration changes.

### Fixture-related debugging

- Start with `npm run fixtures:check`.
- For Astro/Starlight packages, use `npm run check` and `npm run build` against the shared fixture.
- If a package-only verification fails, inspect whether the issue is:
  - a real package boundary violation
  - a missing package injection in isolated verification
  - a stale package export or missing contract shim

## Guidance For Contributors And Coding Agents

- Keep package ownership sharp. Move shared infrastructure into SDK instead of copying it into multiple packages.
- Do not mutate the shared fixture just to make one package pass.
- Do not add backward-compatibility aliases or temporary public API shortcuts in these unreleased packages.
- Keep test harness shims private, minimal, and structurally aligned with the real package contracts.
- Prefer package-scoped verification semantics:
  - `core` validates Research Hub buildability against the integrated fixture
  - `agent` validates real agent runtime behavior
  - `sdk` validates shared runtime, config, and fixture support infrastructure

## Verification Expectations

- `verify`: package verification in the normal environment
- `verify:local`: required completion check after package changes; use this before marking work complete
- `verify:action`: package-only isolated verification through `gh act`
- `check`: typecheck and framework validation against the shared fixture
- `test:smoke`: packed-install or runtime smoke coverage for the package

Common failure patterns:

- missing fixture submodule
- package-only verification missing a required injected package surface
- stale export maps after moving code between packages
- accidental cross-package imports that violate the package boundaries above
