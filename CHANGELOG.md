# Changelog

## [0.7.20] - 2026-07-04

### Changed

- docs: prohibit dry-run behavior (9095027b80e9)

### Fixed

- chore: advance sdk test fix (d77ddb06dbda)
- chore: update sdk publish gate ordering fix (76571e8c2f70)
- chore: update sdk workflow gate failure fix (c0fd6ab0206c)
- chore: update sdk release gate fix (e3206dcf4aeb)
- chore: update api hosted sdk email acceptance fix (10a369b03fc4)
- chore: update api acceptance nonce fix (8f46b94a8691)
- chore: update api acceptance bypass fix (b1a7226b09c2)
- chore: update api acceptance seed fix (d4e0cabcc61a)
- fix: update api live credential propagation (7cbcade83363)
- fix: gate release graph on api workflow failures (e3e42a1a57c3)
- chore: update API live credential fix (16c9cb376bc9)
- chore: update API staging workflow fix (92e4af782ad2)
- chore: update api acceptance credential fix (d3a8cf08e6b6)
- fix: retry market api workflow gate polling (521d92ec4682)
- chore: update api sdk release fixes (c16e12ddc3bf)
- fix: gate staging market deploys on API workflows (4150f853ab7b)
- chore: update sdk release gate fix (6fec41b4bd71)

### Infrastructure

- chore: record release package versions (92bcab5f01f1)
- chore: record release package versions (92bf8c16606f)
- chore: record release package versions (8c18ab7a839c)
- chore: record changelog cleanup pointers (dbbb42fcf18b)
- chore: record release package versions (7b6ed27fd8f2)
- chore: record release retry package pointers (fd3fb8003530)
- chore: sync release package lock (ee9b1fa52597)
- chore: record release package pointers (4fdfd0fea3dc)
- chore: update sdk staging pointer (adebaa51483b)
- Update release source policy package pointers (bf17db76abc3)
- Advance release pointers after API deploy gate (e429a215bb04)
- Advance release package pointers (66bfa05d4e9f)
- Record published package release pointers (e73b9907931e)
- Update API deploy workflow pointer (2beb2e65f3c1)
- Update CLI release verification pointer (86b4a35fc0f3)
- chore: advance sdk release reconciler (6ca6b31b70cf)
- chore: advance release package pointers (93f91c393646)
- chore: keep api ci in api package (194eb1715484)
- chore: bound hosted web deploy workflow (08a36fa90284)
- chore: update sdk deploy retry repair (4df3b532fb11)
- 12 additional changes omitted from this summary.

### Tests

- chore: update api staging dependency test (d0bd0cac15b1)

### Dependencies

- @treeseed/admin: 0.12.29
- @treeseed/agent: 0.12.29
- @treeseed/api: 0.6.28
- @treeseed/cli: 0.12.29
- @treeseed/core: 0.12.30
- @treeseed/sdk: 0.12.33
- @treeseed/ui: 0.12.5
- treedx: 0.2.27

## [0.7.11] - 2026-07-03

### Fixed

- Update staging refs for release verification fix (c5710a3e235f)
- fix(release): load API acceptance credentials from config (55554eefc5ce)
- fix(release): gate root deploy on API production verification (40bfcdfe4522)

### Infrastructure

- Update staging package refs for release retry (bd45e8b95cef)
- Update release verification package pointers (df7f55a2ed4a)

### Dependencies

- @treeseed/admin: 0.12.16
- @treeseed/agent: 0.12.16
- @treeseed/api: 0.6.15
- @treeseed/cli: 0.12.16
- @treeseed/core: 0.12.17
- @treeseed/sdk: 0.12.20
- @treeseed/ui: 0.12.5
- treedx: 0.2.15

## [0.7.10] - 2026-07-03

### Infrastructure

- Update release diagnostics (c98546b7eb45)
- Update sdk release journal scan (cdd0eb309a9b)
- Update sdk release image reconciliation (0408f6cb8d66)

### Tests

- Update sdk release gate test isolation (484feb3f886f)

### Dependencies

- @treeseed/admin: 0.12.13
- @treeseed/agent: 0.12.13
- @treeseed/api: 0.6.12
- @treeseed/cli: 0.12.13
- @treeseed/core: 0.12.14
- @treeseed/sdk: 0.12.16
- @treeseed/ui: 0.12.5
- treedx: 0.2.12

## [0.7.9] - 2026-07-02

### Changed

- Update sdk Railway Postgres reconciliation (c2e7378d6033)

### Dependencies

- @treeseed/admin: 0.12.12
- @treeseed/agent: 0.12.12
- @treeseed/api: 0.6.11
- @treeseed/cli: 0.12.12
- @treeseed/core: 0.12.13
- @treeseed/sdk: 0.12.15
- @treeseed/ui: 0.12.5
- treedx: 0.2.11

## [0.7.8] - 2026-07-02

### Changed

- Update api acceptance credential isolation (0d702593fc7b)
- Update sdk Railway image env scope (30c6c9f501f9)
- Update sdk production database reconciliation (fb85977da527)

### Fixed

- Update sdk production image scope fix (7d82fec56df9)
- Update sdk reconcile env overlay fix (4705bfa058eb)

### Dependencies

- Update api production dependency assertion (e0272bf95ddb)
- @treeseed/admin: 0.12.11
- @treeseed/agent: 0.12.11
- @treeseed/api: 0.6.10
- @treeseed/cli: 0.12.11
- @treeseed/core: 0.12.12
- @treeseed/sdk: 0.12.14
- @treeseed/ui: 0.12.5
- treedx: 0.2.10

## [0.7.7] - 2026-07-02

### Fixed

- Update sdk production reconciliation fix (2999cd1d5624)
- Update sdk release image gate fix (2bdf05f1efb8)
- fix(release): refresh staging lock recovery refs (9293494aec6a)
- fix(release): refresh staging release guard refs (9e3ed89394a3)
- fix(release): require valid production railway topology (266403a39edb)
- fix(release): refresh staging package refs (6068f6499170)
- fix(release): update sdk journal loader (13466d9854cd)
- fix(release): restore staging refs after artifact check fix (2029acf63492)
- fix(release): align SDK staging pointer (e58cfb3911d0)
- fix(release): restore staging refs after TreeDX crate fix (42db83de09a6)
- fix(release): update TreeDX crate package fix (7ce5b95d8d4c)
- fix(release): refresh staging refs after SDK launcher fix (b875c0024536)
- fix(release): restore staging package commit refs (7f6617c4a67f)
- fix(release): update SDK key-agent release guard (64a790191884)
- fix(release): update TreeDX Rust publish fix (3c0fc48bb44c)
- fix(release): retry visual fixture login (0605c860a113)
- fix(release): retry hosted scene navigation (45adac7a4e2d)
- fix(release): retry API acceptance requests (b342bf8cac69)
- fix(release): allow agent npm provenance (77ebc000d6c0)
- fix(release): retry npm lockfile refresh (39e60d38ebe1)
- 7 additional changes omitted from this summary.

### Infrastructure

- Update release recovery package pointers (141f97e1fb40)

### Dependencies

- @treeseed/admin: 0.12.10
- @treeseed/agent: 0.12.10
- @treeseed/api: 0.6.9
- @treeseed/cli: 0.12.10
- @treeseed/core: 0.12.11
- @treeseed/sdk: 0.12.13
- @treeseed/ui: 0.12.5
- treedx: 0.2.9

## [0.7.5] - 2026-07-02

### Fixed

- fix(release): update sdk release graph (944ba41a0067)
- fix(release): require image publish credentials (5d5f2457e7f7)

### Dependencies

- @treeseed/admin: 0.12.5
- @treeseed/agent: 0.12.5
- @treeseed/api: 0.6.5
- @treeseed/cli: 0.12.5
- @treeseed/core: 0.12.5
- @treeseed/sdk: 0.12.5
- @treeseed/ui: 0.12.5
- treedx: 0.2.5

## [0.7.4] - 2026-07-02

### Fixed

- fix(release): publish plain semver tags (59db2c4e0b7d)

### Dependencies

- @treeseed/admin: 0.12.4
- @treeseed/agent: 0.12.4
- @treeseed/api: 0.6.4
- @treeseed/cli: 0.12.4
- @treeseed/core: 0.12.4
- @treeseed/sdk: 0.12.4
- @treeseed/ui: 0.12.4
- treedx: 0.2.4

## [0.7.3] - 2026-07-02

### Fixed

