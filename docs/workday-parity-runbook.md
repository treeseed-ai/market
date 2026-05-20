# Workday and provider parity runbook

Workday execution now flows through the package-owned capacity provider runtime. The root Market app records workdays, tasks, usage, and reports through `/v1/provider/*`; it does not run provider containers.

Local parity check:

```sh
npm run test:unit -- test/api/market-api.test.ts test/lib/seed-apply.test.ts
npm -w packages/agent run test:capacity-provider-runtime
trsd capacity doctor --market local --provider local
trsd capacity plan --market local --provider local --json
```

Container smoke check:

```sh
npm -w packages/agent run capacity-provider:test-local
```

Live local provider flow:

```sh
trsd config
trsd capacity up --market local --provider local
trsd capacity status --market local --provider local
trsd capacity down --market local --provider local
```

If a provider key is rotated, restart the provider with `trsd capacity restart --market local --provider local` after encrypted config has been updated.
