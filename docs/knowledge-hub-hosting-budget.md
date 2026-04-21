# Knowledge Hub Hosting Budget Notes

Last updated: 2026-04-17

## Purpose

This note is a budgeting guide for the Treeseed Knowledge Hub hosting model.

It is focused on one product question:

- Does a free public hub tier help or hurt Treeseed if the current Cloudflare deployment path is server-rendered instead of purely static?

It also records the current repo reality so pricing discussions stay grounded in how `packages/core` actually runs today.

## Current Repo Reality

Today, the Cloudflare-hosted Knowledge Hub is effectively SSR when deployed through the Cloudflare path.

Relevant implementation points:

- [packages/core/src/site.ts](/home/adrian/Projects/treeseed/market/packages/core/src/site.ts:280)
  - switches Astro to `output: 'server'` and the Cloudflare adapter when web/deploy provider is Cloudflare
- [packages/core/src/pages/[slug].astro](/home/adrian/Projects/treeseed/market/packages/core/src/pages/[slug].astro:6)
  - public page route is `prerender = false`
- [packages/core/src/worker/forms-worker.ts](/home/adrian/Projects/treeseed/market/packages/core/src/worker/forms-worker.ts:181)
  - tiny Worker only intercepts `/api/form/submit`, everything else falls through to static assets via `env.ASSETS.fetch(request)`
- [packages/core/src/utils/published-content.ts](/home/adrian/Projects/treeseed/market/packages/core/src/utils/published-content.ts:31)
  - R2 is used as a runtime content overlay/published-content source

So the current practical model is:

- static JS/CSS/images can still be cheap static asset delivery
- public content page requests are not purely static today
- forms need dynamic handling
- R2 is strategically important because it keeps content publishing incremental and keeps code deploys small

## External Pricing Inputs

Cloudflare pricing changes over time. These notes were checked on 2026-04-17 against the official docs:

- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Pages Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/

Important current pricing points:

- Pages static asset requests are free and unlimited as long as they do not invoke Functions.
- Pages Functions count against Workers pricing.
- Workers Paid currently includes:
  - $5/month subscription
  - 10 million requests/month included
  - 30 million CPU milliseconds/month included
  - +$0.30 per additional million requests
  - +$0.02 per additional million CPU milliseconds
- R2 Standard currently includes:
  - 10 GB-month storage free
  - 1 million Class A operations/month free
  - 10 million Class B operations/month free
  - free egress to the Internet
  - after free tier:
    - storage: $0.015/GB-month
    - Class A: $4.50/million
    - Class B: $0.36/million

## What Actually Costs Money

For the public hub, the meaningful cost drivers are:

1. Worker/Pages Function requests
2. Worker CPU time for SSR or other dynamic work
3. R2 request volume
4. R2 storage volume

In practical terms:

- storage is usually not the scary part
- R2 egress being free is a major advantage
- Worker SSR is the first place public traffic starts turning into budget pressure

## Why R2 Still Matters

R2 is still the right strategic content layer if these goals remain true:

- publish only changed content and generated artifacts
- keep code deploys small and fast
- avoid massive rebuilds as hub content grows
- keep public asset egress cheap

That trade is still good. The budgeting problem is not “R2 is too expensive.” The budgeting problem is “how much Cloudflare compute do public page requests trigger on top of R2?”

## Hosting Options

### Option A: Pure Static Public Hub + Tiny Dynamic Forms Surface

Model:

- public HTML, JS, CSS, images served statically
- forms stay dynamic
- preview or other special routes stay dynamic
- R2 is used at publish time, not on every normal page request

Budget profile:

- cheapest by far
- public traffic mostly does not consume Worker budget
- R2 storage and publish-time operations remain

Best for:

- large free tier footprint
- tight budget
- predictable cost ceiling

Main downside:

- weakest fit with true runtime R2-driven content delivery
- usually requires some render/build/publish step for generated public HTML

### Option B: Static Shell + Browser Fetches Content from R2

Model:

- static app shell from Pages
- browser fetches content JSON/artifacts from R2
- little or no SSR for public page requests

Budget profile:

- still cheap
- shifts most public cost from Worker CPU to R2 reads
- SEO and first-content-load complexity increase

Best for:

- interactive app-like surfaces
- cases where runtime content freshness matters more than fully static HTML

Main downside:

- usually worse than prerendered HTML for knowledge-hub SEO and perceived performance

### Option C: Current-Style SSR Public Hub + R2 Runtime Content

Model:

- public page requests hit Cloudflare server runtime
- content/runtime metadata can be loaded from R2
- forms and preview remain dynamic

Budget profile:

- operationally flexible
- preserves incremental content publishing very well
- most expensive public-traffic option because every rendered page can consume Worker budget

Best for:

- fast-moving product iteration
- small and medium traffic while architecture is still settling

Main downside:

- free-tier public traffic becomes a direct compute liability

## Rough Monthly Budget Scenarios

These are not exact invoices. They are planning numbers.

Assumptions:

- R2 stored content + generated artifacts: 100 GB
- 3 R2 Class B reads per public page view when content is runtime-driven
- 7 ms average Worker CPU per SSR page request when SSR is used
- forms traffic is small relative to page views