- fix(deploy): keep staging domain probe (75400abea271)
- fix(config): invoke key agent without tsx shim (3581126a145b)
- fix(deploy): probe pages deployment after publish (dd5facd1e422)

### Tests

- test: clean treedx sdk verifier artifacts (1c767b9697a1)
- test: reuse ui sandbox during release verify (8a05dde0756b)
- test: isolate treedx audit event storage (91220f7bd903)

### Dependencies

- @treeseed/admin: 0.12.3
- @treeseed/agent: 0.12.3
- @treeseed/api: 0.6.3
- @treeseed/cli: 0.12.3
- @treeseed/core: 0.12.3
- @treeseed/sdk: 0.12.3
- @treeseed/ui: 0.12.3
- treedx: 0.2.3

## [0.7.2] - 2026-07-01

### Fixed

- fix(deploy): wait for production pages propagation (041e85c9fc5e)

### Dependencies

- @treeseed/admin: 0.12.2
- @treeseed/agent: 0.12.2
- @treeseed/api: 0.6.2
- @treeseed/cli: 0.12.2
- @treeseed/core: 0.12.2
- @treeseed/sdk: 0.12.2
- @treeseed/ui: 0.12.2
- treedx: 0.2.2

## [0.7.1] - 2026-07-01

### Fixed

- fix(release): dispatch production web deploy gate (b140a0d5ad66)

### Dependencies

- @treeseed/admin: 0.12.1
- @treeseed/agent: 0.12.1
- @treeseed/api: 0.6.1
- @treeseed/cli: 0.12.1
- @treeseed/core: 0.12.1
- @treeseed/sdk: 0.12.1
- @treeseed/ui: 0.12.1
- treedx: 0.2.1

## [0.7.0] - 2026-07-01

### Added

- feat(deps): fix API acceptance team member isolation after guarantee (c273ebd3478d)
- feat(deps): restore TreeDX release gate Beam setup (da616767185f)
- feat(deps): replay stale API Postgres baseline markers (1bb6abd57dc6)
- feat(deps): require full API Postgres baseline before adoption (d2c756da99bb)
- feat(deps): replay partial API Postgres baselines idempotently (bb199921ec89)
- feat(deps): make API Postgres baseline recovery idempotent (38bdfbc0dd8a)
- feat(deps): adopt existing API Postgres baseline migrations (31282e1879ea)
- feat(deps): allow API release graph CLI tarball dependency (30c5a10ea131)
- feat(deps): fix stage verification cleanup issues (4c4d01c85519)

### Fixed

- fix(release): allow stable release refs (fb5574b5ee26)
- fix(release): restore production promotion (f60b46156774)
- build(deps): fix image release root directory verification (4e16628f587e)
- build(deps): fix Railway runtime config verification (efb17e749b2d)
- build(deps): fix release guarantee API verifiers (873966dc14e3)
- build(deps): fix staging release guarantee auth (5028e58fa363)
- build(deps): fix production release gates (d57d691d34c5)
- build(deps): promotion proof after CI and acceptance fixes (2e61b8ce3e4e)
- build(deps): fix SDK proof regressions after guarantee framework (1ccbe73a88a4)
- build(deps): fix guarantees CLI help metadata (cb62188cc988)
- build(deps): fix proof tests for clean hosted runners (2e4270a6513d)
- build(deps): replace legacy strict tail with proof ledger (7aa371503714)
- build(deps): fix core hosted proof railway dependency lock (0a282cd6e575)
- build(deps): fix promotion release gate assertions (efe1e8d20b93)
- build(deps): fix TreeDX release gate Beam setup (ea1f5811ba42)
- build(deps): fix scoped project domains for staging Pages (725c6deb6b03)
- build(deps): fix Railway deploy live verification settle window (a7aa31e9c36c)
- build(deps): fix Agent capacity provider Docker build shape test (f8cb7e22f7b8)
- ci(deps): fix staging hosted service credential and Railway source (8094ac2eb8c2)
- build(deps): harden Railway IaC reconciliation and domain verification (7b7ff5e11f38)
- 24 additional changes omitted from this summary.

### Tests

- build(deps): checkpoint user and team guarantees passing locally (64276b567aa8)
- ci(deps): switch hosted domains to treeseed.dev (8462131ac0b9)
- build(deps): rework stage promotion workflow (40a6160fda90)
- build(deps): use image-backed Railway API staging services (589286fa54c8)
- build(deps): implement model-aware agent content tools (a0581b17ca19)

### Dependencies

- build(deps): allow first production API domain validation (5225f27c2f7d)
- build(deps): merge package main history back to staging (109f914c7f38)
- build(deps): implement incremental release proof (ea11d3cc7584)
- ci(deps): pin hosted workflow API domains to treeseed.dev (c595f6c08227)
- build(deps): use configured API domains for hosted reconciliation (2679fa71cd6f)
- build(deps): include domain units in promotion hosted reconciliation (102eff0d8905)
- build(deps): finish staging workflow hardening checkpoint (3c697b8144ef)
- build(deps): exclude build artifacts from stage proof workspace (781392bde15b)
- build(deps): skip opaque railway sync provider errors after retries (6ee22e08e624)
- build(deps): tolerate railway deploy trigger processing errors (3b6fa750fb6d)
- build(deps): repair railway existing service deployment recovery (252785c295d1)
- build(deps): remove legacy Mailpit dev hooks (40622214127e)
- build(deps): restore Mailpit as reconciled local dev service (fbe3bf024dd2)
- build(deps): allow local git commit refs in SDK release candidate (7d345ec293cd)
- build(deps): stabilize SDK release candidate commit ref action (3884c12d66c6)
- build(deps): prevent Railway service replacement during repair (49d6359b7352)
- build(deps): harden staging image deployment reconciliation (bec010141a4e)
- build(deps): keep admin dist stable during release gate reads (1ec1695be46d)
- build(deps): serialize admin dist builds for concurrent release gates (be6543a18e7a)
- build(deps): publish sdk dist files atomically for concurrent consumers (34a453446c99)
- 10 additional changes omitted from this summary.

## [0.6.28] - 2026-06-12

### Added

- feat(api): split Market backend into API package (edeeaa7652c2)

### Changed

- Adding an initial admin package. (5a8735bdb32c)
- Adding the TreeSeed UI package. (a96ef0dbd3c4)
- Updates to the TreeDX OpenAPI schema architecture. (8c1f6c10f289)
- Updates to the destroy process. (ce53d21afa55)
- Moving the TreeDB project to TreeDX. (ed86ba799df4)
- Updating the SDK and TreeDB projects from remove. (61b1060f933d)

### Fixed

- release: patch bump (b4808db9d478)
- release: patch bump (fa627518116c)
- release: patch bump (ae6a0d20874a)
- release: patch bump (dfffa133dc4b)
- fix: recover package release orchestration (a804f6f32baa)
- fix: verify API release from clean checkout (7d67040cfa02)
- fix: remove admin api peer from release install (2c31b9b66b67)
- fix: match release dependency policy by package id (9b99d8209d51)
- fix: keep docker packages out of release dependency rewrites (a69e403b31c8)
- fix: require injected API Compose secrets (f87b76f83b9c)
- fix: align API runtime and image publishing (0d0309d3e818)
- fix: repair package release adoption (ef5a00b77521)
- build(deps): fix package deploy gate timeout and hybrid save validation (d1b039aa4d5c)
- ci(deps): fix workspace deployment install readiness (77d47e66543d)
- build(deps): fix ui pages staging reconciliation (6bd57eb151d4)
- build(deps): fix package app cloudflare auth (e7ce7ba2cdba)
- build(deps): fix package hosted config sync and api deploy environment (aee7830afa24)
- ci(deps): Fix operations runner smoke workflow script (98a0e7c5cf06)
- fix(hosting): deploy Market API services from API package (f45a684bcc7a)
- fix(web): keep deploy workflow UI-only (d9a1d898a073)
- 9 additional changes omitted from this summary.

### Infrastructure

- ci: repair admin and treedx release gates (003a61d9c6a8)
- chore(api): track release workflow (001e64ff778a)
- chore(web): use web-only deploy SDK (844d43b29f71)

### Tests

- test: repair sdk release workflow assertions (e504ab73d6f5)
- test(deps): stage package submodule restructuring (493b248338db)
- ci(deps): stage package submodule restructuring (ce256844aa18)
- test(deps): build ui artifacts for hosted deploy (293b08023087)
- ci(deps): migrate reusable ui components to treeseed ui (33b5b0645385)
- build(deps): migrate reusable ui components to treeseed ui (3eb23d5ad687)
- test(deps): allow shared railway env ids in runtime boundary check (2cacf8374c42)
- ci(workflow): restrict root deployment to web-only (22279393110d)
- test(deps): Update web runtime boundary tests for API app (f6cb39483463)
- ci(deps): Save reconciliation platform and live acceptance updates (bf21884bfa2f)
- ci(deps): sync integrated package updates (87d607482a60)

