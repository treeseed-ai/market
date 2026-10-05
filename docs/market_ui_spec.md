# Market UI Redesign Foundation

Market currently contributes no tenant-owned routes. Its former homepage, marketplace, checkout, capacity, service, and Commons presentation is historical and is documented in [legacy-routes.md](./legacy-routes.md).

The integrated web tenant currently consists of unchanged Core public/content routes plus Admin's authentication, account, team, active-team, invitation, and public user/team knowledge-profile routes. The exact active surface is generated in [ui-routes.md](./ui-routes.md).

This is a presentation-layer reset, not a domain removal. Commerce, capacity, projects, content, operations, schemas, SDK workflows, reconciliation, and backend API behavior remain available to the redesign described in [ui-redesign.md](./ui-redesign.md). Reusable `@treeseed/ui` components are also intentionally preserved without modification.

No deleted route receives a compatibility redirect. Core's homepage owns `/`; public user/team profiles expose only identity and explicitly public, attributed knowledge; and the root tenant form capability is disabled.
