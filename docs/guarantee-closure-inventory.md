# Guarantee Closure Replacement Inventory

Generated: 2026-07-09

This summary records the closure verifier replacement batch for the guarantee and scene completion effort. The full generated itemized inventory for this workspace is written to:

```text
.treeseed/guarantees/closure/inventory.json
.treeseed/guarantees/closure/inventory.md
```

## Totals

- Total `closure.*` verifier refs replaced in guarantee manifests: 396
- `@treeseed/market`: 144 refs
- `@treeseed/admin`: 252 refs

## Buckets

- `api`: 99 refs
- `content`: 99 refs
- `audit`: 99 refs
- `negative`: 99 refs

## Replacement Policy

- Root Market refs now use `market.<type>.<subtype>.<journey>.<bucket>` verifier ids.
- Admin refs now use `admin.<type>.<subtype>.<journey>.<bucket>` verifier ids.
- Replacement verifier definitions are executable `apiAcceptanceCase` entries backed by `@treeseed/api` acceptance cases.
- `closure.*`, `todo.*`, `manualEvidence`, and skipped-only verifier output are not valid release-active guarantee evidence.