### Dependencies

- build(deps): stage package submodule restructuring (a39794238d21)
- ci(deps): stage package submodule restructuring (8ab3147b8e44)
- build(deps): stage package submodule restructuring (96d3da561f53)
- ci(deps): stage package submodule restructuring (0794e57a8e7f)
- build(deps): stage package submodule restructuring (06c9412d9201)
- build(deps): document save lanes (23a90073f110)
- build(deps): add fast and promotion save lanes (7b0faba19e0a)
- build(deps): bound git dependency smoke checks (8ab07a890676)
- ci(deps): build ui artifacts for hosted deploy (58a90a9fca3b)
- build(deps): migrate reusable ui components to treeseed ui (ad74082d9935)
- build(deps): migrate reusable ui components to treeseed ui (40dd1385ca0f)
- build(deps): integrate treeseed ui (6430bcc95184)
- build(deps): make cli json output robust under capture (bd2ce21629b6)
- build(deps): stabilize agent verification under save load (cd85f5453e32)
- build(deps): finish staging save after dependency repair (a7a5c3629640)
- build(deps): Push clean hosted project repositories during save (5ae0a3e3b0aa)
- build(deps): Install project dependencies before hosted project (996d59bcab3c)
- ci(deps): Move API deployment acceptance into API package (c88aa9e71a49)
- ci(deps): Run API package acceptance in deploy workflow (a3cd1d160bc5)
- build(deps): Accept workflow API base URL for TreeDX bootstrap (83f534ba884b)
- 11 additional changes omitted from this summary.

## [0.6.27] - 2026-06-12

### Added

- feat(api): split Market backend into API package (edeeaa7652c2)

### Changed

- Adding an initial admin package. (5a8735bdb32c)
- Adding the TreeSeed UI package. (a96ef0dbd3c4)
- Updates to the TreeDX OpenAPI schema architecture. (8c1f6c10f289)
- Updates to the destroy process. (ce53d21afa55)
- Moving the TreeDB project to TreeDX. (ed86ba799df4)
- Updating the SDK and TreeDB projects from remove. (61b1060f933d)

### Fixed

- release: patch bump (dfffa133dc4b)
- fix: recover package release orchestration (a804f6f32baa)
- fix: verify API release from clean checkout (7d67040cfa02)
- fix: remove admin api peer from release install (2c31b9b66b67)
- fix: match release dependency policy by package id (9b99d8209d51)
- fix: keep docker packages out of release dependency rewrites (a69e403b31c8)
- fix: require injected API Compose secrets (f87b76f83b9c)
- fix: align API runtime and image publishing (0d0309d3e818)
- fix: repair package release adoption (ef5a00b77521)
- build(deps): fix package deploy gate timeout and hybrid save validation (d1b039aa4d5c)
- ci(deps): fix workspace deployment install readiness (77d47e66543d)
- build(deps): fix ui pages staging reconciliation (6bd57eb151d4)
- build(deps): fix package app cloudflare auth (e7ce7ba2cdba)
- build(deps): fix package hosted config sync and api deploy environment (aee7830afa24)
- ci(deps): Fix operations runner smoke workflow script (98a0e7c5cf06)
- fix(hosting): deploy Market API services from API package (f45a684bcc7a)
- fix(web): keep deploy workflow UI-only (d9a1d898a073)
- fix(web): proxy market health checks (9fe820bdfb1f)
- fix(web): guard env access in Cloudflare runtime (b7d3a8ae1377)
- fix(deploy): pass market credential secret to web workflow (f5b6b1286e3b)
- 6 additional changes omitted from this summary.

### Infrastructure

- ci: repair admin and treedx release gates (003a61d9c6a8)
- chore(api): track release workflow (001e64ff778a)
- chore(web): use web-only deploy SDK (844d43b29f71)

### Tests

- test: repair sdk release workflow assertions (e504ab73d6f5)
- test(deps): stage package submodule restructuring (493b248338db)
- ci(deps): stage package submodule restructuring (ce256844aa18)
- test(deps): build ui artifacts for hosted deploy (293b08023087)
- ci(deps): migrate reusable ui components to treeseed ui (33b5b0645385)
- build(deps): migrate reusable ui components to treeseed ui (3eb23d5ad687)
- test(deps): allow shared railway env ids in runtime boundary check (2cacf8374c42)
- ci(workflow): restrict root deployment to web-only (22279393110d)
- test(deps): Update web runtime boundary tests for API app (f6cb39483463)
- ci(deps): Save reconciliation platform and live acceptance updates (bf21884bfa2f)
- ci(deps): sync integrated package updates (87d607482a60)

### Dependencies

- build(deps): stage package submodule restructuring (a39794238d21)
- ci(deps): stage package submodule restructuring (8ab3147b8e44)
- build(deps): stage package submodule restructuring (96d3da561f53)
- ci(deps): stage package submodule restructuring (0794e57a8e7f)
- build(deps): stage package submodule restructuring (06c9412d9201)
- build(deps): document save lanes (23a90073f110)
- build(deps): add fast and promotion save lanes (7b0faba19e0a)
- build(deps): bound git dependency smoke checks (8ab07a890676)
- ci(deps): build ui artifacts for hosted deploy (58a90a9fca3b)
- build(deps): migrate reusable ui components to treeseed ui (ad74082d9935)
- build(deps): migrate reusable ui components to treeseed ui (40dd1385ca0f)
- build(deps): integrate treeseed ui (6430bcc95184)
- build(deps): make cli json output robust under capture (bd2ce21629b6)
- build(deps): stabilize agent verification under save load (cd85f5453e32)
- build(deps): finish staging save after dependency repair (a7a5c3629640)
- build(deps): Push clean hosted project repositories during save (5ae0a3e3b0aa)
- build(deps): Install project dependencies before hosted project (996d59bcab3c)
- ci(deps): Move API deployment acceptance into API package (c88aa9e71a49)
- ci(deps): Run API package acceptance in deploy workflow (a3cd1d160bc5)
- build(deps): Accept workflow API base URL for TreeDX bootstrap (83f534ba884b)
- 14 additional changes omitted from this summary.

## [0.6.26] - 2026-06-12

### Added

- feat(api): split Market backend into API package (edeeaa7652c2)

### Changed

- Adding an initial admin package. (5a8735bdb32c)
- Adding the TreeSeed UI package. (a96ef0dbd3c4)
- Updates to the TreeDX OpenAPI schema architecture. (8c1f6c10f289)
- Updates to the destroy process. (ce53d21afa55)
- Moving the TreeDB project to TreeDX. (ed86ba799df4)
- Updating the SDK and TreeDB projects from remove. (61b1060f933d)

### Fixed

- fix: recover package release orchestration (a804f6f32baa)
- fix: verify API release from clean checkout (7d67040cfa02)
- fix: remove admin api peer from release install (2c31b9b66b67)
- fix: match release dependency policy by package id (9b99d8209d51)
- fix: keep docker packages out of release dependency rewrites (a69e403b31c8)
- fix: require injected API Compose secrets (f87b76f83b9c)
- fix: align API runtime and image publishing (0d0309d3e818)
- fix: repair package release adoption (ef5a00b77521)
- build(deps): fix package deploy gate timeout and hybrid save validation (d1b039aa4d5c)
- ci(deps): fix workspace deployment install readiness (77d47e66543d)
- build(deps): fix ui pages staging reconciliation (6bd57eb151d4)
- build(deps): fix package app cloudflare auth (e7ce7ba2cdba)
- build(deps): fix package hosted config sync and api deploy environment (aee7830afa24)
- ci(deps): Fix operations runner smoke workflow script (98a0e7c5cf06)
- fix(hosting): deploy Market API services from API package (f45a684bcc7a)
- fix(web): keep deploy workflow UI-only (d9a1d898a073)
- fix(web): proxy market health checks (9fe820bdfb1f)
- fix(web): guard env access in Cloudflare runtime (b7d3a8ae1377)
- fix(deploy): pass market credential secret to web workflow (f5b6b1286e3b)
- build(deps): sync API runtime vendor fix (53795a18be1a)
- 6 additional changes omitted from this summary.