### Scenario 1: 1 million page views/month

Static public hub:

- Workers: about $5/month if forms are the only dynamic surface and stay comfortably inside included usage
- R2 storage: about $1.35/month for 90 GB over the free 10 GB
- R2 reads: usually still inside the 10 million free Class B tier
- Rough total: about $5 to $7/month

SSR public hub:

- Workers subscription: $5/month
- Worker requests: still inside included 10 million
- Worker CPU: 7 million CPU ms, still inside included 30 million
- R2 reads: about 3 million, still inside free Class B tier
- R2 storage: about $1.35/month
- Rough total: about $6 to $7/month

### Scenario 2: 10 million page views/month

Static public hub:

- Workers: forms-only dynamic path can still often stay near the $5/month floor
- R2 storage: about $1.35/month
- R2 reads: if public pages are truly static, R2 runtime reads can remain low
- Rough total: about $5 to $8/month

SSR public hub:

- Workers subscription: $5/month
- Worker requests: still inside included 10 million
- Worker CPU: about 70 million CPU ms total, about 40 million over included
- Worker CPU overage: about $0.80/month
- R2 reads: about 30 million Class B, about 20 million over included
- R2 Class B overage: about $7.20/month
- R2 storage: about $1.35/month
- Rough total: about $14 to $16/month

### Scenario 3: 50 million page views/month

Static public hub:

- Still attractive if most requests stay on static assets/pages
- Dynamic costs depend mostly on forms/preview volume, not total readership
- Rough total: still closer to low tens of dollars than high tens, assuming public page delivery is mostly static

SSR public hub:

- Workers subscription: $5/month
- Worker requests: about 40 million over included -> about $12/month
- Worker CPU: about 350 million CPU ms total, about 320 million over included -> about $6.40/month
- R2 reads: about 150 million Class B, about 140 million over included -> about $50.40/month
- R2 storage: about $1.35/month
- Rough total: about $74 to $76/month

## What This Means for a Free Tier

### If the Free Tier Uses Today’s SSR Public Hub

A free tier can still help you, but only if you assume:

- low traffic per hub
- strong limits on dynamic surfaces
- aggressive caching
- a willingness to subsidize some reader traffic

At low scale, the economics are not terrible. The danger is not “the first few hundred free hubs.” The danger is one or two unexpectedly popular free hubs where every public page view consumes Worker and R2 request budget.

That means the current SSR model makes the free tier economically viable only with guardrails.

### If the Free Tier Uses Static Public Delivery

A free tier is much easier to justify.

Why:

- public page traffic mostly stops being a compute liability
- your marginal cost per free hub becomes closer to storage + a small amount of background/dynamic traffic
- a successful hub becomes a marketing asset instead of a budget alarm

This is much closer to the old “static is basically free” logic.

## Recommendation

Short version:

- Free tier still makes sense.
- Free tier should not stay on the current full SSR-by-default public delivery model for the long term.

Implementation details for the current Treeseed cache strategy live in [knowledge-hub-caching.md](/home/adrian/Projects/treeseed/market/docs/knowledge-hub-caching.md).

Recommended product/budget direction:

1. Keep R2 incremental publishing.
2. Keep the tiny forms Worker.
3. Treat public unauthenticated hub traffic as a strong candidate for static or heavily cached delivery.
4. Reserve broader SSR for:
   - preview
   - authenticated/private hubs
   - editor or workflow-driven views
   - routes that genuinely need per-request runtime processing

That gives you a clean product split:

- free/open public hubs: cheap distribution, good marketing, low marginal cost
- paid privacy-first/authenticated hubs: dynamic budget is justified by subscription revenue

## Decision Framework

If you need a simple rule:

- If a route can be served from a published artifact or cached public HTML, do not make it SSR.
- If a route needs true per-request logic, keep it dynamic.
- Do not spend Worker budget on ordinary public reading traffic unless the business case is strong.

## Budget Guardrails for a Free Tier

If you launch the free tier before the hub becomes more static-first, use guardrails immediately:

1. Put hard monthly usage limits on Worker CPU and requests.
2. Cache public page responses aggressively.
3. Keep forms, preview, and admin/editor flows as the main dynamic paths.
4. Cap expensive preview or content-regeneration features on free hubs.
5. Watch for hubs whose public traffic is much larger than their upgrade likelihood.

## Strategic Conclusion

The free tier is still more likely to help than hurt if it is used to distribute public knowledge hubs and drive upgrades.

But the answer depends on one architectural choice:

- free tier on static-first public delivery: probably a net benefit
- free tier on SSR-everywhere public delivery: much riskier for a small budget

So the core decision is not whether to keep the free tier. It is whether the public Knowledge Hub should remain fully request-time rendered.

For Treeseed’s budget constraints, the safer target is:

- R2 for incremental content publishing
- static or cached public delivery wherever possible
- tiny dynamic Worker surface for forms and special cases
- paid plans absorb the higher-cost authenticated and private runtime features

## Sources

- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Pages Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
