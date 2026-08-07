# TreeSeed Seeds

Seed manifests define named, declarative market portfolios that can be validated and planned with the Treeseed CLI.

The application foundation and capacity providers are independent exact-set seeds:

```bash
trsd run treeseed --plan
trsd run treeseed agents --plan
trsd run treeseed platform --plan
trsd run treeseed agents platform --plan
```

`treeseed` owns the team, projects, catalog, and Agent Lab service principal. `agents` owns one agent-class provider that selects among installed Codex, OpenCode, and GitHub Copilot execution providers per assignment. `platform` owns the privileged platform-operation provider. Provider seeds declare stable external resource references to the foundation and may be composed independently or together after the referenced foundation exists.