### Infrastructure

- ci: repair admin and treedx release gates (003a61d9c6a8)
- chore(api): track release workflow (001e64ff778a)
- chore(web): use web-only deploy SDK (844d43b29f71)

### Tests

- test: repair sdk release workflow assertions (e504ab73d6f5)
- test(deps): stage package submodule restructuring (493b248338db)
- ci(deps): stage package submodule restructuring (ce256844aa18)
- test(deps): build ui artifacts for hosted deploy (293b08023087)
- ci(deps): migrate reusable ui components to treeseed ui (33b5b0645385)
- build(deps): migrate reusable ui components to treeseed ui (3eb23d5ad687)
- test(deps): allow shared railway env ids in runtime boundary check (2cacf8374c42)
- ci(workflow): restrict root deployment to web-only (22279393110d)
- test(deps): Update web runtime boundary tests for API app (f6cb39483463)
- ci(deps): Save reconciliation platform and live acceptance updates (bf21884bfa2f)
- ci(deps): sync integrated package updates (87d607482a60)

### Dependencies

- build(deps): stage package submodule restructuring (a39794238d21)
- ci(deps): stage package submodule restructuring (8ab3147b8e44)
- build(deps): stage package submodule restructuring (96d3da561f53)
- ci(deps): stage package submodule restructuring (0794e57a8e7f)
- build(deps): stage package submodule restructuring (06c9412d9201)
- build(deps): document save lanes (23a90073f110)
- build(deps): add fast and promotion save lanes (7b0faba19e0a)
- build(deps): bound git dependency smoke checks (8ab07a890676)
- ci(deps): build ui artifacts for hosted deploy (58a90a9fca3b)
- build(deps): migrate reusable ui components to treeseed ui (ad74082d9935)
- build(deps): migrate reusable ui components to treeseed ui (40dd1385ca0f)
- build(deps): integrate treeseed ui (6430bcc95184)
- build(deps): make cli json output robust under capture (bd2ce21629b6)
- build(deps): stabilize agent verification under save load (cd85f5453e32)
- build(deps): finish staging save after dependency repair (a7a5c3629640)
- build(deps): Push clean hosted project repositories during save (5ae0a3e3b0aa)
- build(deps): Install project dependencies before hosted project (996d59bcab3c)
- ci(deps): Move API deployment acceptance into API package (c88aa9e71a49)
- ci(deps): Run API package acceptance in deploy workflow (a3cd1d160bc5)
- build(deps): Accept workflow API base URL for TreeDX bootstrap (83f534ba884b)
- 17 additional changes omitted from this summary.

## [0.6.25] - 2026-06-05

### Added

- feat(api): implement acceptance project template resolution (4107ec3db0ef)

### Infrastructure

- chore(starters): move starter submodules to treeseed-templates (4cc7d518732a)
- release: sync package staging heads (a876220ee863)

### Tests

- test(deps): sync integrated package updates (44b3a6813ca0)
- test(deps): sync integrated package updates (01d52c2671b7)
- build(deps): sync integrated package updates (5acd00d8c877)

### Dependencies

- Release @treeseed/market 0.6.25.
- Release package @treeseed/agent: 0.10.21.
- Release package @treeseed/cli: 0.10.22.
- Release package @treeseed/core: 0.10.22.
- Release package @treeseed/sdk: 0.10.28.

## [0.6.24] - 2026-06-04

### Infrastructure

- release: sync package staging heads (d830bbbb808a)

### Tests

- build(deps): sync integrated package updates (08a09b998908)

### Dependencies

- build(deps): sync integrated package updates (4f328bebbc51)
- Release @treeseed/market 0.6.24.
- Release package @treeseed/agent: 0.10.20.
- Release package @treeseed/cli: 0.10.21.
- Release package @treeseed/core: 0.10.21.
- Release package @treeseed/sdk: 0.10.27.

## [0.6.23] - 2026-06-04

### Fixed

- fix(deps): sync integrated package updates (f6c79559dae1)

### Infrastructure

- release: sync package staging heads (39a8af3bbb4b)

### Tests

- ci(workflow): refactor CI pipelines and update package dependencies (36b3183e18d0)
- test(deps): sync integrated package updates (4771762f609e)
- build(deps): sync integrated package updates (d8bd7553bffb)

### Dependencies

- build(deps): sync integrated package updates (46a0e134e145)
- build(deps): sync integrated package updates (c46b81bbc040)
- chore(deps): update submodules and dependency pointers (6d2148f46f2a)
- build(deps): sync integrated package updates (23651f8120f6)
- build(deps): bump workspace dependencies and submodules (fdfe0d23a0e9)
- build(deps): sync integrated package updates (73251344a179)
- Release @treeseed/market 0.6.23.
- Release package @treeseed/agent: 0.10.19.
- Release package @treeseed/cli: 0.10.20.
- Release package @treeseed/core: 0.10.20.
- Release package @treeseed/sdk: 0.10.26.

## [0.6.22] - 2026-06-02

### Changed

- Updating the favicon. (d1473ae08b5c)

### Infrastructure

- Adding the information hub template as a submodule. (553e243a8f37)
- Adding the engineering template as a submodule. (710cedfc723a)
- Adding the research template as a submodule. (a8ee786fdaeb)
- release: sync package staging heads (728c5b2381a4)

### Tests

- test(deps): sync integrated package updates (2c067dbf35f1)
- build(deps): sync integrated package updates (56adac948b61)

### Dependencies

- ci(deps): sync integrated package updates (0296a20b5f31)
- Release @treeseed/market 0.6.22.
- Release package @treeseed/agent: 0.10.18.
- Release package @treeseed/cli: 0.10.18.
- Release package @treeseed/core: 0.10.18.
- Release package @treeseed/sdk: 0.10.24.

## [0.6.21] - 2026-06-02

### Added

- feat(deployment): display readiness blockers as hints (794d0abd9096)
- feat(api): implement hub launch application orchestration (103f21fd095f)

### Fixed

- fix(deps): sync integrated package updates (dc0c1b39f7aa)

### Tests

- test(operational-ia): update expected deployment URL patterns (c66cd7269340)
- build(deps): sync integrated package updates (a7791c6e887a)

### Dependencies

- chore(deps): update workspace packages and submodule pointers (d2afe4544893)
- build(deps): sync integrated package updates (3bee996fdad9)
- build(deps): update internal packages and submodules (40dedc51f1c5)
- chore(deps): update internal packages and submodule pointers (80b1e61eed51)
- build(deps): sync integrated package updates (016b9855bfb9)
- build(deps): avoid Railway volume update after attach (0515be09f1c8)
- build(deps): harden Railway runner volume reconciliation (860a42135a04)
- Release @treeseed/market 0.6.21.
- Release package @treeseed/agent: 0.10.17.
- Release package @treeseed/cli: 0.10.17.
- Release package @treeseed/core: 0.10.17.
- Release package @treeseed/sdk: 0.10.23.

## [0.6.20] - 2026-05-28

### Dependencies

- build(deps): harden provider cleanup api calls for clean destroy (2e2e8e13da51)
- build(deps): wait for delayed Railway service instances before (d42fba82760c)
- Release @treeseed/market 0.6.20.
- Release package @treeseed/agent: 0.10.16.
- Release package @treeseed/cli: 0.10.16.
- Release package @treeseed/core: 0.10.16.
- Release package @treeseed/sdk: 0.10.22.

## [0.6.19] - 2026-05-28

### Dependencies

- build(deps): force fresh deployed-resource verification on staging save (8f8fbabdee56)
- build(deps): bump internal packages to staging versions (2bd58f7e2f62)
- Release @treeseed/market 0.6.19.
- Release package @treeseed/agent: 0.10.15.
- Release package @treeseed/cli: 0.10.15.
- Release package @treeseed/core: 0.10.15.
- Release package @treeseed/sdk: 0.10.21.

## [0.6.18] - 2026-05-28

### Dependencies

- build(deps): redeploy staging from clean provider state (9aec2f58fe14)
- build(deps): allow railway context link by project id (b485c0a54d06)
- build(deps): link railway context before cli volume fallback (6d3db026b641)
- build(deps): fallback railway environment creation when API is opaque (8a7c236e2969)
- Release @treeseed/market 0.6.18.
- Release package @treeseed/agent: 0.10.14.
- Release package @treeseed/cli: 0.10.14.
- Release package @treeseed/core: 0.10.14.
- Release package @treeseed/sdk: 0.10.20.

## [0.6.17] - 2026-05-28

### Dependencies

