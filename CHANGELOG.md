# Changelog

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
