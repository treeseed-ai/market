# TreeSeed UI Theme And Components

This is the canonical guide for reusable Treeseed UI ownership. See [Package Ownership](./package-ownership.md) for the full package map.

TreeSeed-owned UI uses one semantic token contract: `--ts-*`. New components and pages should not introduce `--site-*`, `--kc-*`, raw color literals, or page-local color systems. Scheme values live in the UI theme utilities and any generic runtime hook supplied by Core; product UI reads intent-based tokens such as `--ts-color-surface`, `--ts-color-text`, `--ts-color-border`, `--ts-color-accent`, and status tokens.

YAML-backed color scheme definitions are the canonical way to add dynamic TreeSeed color schemes. `@treeseed/ui` parses, validates, completes, and emits scheme CSS for `html[data-ts-scheme][data-ts-mode]`; host apps and product pages must not create parallel color-mode systems.

Use `ThemeScript` before paint on public, auth, and app shells. Use `ThemeSelector` wherever users can change appearance. Anonymous choices are stored in appearance cookies/localStorage, registration carries the selected `colorScheme` and `themeMode`, and logged-in account settings persist the same fields through `/auth/appearance`.

Reusable TreeSeed web UI now lives in `@treeseed/ui`. Import Astro components from `@treeseed/ui/components/astro/...`, React components from `@treeseed/ui/react` or `@treeseed/ui/components/react/...`, helper scripts from `@treeseed/ui/lib/...`, and shared CSS from `@treeseed/ui/styles/...`. Admin, Market, and Core code should compose shell primitives, public stacked-section components, forms, data surfaces, auth cards, operation panels, tabs, and market cards from UI, while keeping only package-specific routes, data mapping, policy, and small adapter logic locally.

## Current Shell And Layout Model

TreeSeed currently composes three shell families; reusable UI exports beyond these consumers remain available for redesign work:

- **Authenticated app shell:** `ShellFrame`, `ShellHeader`, `SiteUserControls`, `TeamOperationsPanel`, `TeamOperationsDrawer`, and `ControlSurface` composed by Admin's `TreeseedAppLayout` for `/app/**`.
- **Auth shell:** `AuthShell` for sign-in, registration, recovery, username, email confirmation, and device approval flows.
- **Public single-column shell:** `PublicSingleColumnShell`, `PublicStack`, `PublicSection`, `PublicHeroSection`, `PublicProfileHeader`, and `PublicKnowledgeSection` for the homepage, marketing pages, public profiles, public projects, books, and Knowledge Hub pages.

`SurfaceTabs` is the canonical responsive tab primitive for control-surface subpages. Link mode is used for routed subpages; panel mode is used only for in-page tab panels. `SettingsTemplate` renders routed section tabs above the active section body on every viewport. `ProjectControlNav`, `WorkContentNav`, raw `.ts-tabs`, and page-local tab scripts are compatibility surfaces and should delegate to `SurfaceTabs`.

`ProductShell`, `PublicShell`, `RailNav`, and `BottomNav` remain exported for one migration cycle as compatibility/deprecated entries. New application work should compose the current shell primitives through package-owned layouts instead of importing those wrappers directly.

`Timestamp` and the `timestamps` client utilities are the canonical instant-display path. Authenticated shells carry the persisted account IANA time zone, render semantic `<time datetime>` elements in that zone, and reformat refreshed content without changing the stored instant. Account settings use `AccountTimeZoneSettings`; page-local `Intl.DateTimeFormat` implementations and raw ISO timestamp output are not alternate supported paths.

Exactly one layer owns an authenticated page heading. Routes whose content template renders `PageHeader` set `contentOwnsPageHeader`; direct-content routes leave heading ownership with `ProductShell`. The desktop team operations rail fills the viewport below the sticky header. Its primary selector/navigation region owns overflow while the team and account actions remain in a non-scrolling footer. Every navigation and action entry has an accessible icon and label.

The desktop rail can collapse to a narrow icon strip. `ProductShell` persists that preference in `treeseed.app-sidebar-collapsed`, restores it before paint, and keeps the mobile drawer fully expanded. Expanded rails show icons and labels; collapsed rails hide the active-team selector while retaining the manage-teams icon, enlarge navigation icons, and expose labels through accessible names and hover titles. Team management is exposed once through that selector-adjacent icon rather than duplicated in the primary navigation. The footer owns the collapse/expand control and normalizes link and form actions to one control height. In the mobile drawer, bottom site controls use compact vertical spacing and right-aligned navigation. App structural planes and form controls are square-edged; selected links, buttons, and cards use the shared small radius for a compact repository-tool visual language.

Every exported Astro layout/component must have a UI sandbox registry entry in `packages/ui/sandbox/src/lib/component-catalog.ts`. Full-page shells must have representative full-page previews, and deprecated compatibility entries must be visibly labeled in the registry.

## Package Ownership

- `@treeseed/ui` owns reusable components, shells, forms, controls, cards, operation panels, auth surfaces, theme utilities, React widgets, and CSS primitives.
- `@treeseed/admin` currently owns authentication, account, team, active-team, invitation, and identity-only public profile composition plus retained generic contracts.
- root `@treeseed/market` owns tenant content, configuration, public messaging, and future redesigned business-policy presentation; it currently owns no route files.
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

Book and docs pages are protected. They may receive token remapping and Starlight bridge variables, but their layout, typography, reading width, font controls, and navigation structure should not be redesigned as part of market app component work.

## Commerce And Governance Components

Commerce and Commons components in `@treeseed/ui` are display components for canonical templates. They may render marketplace product cards, ownership summaries, seller readiness, payment group state, service quote state, capacity risk/readiness, Commons proposals, vote summaries, decision timelines, participant badges, and stewardship panels.

They must not call APIs, own checkout authority, evaluate raw roles, render Stripe secrets or connected-account internals, expose private object keys, or implement page-local help/feedback. Route controllers and admin/root Market view models resolve seller readiness, entitlement state, checkout state, governance signal, proposal decision state, and actions before passing data to these components.