- build(deps): stabilize clean redeploy railway volume verification (852f8d22fb68)
- build(deps): update subpackages to handle mounted railway volumes (3cf9287f2cab)
- build(deps): attach railway runner volume before verifying mount (eca52fd9270d)
- build(deps): wait for railway service instance config to settle (6e581c078438)
- Release @treeseed/market 0.6.17.
- Release package @treeseed/agent: 0.10.13.
- Release package @treeseed/cli: 0.10.13.
- Release package @treeseed/core: 0.10.13.
- Release package @treeseed/sdk: 0.10.19.

## [0.6.16] - 2026-05-28

### Dependencies

- build(deps): use railway cli volume path for runner reconcile (2faac5e6a605)
- build(deps): do not create replacement volumes for railway postgres (7fb2d84f2742)
- build(deps): reuse railway managed postgres volume after not authorized (bf7be1c37b1a)
- build(deps): reuse railway postgres volume after create conflict (4fb493ec20b0)
- build(deps): wait for new railway service instances before runtime (fb6a57bc9e38)
- Release @treeseed/market 0.6.16.
- Release package @treeseed/agent: 0.10.12.
- Release package @treeseed/cli: 0.10.12.
- Release package @treeseed/core: 0.10.12.
- Release package @treeseed/sdk: 0.10.18.

## [0.6.15] - 2026-05-28

### Added

- feat(deps): debug staging save from clean provider state (ae37e30fa8c3)

### Infrastructure

- release: sync package staging heads (4f3a20b3ed49)

### Tests

- test(deps): allow repeatable staging capacity acceptance (96db33a0477f)
- test(deps): debug staging save from clean provider state (cce9ba104e8f)
- test(deps): debug staging save from clean provider state (5db1e0601d13)

### Dependencies

- build(deps): retry railway volume attach during clean redeploy (f6245c9028fc)
- build(deps): bump internal packages to staging versions (38127ee0ade0)
- build(deps): make staging acceptance repeatable after clean redeploy (952f15d5f08d)
- build(deps): debug staging save from clean provider state (726c236ea74d)
- build(deps): debug staging save from clean provider state (d73947e5ce9c)
- ci(deps): debug staging save from clean provider state (84f0cec0dbbf)
- ci(deps): debug staging save from clean provider state (ad3f7334c104)
- build(deps): debug staging save from clean provider state (5e2be10f90c8)
- build(deps): debug staging save from clean provider state (984545ba3a60)
- build(deps): debug staging save from clean provider state (dc6f3e41f415)
- build(deps): debug staging save from clean provider state (95d5e258ba34)
- build(deps): debug staging save from clean provider state (8b035784d8e5)
- build(deps): debug staging save from clean provider state (4e1e7f55ba11)
- build(deps): debug staging save from clean provider state (2521d7e0f21b)
- Release @treeseed/market 0.6.15.
- Release package @treeseed/agent: 0.10.11.
- Release package @treeseed/cli: 0.10.11.
- Release package @treeseed/core: 0.10.11.
- Release package @treeseed/sdk: 0.10.17.

## [0.6.14] - 2026-05-27

### Fixed

- Fix browser session API auth forwarding (39445c62be9b)

### Infrastructure

- release: sync package staging heads (153f7e2afde9)

### Dependencies

- Release @treeseed/market 0.6.14.
- Release package @treeseed/agent: 0.10.10.
- Release package @treeseed/cli: 0.10.10.
- Release package @treeseed/core: 0.10.10.
- Release package @treeseed/sdk: 0.10.16.

## [0.6.13] - 2026-05-27

### Added

- feat(auth): support TLS and STARTTLS in Node SMTP fallback (23242720ab9b)
- feat(deps): sync integrated package updates (8eff2e2b3e3e)
- feat(deps): sync integrated package updates (5db4ff14be7f)
- feat(auth): include email delivery error details in non-prod responses (01c1a6e7b9a4)
- feat(auth): improve SMTP authentication and error classification (b902cf224803)

### Changed

- Keep SMTP env ownership unique (05dc78e76588)
- Align password reset acceptance expectation (b05006c05e1f)

### Fixed

- Fix acceptance test type check (ffbd40544a10)
- fix(api): normalize authentication token timestamps (75b3f0d39f3e)

### Tests

- test(deps): sync integrated package updates (6f1685fabf2f)
- ci(tests): record repository changes (7ed4e683f3a8)

### Dependencies

- chore(deps): update treeseed dependencies and core submodule (c85cee0501d8)
- refactor(scripts): use fetchWithTimeout in market-acceptance script (605746addab5)
- build(deps): sync integrated package updates (eadab1e5d6e2)
- refactor(api): conditionally expose auth diagnostic details (fa58e0e6984b)
- chore(deps): bump internal package versions (6da636b6a62b)
- Release @treeseed/market 0.6.13.
- Release package @treeseed/agent: 0.10.9.
- Release package @treeseed/cli: 0.10.9.
- Release package @treeseed/core: 0.10.9.
- Release package @treeseed/sdk: 0.10.15.

## [0.6.12] - 2026-05-27

### Infrastructure

- release: sync package staging heads (2a9c6424cd36)

### Tests

- build(deps): sync integrated package updates (3336958ce663)

### Dependencies

- Release @treeseed/market 0.6.12.
- Release package @treeseed/agent: 0.10.8.
- Release package @treeseed/cli: 0.10.8.
- Release package @treeseed/core: 0.10.8.
- Release package @treeseed/sdk: 0.10.14.

## [0.6.11] - 2026-05-27

### Added

- feat(api): support bypassing email delivery for acceptance tests (fe85028d3c05)
- feat(api): require confirmation for account deletion (9e47469ccc8a)
- feat(market): implement web deployment, authentication, and team (b249f927cb75)

### Fixed

- fix(deps): sync integrated package updates (86379958a615)

### Infrastructure

- ci(ci): serialize market deploy acceptance workflows (151b09b9a100)
- release: sync package staging heads (50ac36a7b290)

### Tests

- chore(deps): update treeseed dependencies and core submodule (bb3186725887)
- build(deps): sync integrated package updates (822cad9e37cb)
- build(deps): sync integrated package updates (301eb511f72a)

### Dependencies

- refactor(auth): extract account deletion confirmation to separate file (17d2135c8c5d)
- refactor(api): use resolved config for email delivery bypass (caf5ccad96f6)
- build(deps): sync integrated package updates (e459be9e4c33)
- chore(workspace): bump package versions and submodule pointers (47a5e6ca4db2)
- build(deps): sync integrated package updates (80a78284ab49)
- build(deps): update internal package dependencies and submodules (497e4ceef096)
- Release @treeseed/market 0.6.11.
- Release package @treeseed/agent: 0.10.7.
- Release package @treeseed/cli: 0.10.7.
- Release package @treeseed/core: 0.10.7.
- Release package @treeseed/sdk: 0.10.13.

## [0.6.10] - 2026-05-24

### Added

- feat(market): complete dynamic capacity budgeting (5d99983cce95)

### Fixed

- fix(deps): sdk template source reuse (fc5d6a6a1570)
- build(deps): fix sdk acceptance capacity method arguments (6fa3efe55c29)
- docs(deps): fix markdown cleanup for staging deploy (06831f1e2ee6)

### Infrastructure

- release: sync package staging heads (b71f8438d7bc)

### Tests

- test(deps): stabilize market api release candidate test (3b584c0ecf40)
- build(deps): add market postgres baseline adoption columns (e1821f586449)
- build(deps): make market postgres baseline adopt existing schema (6dac1dc73a6c)
- build(deps): make static hub d1 baseline idempotent (80f3dca60fb8)

### Dependencies

- Release @treeseed/market 0.6.10.
- Release package @treeseed/agent: 0.10.6.
- Release package @treeseed/cli: 0.10.6.
- Release package @treeseed/core: 0.10.6.
- Release package @treeseed/sdk: 0.10.12.

## [0.6.9] - 2026-05-23

### Added

- feat(api): implement v1/ui projection endpoints and update auth paths (29afa2744b55)

### Infrastructure

- release: sync package staging heads (53899f1cf395)

### Tests

- test(tests): cover workflow behavior (02e524d8e05b)
- test(tests): cover workflow behavior (77eb9ec0b963)
- test(api): assert UI projection approval fixture exists (33ae047a97d3)

### Dependencies

- build(source): update package metadata (c9bd84f31d48)
- Release @treeseed/market 0.6.9.
- Release package @treeseed/agent: 0.10.5.
- Release package @treeseed/cli: 0.10.5.
- Release package @treeseed/core: 0.10.5.
- Release package @treeseed/sdk: 0.10.11.

