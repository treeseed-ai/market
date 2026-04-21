# Knowledge Hub Caching

Last updated: 2026-04-17

## Purpose

This note describes the Treeseed v1 caching model for the public Knowledge Hub.

The goal is to keep R2 incremental publishing and small code deploys, while making anonymous public SSR pages cacheable at the Cloudflare edge instead of forcing every read through fresh SSR.

## What Treeseed Caches

Treeseed now treats anonymous public HTML pages as edge-cacheable when all of the following are true:

- request method is `GET` or `HEAD`
- request is not a preview request
- request path is not an API or private path
- response is HTML
- response does not set cookies

In practice, that includes public content pages like:

- `/`
- `/contact`
- `/books/...`
- `/notes/...`
- `/questions/...`
- `/objectives/...`
- `/proposals/...`
- `/decisions/...`
- `/people/...`
- `/<page-slug>`

Treeseed does not rely on Workers Cache API for this. The primary mechanism is:

- app-level cache headers
- Cloudflare edge/CDN cache behavior
- Cloudflare Cache Rules for the canonical public host

## What Treeseed Bypasses

Treeseed bypasses caching for:

- `/api/*`
- form token and submission endpoints
- preview requests using the `preview` query parameter
- preview requests carrying the `treeseed-content-preview` cookie
- any response that sets `Set-Cookie`
- current or future auth/private-style paths such as `/auth`, `/admin`, `/app`, and `/internal`

## Default Policy

The default public HTML cache policy is intentionally conservative:

- browser TTL: `0`
- edge TTL: `300` seconds
- `stale-while-revalidate`: `86400` seconds
- `stale-if-error`: `86400` seconds

This is meant to optimize for low-cost free public hubs:

- browsers revalidate quickly
- Cloudflare edge can serve cached public HTML and published objects for very long periods
- deploy purges source-driven Astro pages
- content publish purges only the changed content pages, related listings, and changed stable public R2 object URLs

## Config Surface

The policy lives in `treeseed.site.yaml` under the web surface:

```yaml
surfaces:
  web:
    provider: cloudflare
    cache:
      sourcePages:
        browserTtlSeconds: 0
        edgeTtlSeconds: 31536000
        staleWhileRevalidateSeconds: 86400
        staleIfErrorSeconds: 86400
        paths:
          - /
          - /contact
          - /404
      contentPages:
        browserTtlSeconds: 0
        edgeTtlSeconds: 31536000
        staleWhileRevalidateSeconds: 86400
        staleIfErrorSeconds: 86400
      r2PublishedObjects:
        browserTtlSeconds: 0
        edgeTtlSeconds: 31536000
        staleWhileRevalidateSeconds: 86400
        staleIfErrorSeconds: 86400
```

If omitted, Treeseed uses the defaults above.

## Cloudflare Behavior

Treeseed manages cache behavior in two layers:

1. Application response policy
   - source-driven Astro pages and content-model HTML pages get long-lived edge cache headers
   - preview/forms/API/cookie-setting flows remain uncached

2. Cloudflare Cache Rules
   - Treeseed manages request-phase Cache Rules for the canonical public web host and the public R2 host when it can resolve their Cloudflare zones
   - preview and dynamic routes are bypassed
   - public HTML and public R2 object routes are marked eligible for long-lived cache

3. Targeted purge
   - deploy purges source-page URLs like `/` and `/contact`
   - production content publish purges changed detail pages, affected list pages, feed/sitemap freshness pages, and changed stable public object URLs

Current limitation:

- Treeseed only manages Cloudflare Cache Rules for the canonical persistent public host, not temporary preview hosts like `workers.dev` or `pages.dev`

## Expected `CF-Cache-Status`

For public HTML, expected Cloudflare behavior is:

- `MISS` on first render in a POP
- `HIT` on repeated requests
- `UPDATING` during stale-while-revalidate refresh windows

For preview, forms, and other uncached responses, expect statuses like:

- `DYNAMIC`
- `BYPASS`

Exact values depend on Cloudflare and route behavior.

## Why This Helps the Free Tier

This model is meant to make free public hubs viable without giving up R2 incremental publishing:

- public reading traffic can hit edge cache instead of fresh SSR every time
- R2 remains the content publish and runtime artifact layer
- code deploys stay small
- forms and preview stay dynamic where they need to be

That means free public hubs can remain a marketing and ecosystem growth tool instead of turning into pure per-request SSR cost centers.
