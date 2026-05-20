# Agent operations

`@treeseed/agent` owns the capacity provider runtime. The root Market app owns the Market web/API surfaces and provider-authenticated ingress only.

Core operator commands:

```sh
trsd capacity doctor --market local --provider local
trsd capacity build
trsd capacity up --market local --provider local
trsd capacity status --market local --provider local
trsd capacity logs --market local --provider local
trsd capacity down --market local --provider local
```

Package checks:

```sh
npm -w packages/agent run build:dist
npm -w packages/agent run test:capacity-provider-runtime
npm -w packages/agent run verify:local
```

Configuration comes from `trsd config` and encrypted Treeseed machine config. Do not use plaintext provider env files.