## [0.6.8] - 2026-05-23

### Added

- feat(acceptance): implement exact status matching and case expansion (ed5dca6578ab)

### Infrastructure

- release: sync package staging heads (52ca12b88d23)

### Tests

- test(acceptance): add completeWebPasswordReset to sdkMethodMatrices (951257ab8cd8)

### Dependencies

- build(build): update package metadata (7b0e16aa1c93)
- Release @treeseed/market 0.6.8.
- Release package @treeseed/agent: 0.10.4.
- Release package @treeseed/cli: 0.10.4.
- Release package @treeseed/core: 0.10.4.
- Release package @treeseed/sdk: 0.10.10.

## [0.6.7] - 2026-05-23

### Added

- feat(api): add marketSteward to actor descriptors (3585d2ac28b8)
- feat(api): record repository changes (92ac589dec4d)

### Dependencies

- build(deps): sync integrated package updates (71d85c050447)
- Release @treeseed/market 0.6.7.
- Release package @treeseed/agent: 0.10.3.
- Release package @treeseed/cli: 0.10.3.
- Release package @treeseed/core: 0.10.3.
- Release package @treeseed/sdk: 0.10.9.

## [0.6.6] - 2026-05-22

### Added

- feat(deps): sync integrated package updates (e2ad4255b222)
- feat(api): improve postgres translation and route descriptors (6210bdac9816)
- feat(api): add conflict targets for permissions and roles (036b7be183ec)

### Infrastructure

- release: sync package staging heads (fb84776e286d)

### Tests

- build(deps): sync integrated package updates (3917735f0a89)
- ci(deps): sync integrated package updates (2c37fe75a267)
- ci(deps): sync integrated package updates (467738b73979)

### Dependencies

- chore(deps): bump internal packages and add Railway CI env vars (58f1fcd903a3)
- ci(deploy): update acceptance service credential fallbacks (61b622c569d6)
- ci(deps): sync integrated package updates (5806fb4c0d7b)
- Release @treeseed/market 0.6.6.
- Release package @treeseed/agent: 0.10.2.
- Release package @treeseed/cli: 0.10.2.
- Release package @treeseed/core: 0.10.2.
- Release package @treeseed/sdk: 0.10.8.

## [0.6.5] - 2026-05-22

### Infrastructure

- release: sync package staging heads (a3ef78d01a64)

### Tests

- ci(deps): sync integrated package updates (3e8276b93b67)
- build(deps): sync integrated package updates (2003b857f68c)

### Dependencies

- Release @treeseed/market 0.6.5.
- Release package @treeseed/agent: 0.10.1.
- Release package @treeseed/cli: 0.10.1.
- Release package @treeseed/core: 0.10.1.
- Release package @treeseed/sdk: 0.10.7.

## [0.6.4] - 2026-05-21

### Fixed

- fix(deps): rehearse repair releases against stable dependencies (c2c969f4c4bf)
- fix(deps): allow release-line repair selector (9aeeb4832f1b)
- fix(deps): keep release package lines aligned (32a10b53b4a1)

### Infrastructure

- release: sync package staging heads (37d652a03fb1)

### Dependencies

- Release @treeseed/market 0.6.4.
- Release package @treeseed/agent: 0.10.0.
- Release package @treeseed/cli: 0.10.0.
- Release package @treeseed/core: 0.10.0.

## [0.6.3] - 2026-05-21

### Infrastructure

- release: sync package staging heads (f2df25db378a)

### Dependencies

- build(deps): record published sdk release pointer (290d9c8aa9b2)
- build(deps): fail package release when npm publish fails (d8422694bbf8)
- Release @treeseed/market 0.6.3.
- Release package @treeseed/agent: 0.9.3.
- Release package @treeseed/cli: 0.9.3.
- Release package @treeseed/core: 0.9.4.
- Release package @treeseed/sdk: 0.10.6.

## [0.6.2] - 2026-05-20

### Infrastructure

- release: sync package staging heads (d53e9bf4da34)

### Dependencies

- build(deps): create github releases for package publishes (95d82d472a07)
- Release @treeseed/market 0.6.2.
- Release package @treeseed/agent: 0.9.2.
- Release package @treeseed/cli: 0.9.2.
- Release package @treeseed/core: 0.9.3.
- Release package @treeseed/sdk: 0.10.4.

## [0.6.1] - 2026-05-20

### Fixed

- build(deps): tolerate npm scoped package permission 404 (41d103647c7e)
- build(deps): make package publish tolerate unprovisioned npm scope (1508ae66beaf)

### Infrastructure

- release: sync package staging heads (f1c89426038e)

### Tests

- ci(deps): complete capacity provider migration (281b00de503b)

### Dependencies

- build(deps): release internal packages from stable git tags (62a08bafa440)
- Release @treeseed/market 0.6.1.
- Release package @treeseed/agent: 0.9.1.
- Release package @treeseed/cli: 0.9.1.
- Release package @treeseed/core: 0.9.2.
- Release package @treeseed/sdk: 0.10.3.

## [0.6.0] - 2026-05-19

### Added

- feat(market): implement agent runtime state and work management UI (d475964eec49)
- feat(app): implement operational mission control, governance, (8462c94ca4f5)
- feat(market): update dependencies and documentation (0e391c31afa1)

### Changed

- docs: promote knowledge:market-ui-work-content-management-interface-mdx (ef8a521ddfe0)
- docs: promote knowledge:market-ui-work-content-management-interface-mdx (ae405b0e4be3)
- docs: promote knowledge:market-ui-work-content-management-interface-mdx (f9a6bd0b750a)
- docs: promote knowledge:sdk-graph-context-query-agent-research-mdx (cad346f75a61)
- docs: promote knowledge:agent-runtime-workdays-agent-runtime-workday-mdx (00649874e551)
- docs: promote knowledge:market-ui-governance-operational-governance-mdx (5ab32be97a10)
- docs: promote knowledge:core-knowledge-hub-rendering-publishing-mdx (75c1e013fe11)
- docs: promote knowledge:documentation-automation-research-to-knowledge-code-evidence-mdx (2a7740aaee47)
- docs: promote knowledge:market-ui-mission-control-governance-summary-mdx (ea784b401dba)
- docs: promote knowledge:governance-approvals-state-flow-mdx (ccb18b572162)
- docs: promote knowledge:documentation-automation-mutations-codex-docs-boundaries-mdx (08e0abd340a7)
- docs: promote knowledge:cli-dev-manager-docs-automation-mode-mdx (bf77918e804c)
- docs: promote knowledge:cli-dev-local-surfaces-mdx (744a07cfb0a3)
- Updates to the agent AI development prompt. (829712aad034)
- Adding an initial agent AI development prompt. (c669bdd79b7e)

### Fixed

- fix(deps): sync integrated package updates (5e6f53014fb3)
- docs(knowledge): update documentation (073160edbe1b)

### Infrastructure

- release: sync package staging heads (95378e0d71a0)

### Tests

- ci(deps): sync integrated package updates (b396076959f3)
- build(deps): sync integrated package updates (91088885c4f9)
- build(deps): sync integrated package updates (b87f1f10347a)
- chore(market): update @treeseed/cli dependency and refactor seeds (5a0585e8443e)

### Dependencies

- build(deps): sync integrated package updates (a87aed663402)
- Release @treeseed/market 0.6.0.
- Release package @treeseed/agent: 0.9.0.
- Release package @treeseed/cli: 0.9.0.
- Release package @treeseed/core: 0.9.0.
- Release package @treeseed/sdk: 0.9.0.

## [0.5.18] - 2026-05-16

### Added

- feat(tests): record repository changes (06060ce61ec6)

### Infrastructure

- release: sync package staging heads (02bd9a15a9a6)

### Dependencies

- Release @treeseed/market 0.5.18.
- Release package @treeseed/agent: 0.8.19.
- Release package @treeseed/cli: 0.8.19.
- Release package @treeseed/core: 0.8.19.
- Release package @treeseed/sdk: 0.8.19.

## [0.5.17] - 2026-05-16

### Added

- feat(tests): record repository changes (6ec8ceb409da)

### Infrastructure

- release: sync package staging heads (5995ada917f6)

### Dependencies

- Release @treeseed/market 0.5.17.
- Release package @treeseed/agent: 0.8.18.
- Release package @treeseed/cli: 0.8.18.
- Release package @treeseed/core: 0.8.18.
- Release package @treeseed/sdk: 0.8.18.

