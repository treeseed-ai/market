# TreeSeed UI Theme And Components

This is the canonical guide for reusable Treeseed UI ownership. See [Package Ownership](./package-ownership.md) for the full package map.

TreeSeed-owned UI uses one semantic token contract: `--ts-*`. New components and pages should not introduce `--site-*`, `--kc-*`, raw color literals, or page-local color systems. Scheme values live in the UI theme utilities and any generic runtime hook supplied by Core; product UI reads intent-based tokens such as `--ts-color-surface`, `--ts-color-text`, `--ts-color-border`, `--ts-color-accent`, and status tokens.

YAML-backed color scheme definitions are the canonical way to add dynamic TreeSeed color schemes. `@treeseed/ui` parses, validates, completes, and emits scheme CSS for `html[data-ts-scheme][data-ts-mode]`; host apps and product pages must not create parallel color-mode systems.

Use `ThemeScript` before paint on public, auth, and app shells. Use `ThemeSelector` wherever users can change appearance. Anonymous choices are stored in appearance cookies/localStorage, registration carries the selected `colorScheme` and `themeMode`, and logged-in account settings persist the same fields through `/auth/appearance`.

Reusable TreeSeed web UI now lives in `@treeseed/ui`. Import Astro components from `@treeseed/ui/components/astro/...`, React components from `@treeseed/ui/react` or `@treeseed/ui/components/react/...`, helper scripts from `@treeseed/ui/lib/...`, and shared CSS from `@treeseed/ui/styles/...`. Admin, Market, and Core code should compose primitives such as `ProductShell`, `PublicShell`, forms, data surfaces, auth cards, operation panels, and market cards from UI, while keeping only package-specific routes, data mapping, policy, and small adapter logic locally.

## Package Ownership

- `@treeseed/ui` owns reusable components, shells, forms, controls, cards, operation panels, auth surfaces, theme utilities, React widgets, and CSS primitives.
- `@treeseed/admin` owns admin route composition, data binding, auth/session flow, admin view models, and workflow orchestration.
- root `@treeseed/market` owns tenant content, public messaging, page overrides, Treeseed branding, buyer marketplace pages, and Commons participant pages.
- `@treeseed/core` owns generic site runtime and plugin/layout integration hooks, not layout-down product components.
- `@treeseed/api`, `@treeseed/sdk`, `@treeseed/cli`, `@treeseed/agent`, and TreeDX own non-visual runtime behavior.

## Import Examples

```astro
---
import AppLayout from '@treeseed/ui/components/astro/layouts/AppLayout.astro';
import Button from '@treeseed/ui/components/astro/forms/Button.astro';
import Panel from '@treeseed/ui/components/astro/surface/Panel.astro';
---
```

```ts
import '@treeseed/ui/styles/tokens.css';
import '@treeseed/ui/styles/theme.css';
import '@treeseed/ui/styles/ui.css';
import '@treeseed/ui/styles/forms.css';
```

## Do Not Recreate UI Primitives In Admin Or Market

Admin and Market pages should import UI primitives from `@treeseed/ui` and keep only route-specific data mapping, copy, policy, and composition locally. Move primitives into UI when they are reusable below the route/view-model layer.

Run `npm run audit:ui` before shipping UI work. The audit blocks retired token names, raw colors outside allowlisted theme/email files, inline style attributes outside intentional dynamic CSS-variable cases, and page-local `<style>` blocks in converted surfaces.

Book and docs pages are protected. They may receive token remapping and Starlight bridge variables, but their layout, typography, reading width, font controls, and navigation structure should not be redesigned as part of market app component migration.
