# TreeSeed UI Theme And Components

TreeSeed-owned UI uses one semantic token contract: `--ts-*`. New components and pages should not introduce `--site-*`, `--kc-*`, raw color literals, or page-local color systems. Scheme values live in the core theme engine and token fallback files; product UI reads intent-based tokens such as `--ts-color-surface`, `--ts-color-text`, `--ts-color-border`, `--ts-color-accent`, and status tokens.

Use `ThemeScript` before paint on public, auth, and app shells. Use `ThemeSelector` wherever users can change appearance. Anonymous choices are stored in appearance cookies/localStorage, registration carries the selected `colorScheme` and `themeMode`, and logged-in account settings persist the same fields through `/auth/appearance`.

Reusable TreeSeed web UI now lives in `@treeseed/ui`. Import Astro components from `@treeseed/ui/components/astro/...`, React components from `@treeseed/ui/react` or `@treeseed/ui/components/react/...`, helper scripts from `@treeseed/ui/lib/...`, and shared CSS from `@treeseed/ui/styles/...`. Market and Core code should compose primitives such as `AppShell`, `PublicShell`, forms, data surfaces, auth cards, operation panels, and market cards from UI, while keeping only product-specific routes, data mapping, and small adapter logic locally.

Run `npm run audit:ui` before shipping UI work. The audit blocks retired token names, raw colors outside allowlisted theme/email files, inline style attributes outside intentional dynamic CSS-variable cases, and page-local `<style>` blocks in converted surfaces.

Book and docs pages are protected. They may receive token remapping and Starlight bridge variables, but their layout, typography, reading width, font controls, and navigation structure should not be redesigned as part of market app component migration.