## [0.5.16] - 2026-05-16

### Infrastructure

- release: sync package staging heads (6eee8112b34b)

### Tests

- build(deps): sync integrated package updates (b699dfe8a557)

### Dependencies

- Release @treeseed/market 0.5.16.
- Release package @treeseed/agent: 0.8.17.
- Release package @treeseed/cli: 0.8.17.
- Release package @treeseed/core: 0.8.17.
- Release package @treeseed/sdk: 0.8.17.

## [0.5.15] - 2026-05-15

### Infrastructure

- release: sync package staging heads (1b0358d3fffa)

### Tests

- ci(deps): sync integrated package updates (2f9fcb313762)

### Dependencies

- Release @treeseed/market 0.5.15.
- Release package @treeseed/agent: 0.8.16.
- Release package @treeseed/cli: 0.8.16.
- Release package @treeseed/core: 0.8.16.
- Release package @treeseed/sdk: 0.8.16.

## [0.5.14] - 2026-05-15

### Added

- feat(api): implement device flow approval redirection and improved body (46e8cc4b892a)
- feat(config): record repository changes (c42b16f3ae69)

### Infrastructure

- release: sync package staging heads (a946d953ba91)

### Dependencies

- Release @treeseed/market 0.5.14.
- Release package @treeseed/agent: 0.8.15.
- Release package @treeseed/cli: 0.8.15.
- Release package @treeseed/core: 0.8.15.
- Release package @treeseed/sdk: 0.8.15.

## [0.5.13] - 2026-05-15

### Fixed

- fix(deps): sync integrated package updates (4074eca776d9)

### Infrastructure

- release: sync package staging heads (660b1d779c0c)

### Tests

- test(deps): sync integrated package updates (d4bf424acfc4)
- build(deps): sync integrated package updates (81d0cd6df5a1)
- build(deps): sync integrated package updates (f271b8a04376)
- build(deps): sync integrated package updates (3dce07a7583e)

### Dependencies

- Release @treeseed/market 0.5.13.
- Release package @treeseed/agent: 0.8.14.
- Release package @treeseed/cli: 0.8.14.
- Release package @treeseed/core: 0.8.14.
- Release package @treeseed/sdk: 0.8.14.

## [0.5.12] - 2026-05-14

### Infrastructure

- release: sync package staging heads (8a0498f98604)

### Tests

- build(deps): sync integrated package updates (954fbf36df2a)

### Dependencies

- Release @treeseed/market 0.5.12.
- Release package @treeseed/agent: 0.8.13.
- Release package @treeseed/cli: 0.8.13.
- Release package @treeseed/core: 0.8.13.
- Release package @treeseed/sdk: 0.8.13.

## [0.5.11] - 2026-05-14

### Added

- feat(capacity): implement capacity scheduling and estimation learning (d6a58268c178)

### Changed

- Adding a temporary agent-budget specification. (62c3cf654558)

### Infrastructure

- release: sync package staging heads (a5788deed981)

### Tests

- build(deps): sync integrated package updates (1f26ee9427b5)

### Dependencies

- Release @treeseed/market 0.5.11.
- Release package @treeseed/agent: 0.8.12.
- Release package @treeseed/cli: 0.8.12.
- Release package @treeseed/core: 0.8.12.
- Release package @treeseed/sdk: 0.8.12.

## [0.5.10] - 2026-05-13

### Added

- feat(market): implement agent research and Codex provider infrastructure (f9b17f78d92a)

### Infrastructure

- release: sync package staging heads (bfade2363171)

### Dependencies

- build(deps): sync integrated package updates (ae02bf531263)
- build(deps): sync integrated package updates (ddf4a0bf7aa1)
- Release @treeseed/market 0.5.10.
- Release package @treeseed/agent: 0.8.11.
- Release package @treeseed/cli: 0.8.11.
- Release package @treeseed/core: 0.8.11.
- Release package @treeseed/sdk: 0.8.11.

## [0.5.9] - 2026-05-13

### Added

- feat(auth): update authentication UI and layouts (c3ed71ab1fa1)

### Infrastructure

- release: sync package staging heads (248b8d08a4d2)

### Dependencies

- Release @treeseed/market 0.5.9.
- Release package @treeseed/agent: 0.8.10.
- Release package @treeseed/cli: 0.8.10.
- Release package @treeseed/core: 0.8.10.
- Release package @treeseed/sdk: 0.8.10.

## [0.5.8] - 2026-05-12

### Added

- feat(market): rename branding from Knowledge Coop to TreeSeed (9376cf4aa721)

### Infrastructure

- release: sync package staging heads (dffa4f7e35ad)

### Tests

- build(market): update dependencies and extend team capacity API (980ec0e5daae)

### Dependencies

- build(market): update dependencies and refactor account settings (ee29cdfb3b0a)
- build(deps): sync integrated package updates (c9284cf3a8cd)
- build(deps): sync integrated package updates (b470fa14bcd5)
- Release @treeseed/market 0.5.8.
- Release package @treeseed/agent: 0.8.9.
- Release package @treeseed/cli: 0.8.9.
- Release package @treeseed/core: 0.8.9.
- Release package @treeseed/sdk: 0.8.9.

## [0.5.7] - 2026-05-11

### Added

- feat(agent): implement provider registration and update capacity routing (f7698daaa9cc)

### Infrastructure

- release: sync package staging heads (36ed5da3ab8d)

### Dependencies

- build(deps): sync integrated package updates (c628316a325b)
- Release @treeseed/market 0.5.7.
- Release package @treeseed/agent: 0.8.8.
- Release package @treeseed/cli: 0.8.8.
- Release package @treeseed/core: 0.8.8.
- Release package @treeseed/sdk: 0.8.8.

## [0.5.6] - 2026-05-11

### Fixed

- build(deps): sync integrated package updates (bbd556794270)

### Infrastructure

- release: sync package staging heads (98cd112727da)

### Dependencies

- build(deps): sync integrated package updates (57a172a25bb2)
- build(deps): sync integrated package updates (afa986c53f69)
- Release @treeseed/market 0.5.6.
- Release package @treeseed/agent: 0.8.7.
- Release package @treeseed/cli: 0.8.7.
- Release package @treeseed/core: 0.8.7.
- Release package @treeseed/sdk: 0.8.7.

## [0.5.5] - 2026-05-11

### Infrastructure

- release: sync package staging heads (cdf3854a7484)

### Tests

- ci(ci): record repository changes (eb331a02ed5a)

### Dependencies

- build(deps): sync integrated package updates (c3b2f2f3148b)
- build(deps): sync integrated package updates (aea19cc661b7)
- Release @treeseed/market 0.5.5.
- Release package @treeseed/agent: 0.8.6.
- Release package @treeseed/cli: 0.8.6.
- Release package @treeseed/core: 0.8.6.
- Release package @treeseed/sdk: 0.8.6.

## [0.5.4] - 2026-05-11

### Changed

- Updating the agent package version (to start fresh development integration). (f377eb6fe47d)
- Readding the agent package. (46b370622275)

### Fixed

- fix(deps): sync integrated package updates (881de43ade79)
- build(deps): sync integrated package updates (0cd392217ff7)

### Infrastructure

- release: sync package staging heads (535400b23af9)

### Tests

- ci(deps): sync integrated package updates (4aa649231687)
- build(deps): sync integrated package updates (a77d7113e5c3)
- build(root): update package versions and site configuration (6b630bdb6869)
- build(deps): sync integrated package updates (833e5968cb7e)
- ci(deps): sync integrated package updates (28e644580bc4)
- build(deps): sync integrated package updates (a62e08b71acd)
- ci(deps): sync integrated package updates (d6d4473890c4)
- ci(deps): sync integrated package updates (fd320522455f)
- build(ci): add workflow plane variables and update package dependencies (7b58715479e4)
- test(deps): sync integrated package updates (c6536ba0bfbe)
- chore(ci): refactor deployment workflows and update package dependencies (6f236aad0311)

### Dependencies

