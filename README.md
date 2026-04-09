# @treeseed/market

`@treeseed/market` is the canonical TreeSeed marketplace site.

It is intentionally built like a real TreeSeed application on top of `@treeseed/core`:

- site config and tenant manifest
- content-backed template products
- local template artifacts used by the CLI
- an internal market framework under `src/lib/market`

This package exists to prove that TreeSeed’s own marketplace can be implemented as a layered TreeSeed site instead of as a special platform runtime.
