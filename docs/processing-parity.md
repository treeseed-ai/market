# Capacity provider runtime parity

The root Market repository no longer owns a processing image, processing Compose stack, or processing role binary. Market deploys Market web/API only. Runtime capacity is provided by `@treeseed/agent` and operated through `trsd capacity`.

Use these checks for provider runtime parity:

```sh
npm -w packages/agent run build:dist
npm -w packages/agent run test:capacity-provider-runtime
npm -w packages/agent run capacity-provider:test-local
trsd capacity doctor --market local --provider local
trsd capacity plan --market local --provider local --json
```

Local provider lifecycle is:

```sh
trsd capacity build
trsd capacity up --market local --provider local
trsd capacity status --market local --provider local
trsd capacity logs --market local --provider local
trsd capacity down --market local --provider local
```

Provider secrets are stored through encrypted Treeseed machine config and injected into package-owned Compose from process memory. Do not create plaintext provider env files.
