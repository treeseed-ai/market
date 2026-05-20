# Agent parity testing

Agent parity now means proving the package-owned capacity provider runtime can register, heartbeat, fetch portfolio state, and exercise the task lifecycle against Market provider APIs.

Run the focused checks:

```sh
npm -w packages/sdk run test:unit -- test/utils/capacity-provider.test.ts
npm -w packages/agent run build:dist
npm -w packages/agent run test:capacity-provider-runtime
npm -w packages/agent run capacity-provider:test-local
npm -w packages/cli run test
```

Run the integrated Market checks:

```sh
npm run test:unit -- test/api/market-api.test.ts test/lib/web-runtime-boundaries.test.ts
npm run build
npm run verify:local
```

The public operator surface is `trsd capacity ...`. The root Market repository does not provide a provider binary, provider Dockerfile, provider Compose file, or provider env file.
