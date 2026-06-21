# Agent operations

`@treeseed/agent` owns the capacity provider runtime. The root Market app owns the Market web tenant and `/v1/*` API proxy/client surfaces. `@treeseed/api` owns the backend API, operations runner, and provider-authenticated ingress implemented by the control-plane service.

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

Provider assignments should consume normalized project architecture from the API/SDK portfolio manifest. Agents may receive repository context, `rootPath`, `sitePath`, `contentPath`, content source policy, and workspace materialization mode, but they should not assume projects are embedded as submodules or require local content checkout unless the assignment explicitly grants that workspace mode.
