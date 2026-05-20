# Capacity provider deployment

Market Railway deployment is now web/API only. Capacity-provider deployment is external to the root Market app and is owned by `@treeseed/agent`.

For local and self-hosted provider lifecycle, use:

```sh
trsd config
trsd capacity build
trsd capacity up --market local --provider local
trsd capacity status --market local --provider local
trsd capacity logs --market local --provider local
trsd capacity down --market local --provider local
```

For package-level validation, use:

```sh
npm -w packages/agent run build:dist
npm -w packages/agent run test:capacity-provider-runtime
npm -w packages/agent run capacity-provider:test-local
```

Provider API keys and Codex credentials must stay in encrypted Treeseed machine config or deployment-provider secret stores. Do not write plaintext `.env` files or render secrets into Compose configuration.
