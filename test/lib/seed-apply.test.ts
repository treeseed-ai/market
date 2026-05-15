import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { NodeSqliteD1Database } from '@treeseed/sdk/db/node-sqlite';
import { MarketControlPlaneStore } from '../../src/api/store.js';
import { applyLocalSeedFromCli, exportSeedWithStore } from '../../src/lib/market/seeds/apply.js';
import { loadTeamSectionData } from '../../src/lib/market/team-section-data.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const tempDirs: string[] = [];

function createStore() {
	const dir = mkdtempSync(resolve(tmpdir(), 'treeseed-seed-apply-'));
	tempDirs.push(dir);
	const db = new NodeSqliteD1Database(dir);
	const store = new MarketControlPlaneStore({
		repoRoot: projectRoot,
		projectId: 'treeseed-market-test',
		authSecret: 'test-auth-secret',
		assertionSecret: 'test-assertion-secret',
		serviceId: 'web',
		serviceSecret: 'test-service-secret',
	}, db);
	return { db, store };
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe('local seed apply', () => {
	it('creates the TreeSeed local portfolio and reports unchanged on repeat apply', async () => {
		const { db, store } = createStore();
		try {
			const first = await applyLocalSeedFromCli({
				projectRoot,
				seedName: 'treeseed',
				environments: 'local',
				store,
			});

			expect(first.plan.summary).toMatchObject({
				create: 14,
				update: 0,
				unchanged: 0,
				skip: 11,
			});

			const team = await store.getTeamBySlug('treeseed');
			expect(team?.metadata?.seed).toMatchObject({
				name: 'treeseed',
				version: 1,
				resourceKey: 'team:treeseed',
				manifestHash: first.result.manifestHash,
			});

			const marketProject = await store.getProjectByTeamAndSlug(team!.id, 'market');
			expect(marketProject?.metadata?.metadata?.seed).toMatchObject({
				name: 'treeseed',
				resourceKey: 'project:treeseed/market',
			});

			const repositories = await store.listHubRepositories(marketProject!.id);
			expect(repositories).toHaveLength(1);
			expect(repositories[0]).toMatchObject({
				role: 'primary',
				provider: 'github',
				owner: 'treeseed-ai',
				name: 'market',
				url: 'https://github.com/treeseed-ai/market.git',
				defaultBranch: 'main',
			});
			expect(repositories[0].metadata?.seed).toMatchObject({
				resourceKey: 'project:treeseed/market',
				manifestHash: first.result.manifestHash,
			});

			const providers = await store.listTeamCapacityProviders(team!.id);
			const provider = providers.find((entry: any) => entry.name === 'treeseed-local-dev');
			expect(provider).toMatchObject({
				kind: 'team_owned',
				provider: 'local',
				monthlyCreditBudget: 100000,
				dailyCreditBudget: 10000,
			});
			expect(provider?.metadata).toMatchObject({
				manifestKind: 'local',
				seed: {
					resourceKey: 'capacity-provider:treeseed/local-dev',
					manifestHash: first.result.manifestHash,
				},
			});

			const lanes = await store.listCapacityProviderLanes(team!.id, provider!.id);
			expect(lanes.map((lane: any) => lane.name).sort()).toEqual(['local-codex', 'local-worker']);

			const grants = await store.listCapacityGrants(team!.id, { providerId: provider!.id });
			expect(grants).toHaveLength(1);
			expect(grants[0]).toMatchObject({
				grantScope: 'team',
				teamId: team!.id,
				projectId: null,
				dailyCreditLimit: 10000,
				monthlyCreditLimit: 100000,
				overflowPolicy: 'soft_grant',
			});
			expect(grants[0].metadata?.seed?.resourceKey).toBe('grant:treeseed/local-dev/all-projects');

			const policy = await store.getProjectWorkPolicy(marketProject!.id, 'local');
			expect(policy).toMatchObject({
				environment: 'local',
				enabled: true,
				dailyCreditBudget: 5000,
				maxQueuedTasks: 100,
				maxQueuedCredits: 10000,
			});
			expect(policy?.metadata?.seed?.resourceKey).toBe('work-policy:treeseed/local/market');

			const repositoryHosts = await store.listRepositoryHosts(team!.id, { includePlatform: false });
			expect(repositoryHosts).toEqual(expect.arrayContaining([
				expect.objectContaining({
					provider: 'github',
					ownership: 'treeseed_managed',
					name: 'treeseed-ai',
					organizationOrOwner: 'treeseed-ai',
					metadata: expect.objectContaining({
						seed: expect.objectContaining({
							resourceKey: 'repository-host:treeseed/github',
							manifestHash: first.result.manifestHash,
						}),
					}),
				}),
			]));

			const products = await store.listTeamProducts(team!.id, { type: 'user', id: 'user-1', permissions: ['teams:manage:team'] } as any);
			const template = products.find((product: any) => product.slug === 'treeseed-market');
			expect(template).toMatchObject({
				kind: 'template',
				title: 'TreeSeed Market Starter',
				visibility: 'public',
				listingEnabled: true,
				artifactKey: 'catalog/treeseed-market/1.0.0/template',
			});
			expect(template?.metadata?.seed?.resourceKey).toBe('product:treeseed/market-template');
			const artifacts = await store.listCatalogArtifactVersions(template!.id);
			expect(artifacts[0]).toMatchObject({
				version: '1.0.0',
				contentKey: 'catalog/treeseed-market/1.0.0/template',
				manifestKey: 'seeds/treeseed.yaml',
			});
			expect(artifacts[0].metadata?.seed?.resourceKey).toBe('catalog-artifact:treeseed/market-template/1.0.0');

			const exported = await exportSeedWithStore({
				store,
				teamId: team!.id,
				name: 'treeseed',
				environments: 'local',
				includeArtifacts: true,
				includePrivate: false,
				principal: { type: 'user', id: 'user-1', permissions: ['projects:read:team'] },
			} as any);
			expect(exported.ok).toBe(true);
			expect(exported.yaml).toContain('repositoryHosts:');
			expect(exported.yaml).toContain('products:');
			expect(exported.yaml).toContain('catalogArtifacts:');
			expect(exported.yaml).not.toMatch(/encryptedPayload|BEGIN PRIVATE KEY|ghp_/u);

			const second = await applyLocalSeedFromCli({
				projectRoot,
				seedName: 'treeseed',
				environments: 'local',
				store,
			});

			expect(second.plan.summary).toMatchObject({
				create: 0,
				update: 0,
				unchanged: 14,
				skip: 11,
			});
		} finally {
			db.close();
		}
	});

	it('loads team seed page data without creating an audit run', async () => {
		const { db, store } = createStore();
		try {
			const team = await store.createTeam({
				slug: 'treeseed',
				name: 'treeseed',
				displayName: 'TreeSeed',
			});
			const context = {
				store,
				team,
				teams: [team],
				principal: {
					id: 'user-1',
					type: 'user',
				},
			};

			const data: any = await loadTeamSectionData(context, {
				runtime: {
					env: {
						TREESEED_ENVIRONMENT: 'local',
					},
					resolved: {
						config: {
							repoRoot: projectRoot,
						},
					},
				},
			} as any, {
				section: 'seeds',
				url: new URL('https://market.example.com/app/teams/treeseed/seeds'),
			});

			expect(data.seedPage.selectedSeed).toBe('treeseed');
			expect(data.seedPage.selectedEnvironments).toBe('local');
			expect(data.seedPage.plan.summary).toMatchObject({
				create: 13,
				update: 1,
				unchanged: 0,
				skip: 11,
			});
			expect(await store.listSeedRuns()).toHaveLength(0);
		} finally {
			db.close();
		}
	});
});
