# TreeSeed UI Theme And Components

TreeSeed-owned UI uses one semantic token contract: `--ts-*`. New components and pages should not introduce `--site-*`, `--kc-*`, raw color literals, or page-local color systems. Scheme values live in the core theme engine and token fallback files; product UI reads intent-based tokens such as `--ts-color-surface`, `--ts-color-text`, `--ts-color-border`, `--ts-color-accent`, and status tokens.

Use `ThemeScript` before paint on public, auth, and app shells. Use `ThemeSelector` wherever users can change appearance. Anonymous choices are stored in appearance cookies/localStorage, registration carries the selected `colorScheme` and `themeMode`, and logged-in account settings persist the same fields through `/auth/appearance`.

Core primitives in `packages/core/src/components/ui` are the default building blocks for market pages: `AppShell`, `PublicShell`, `Panel`, `Card`, `Button`, `Field`, `TextInput`, `Select`, `Textarea`, `FormActions`, `Badge`, `StatusPill`, `ActionList`, `KeyValueList`, `DataTable`, `MetricCard`, and `MetricGrid`. Market components should compose these primitives and keep only market-specific product logic, data mapping, and small layout helpers locally.

Run `npm run audit:ui` before shipping UI work. The audit blocks retired token names, raw colors outside allowlisted theme/email files, inline style attributes outside intentional dynamic CSS-variable cases, and page-local `<style>` blocks in converted surfaces.

Book and docs pages are protected. They may receive token remapping and Starlight bridge variables, but their layout, typography, reading width, font controls, and navigation structure should not be redesigned as part of market app component migration.