- ci(deps): sync integrated package updates (21f46238af8c)
- build(deps): sync integrated package updates (d439c59f769b)
- build(deps): sync integrated package updates (44b0c19fc3f5)
- build(deps): sync integrated package updates (6dfa0d75337a)
- build(deps): sync integrated package updates (af3d700938fa)
- build(deps): sync package versions and update deployment workflows (d8cc5db9cb53)
- ci(deps): sync integrated package updates (19fb7b3ea712)
- build(deps): sync integrated package updates (a37c275c5c35)
- build(deps): sync integrated package updates (297b336f054a)
- build(deps): sync integrated package updates (288fa42fc676)
- build(deps): sync integrated package updates (eb1130848b5b)
- build(deps): sync integrated package updates (a0ee50842bf2)
- build(deps): sync integrated package updates (1dca125c3465)
- build(deps): sync integrated package updates (24431a79432d)
- build(deps): sync integrated package updates (ce16b80f3f3c)
- build(deps): sync integrated package updates (3fcf93421da5)
- build(deps): sync integrated package updates (7ff4a85b806d)
- build(deps): sync integrated package updates (3208cdcfc67e)
- build(deps): sync integrated package updates (9fc55c142312)
- build(deps): sync integrated package updates (7de407f3ff3a)
- 30 additional changes omitted from this summary.

## [0.5.3] - 2026-05-10

### Dependencies

- build(deps): sync integrated package updates (7a9c12b10603)
- build(deps): sync integrated package updates (9ce7fe447fd0)
- Release @treeseed/market 0.5.3.
- Release package @treeseed/cli: 0.8.3.
- Release package @treeseed/core: 0.8.3.
- Release package @treeseed/sdk: 0.8.3.

## [0.5.2] - 2026-05-10

### Infrastructure

- release: sync package staging heads (d46476676247)

### Dependencies

- build(market): update dependencies and implement hosting audit workflow (19203f811ef8)
- Release @treeseed/market 0.5.2.
- Release package @treeseed/cli: 0.8.2.
- Release package @treeseed/core: 0.8.2.
- Release package @treeseed/sdk: 0.8.2.

## [0.5.1] - 2026-05-09

### Infrastructure

- docs(source): update workflow documentation (5c7e1bae4e4e)
- release: sync package staging heads (a8712ce651be)

### Dependencies

- Release @treeseed/market 0.5.1.
- Release package @treeseed/cli: 0.8.1.
- Release package @treeseed/core: 0.8.1.
- Release package @treeseed/sdk: 0.8.1.

## [0.5.0] - 2026-05-09

### Dependencies

- build(deps): sync integrated package updates (f16b54b8a3c9)
- Release @treeseed/market 0.5.0.
- Release package @treeseed/cli: 0.8.0.
- Release package @treeseed/core: 0.8.0.
- Release package @treeseed/sdk: 0.8.0.

## [0.4.0] - 2026-05-09

### Infrastructure

- release: sync package staging heads (9aa53b2e75c2)

### Tests

- build(deps): sync integrated package updates (e7111a375a7f)

### Dependencies

- Release @treeseed/market 0.4.0.
- Release package @treeseed/cli: 0.7.0.
- Release package @treeseed/core: 0.7.0.
- Release package @treeseed/sdk: 0.7.0.

## [0.3.44] - 2026-05-09

### Infrastructure

- release: sync package staging heads (617d4294db7f)

### Dependencies

- build(deps): sync integrated package updates (257f51d57975)
- Release @treeseed/market 0.3.44.
- Release package @treeseed/cli: 0.6.47.
- Release package @treeseed/core: 0.6.50.
- Release package @treeseed/sdk: 0.6.51.

## [0.3.43] - 2026-05-08

### Infrastructure

- release: sync package staging heads (0a611164accf)

### Dependencies

- chore(deps): update @treeseed/cli (ae0b180e2ece)
- Release @treeseed/market 0.3.43.
- Release package @treeseed/cli: 0.6.46.
- Release package @treeseed/core: 0.6.49.
- Release package @treeseed/sdk: 0.6.50.

## [0.3.42] - 2026-05-08

### Dependencies

- build(deps): sync integrated package updates (fa1c6f4c9446)
- Release @treeseed/market 0.3.42.
- Release package @treeseed/cli: 0.6.45.
- Release package @treeseed/core: 0.6.48.
- Release package @treeseed/sdk: 0.6.49.

## [0.3.41] - 2026-05-08

### Dependencies

- build(deps): sync integrated package updates (a397f6f9395a)
- Release @treeseed/market 0.3.41.
- Release package @treeseed/cli: 0.6.44.
- Release package @treeseed/core: 0.6.47.
- Release package @treeseed/sdk: 0.6.48.

## [0.3.40] - 2026-05-08

### Dependencies

- build(deps): sync integrated package updates (da2426c425ff)
- Release @treeseed/market 0.3.40.
- Release package @treeseed/cli: 0.6.43.
- Release package @treeseed/core: 0.6.46.
- Release package @treeseed/sdk: 0.6.47.

## [0.3.39] - 2026-05-08

### Dependencies

- build(deps): sync integrated package updates (8e3ace42d61b)
- Release @treeseed/market 0.3.39.
- Release package @treeseed/cli: 0.6.42.
- Release package @treeseed/core: 0.6.45.
- Release package @treeseed/sdk: 0.6.46.

## [0.3.38] - 2026-05-08

### Infrastructure

- release: sync package staging heads (483778e5c94e)

### Dependencies

- build(deps): sync integrated package updates (099869c86996)
- Release @treeseed/market 0.3.38.
- Release package @treeseed/cli: 0.6.41.
- Release package @treeseed/core: 0.6.44.
- Release package @treeseed/sdk: 0.6.45.

## [0.3.37] - 2026-05-08

### Infrastructure

- release: sync package staging heads (0bc577aaf53a)

### Dependencies

- build(deps): sync integrated package updates (c1ce9e06a678)
- Release @treeseed/market 0.3.37.
- Release package @treeseed/cli: 0.6.40.
- Release package @treeseed/core: 0.6.43.
- Release package @treeseed/sdk: 0.6.44.

## [0.3.36] - 2026-05-08

### Infrastructure

- release: sync package staging heads (0167670921a0)

### Dependencies

- build(deps): sync integrated package updates (1fe4e8a0c313)
- Release @treeseed/market 0.3.36.
- Release package @treeseed/cli: 0.6.39.
- Release package @treeseed/core: 0.6.42.
- Release package @treeseed/sdk: 0.6.43.

## [0.3.35] - 2026-05-08

### Infrastructure

- release: sync package staging heads (fee2479f5607)

### Dependencies

- build(deps): sync integrated package updates (521c1e8eb401)
- Release @treeseed/market 0.3.35.
- Release package @treeseed/cli: 0.6.38.
- Release package @treeseed/core: 0.6.41.
- Release package @treeseed/sdk: 0.6.42.

## [0.3.34] - 2026-05-08

### Dependencies

- build(deps): sync integrated package updates (308b54b42f37)
- Release @treeseed/market 0.3.34.
- Release package @treeseed/cli: 0.6.37.
- Release package @treeseed/core: 0.6.40.
- Release package @treeseed/sdk: 0.6.41.

## [0.3.33] - 2026-05-08

### Added

- feat(market): implement capacity management and provider infrastructure (ca9ae8e8c2b6)

### Fixed

- fix(auth): allow disabling email verification (868569ecbfa7)

### Infrastructure

- release: sync package staging heads (bb94279adead)

### Tests

- build(deps): sync integrated package updates (5bc98fa4969a)
- build(deps): sync integrated package updates (f95738669b13)
- ci(deps): sync integrated package updates (28a391d8884d)
- build(deps): sync integrated package updates (ec61604a7f17)

### Dependencies

- build(deps): add provider cli wrappers and refresh railway sdk lock (e504754b21dd)
- build(deps): sync integrated package updates (8735743dd1e3)
- build(deps): sync integrated package updates (bf4feafafa59)
- Release @treeseed/market 0.3.33.
- Release package @treeseed/cli: 0.6.36.
- Release package @treeseed/core: 0.6.39.
- Release package @treeseed/sdk: 0.6.40.

## [0.3.32] - 2026-05-07

### Infrastructure

- release: sync package staging heads (38bf05fa6f87)

### Dependencies

- build(deps): sync integrated package updates (348e8e6f5382)
- Release @treeseed/market 0.3.32.
- Release package @treeseed/cli: 0.6.35.
- Release package @treeseed/core: 0.6.38.
- Release package @treeseed/sdk: 0.6.39.

## [0.3.31] - 2026-05-07

### Infrastructure

- release: sync package staging heads (75fa551aef75)

### Dependencies

- ci(deps): sync integrated package updates (975fbab0f41c)
- Release @treeseed/market 0.3.31.
- Release package @treeseed/cli: 0.6.34.
- Release package @treeseed/core: 0.6.37.
- Release package @treeseed/sdk: 0.6.38.
