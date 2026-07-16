# UI Foundation Baseline

`@treeseed/ui` remains the reusable UI foundation and was intentionally left unchanged during the Market/Admin legacy removal. It continues to own semantic `--ts-*` tokens, themes, accessible shells, Astro and React components, forms, cards, controls, templates, feedback/help primitives, and CSS bundles.

The current consumers are narrower: Admin composes UI primitives only for authentication, account, team management, active-team selection, invitations, and public user/team identity profiles; Core continues to compose its unchanged public/content routes. Market currently owns no route files.

The previous route-specific proof conventions for projects, capacity, work, knowledge distribution, commerce, and operational marketplace pages are historical. Their route inventory is archived in [legacy-routes.md](./legacy-routes.md), while future composition should follow [ui-redesign.md](./ui-redesign.md).

The enduring component rules remain:

- preserve accessible landmarks, focus behavior, text-visible state, and resolved permission/action inputs;
- keep service calls, policy evaluation, credentials, and private identifiers outside reusable templates;
- keep components Astro-first and lazy-load expensive interactions after explicit intent;
- do not import Admin, Core, API, Agent, or Market implementation into `@treeseed/ui`;
- use `--ts-*` semantic tokens and avoid page-local styling systems.
