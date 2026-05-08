import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as treeseedCore from '@treeseed/core';
import { AgentSdk } from '@treeseed/sdk';
import type { D1DatabaseLike, D1PreparedStatementLike } from '@treeseed/core/types/cloudflare';
import { createMarketApiApp } from '../../src/api/app.js';
import { listTreeseedManagedHostsFromConfig } from '../../src/lib/market/managed-hosts.js';

const packageRoot = process.cwd();
const authMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0007_site_web_sessions.sql'),
	resolve(packageRoot, '../migrations/0007_site_web_sessions.sql'),
];
const authMigrationPath = authMigrationPathCandidates.find((candidate) => existsSync(candidate));
const marketMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0008_market_control_plane.sql'),
	resolve(packageRoot, '../migrations/0008_market_control_plane.sql'),
];
const marketMigrationPath = marketMigrationPathCandidates.find((candidate) => existsSync(candidate));
const catalogMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0009_team_content_catalog.sql'),
	resolve(packageRoot, '../migrations/0009_team_content_catalog.sql'),
];
const catalogMigrationPath = catalogMigrationPathCandidates.find((candidate) => existsSync(candidate));
const topologyMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0010_project_hosting_topology.sql'),
	resolve(packageRoot, '../migrations/0010_project_hosting_topology.sql'),
];
const topologyMigrationPath = topologyMigrationPathCandidates.find((candidate) => existsSync(candidate));
const reportingMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0011_control_plane_reporting.sql'),
	resolve(packageRoot, '../migrations/0011_control_plane_reporting.sql'),
];
const reportingMigrationPath = reportingMigrationPathCandidates.find((candidate) => existsSync(candidate));
const webHostsMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0014_team_web_hosts.sql'),
	resolve(packageRoot, '../migrations/0014_team_web_hosts.sql'),
];
const webHostsMigrationPath = webHostsMigrationPathCandidates.find((candidate) => existsSync(candidate));
const capacityMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0018_capacity_providers.sql'),
	resolve(packageRoot, '../migrations/0018_capacity_providers.sql'),
];
const capacityMigrationPath = capacityMigrationPathCandidates.find((candidate) => existsSync(candidate));
const workdayManagerMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0019_workday_manager_runners.sql'),
	resolve(packageRoot, '../migrations/0019_workday_manager_runners.sql'),
];
const workdayManagerMigrationPath = workdayManagerMigrationPathCandidates.find((candidate) => existsSync(candidate));
const sqliteModule = await import('node:sqlite').catch(() => null);
const DatabaseSyncCtor = sqliteModule?.DatabaseSync ?? null;
const DatabaseSync = DatabaseSyncCtor as NonNullable<typeof DatabaseSyncCtor>;
const runtimeDescribe = DatabaseSyncCtor ? describe : describe.skip;
const resolvedAuthMigrationPath = authMigrationPath as string;
const resolvedMarketMigrationPath = marketMigrationPath as string;
const resolvedCatalogMigrationPath = catalogMigrationPath as string;
const resolvedTopologyMigrationPath = topologyMigrationPath as string;
const resolvedReportingMigrationPath = reportingMigrationPath as string;
const resolvedWebHostsMigrationPath = webHostsMigrationPath as string;
const resolvedCapacityMigrationPath = capacityMigrationPath as string;
const resolvedWorkdayManagerMigrationPath = workdayManagerMigrationPath as string;

if (!authMigrationPath || !marketMigrationPath || !catalogMigrationPath || !topologyMigrationPath || !reportingMigrationPath || !webHostsMigrationPath || !capacityMigrationPath || !workdayManagerMigrationPath) {
	throw new Error('Unable to resolve required market migration fixtures.');
}

async function withEnv<T>(values: Record<string, string | undefined>, action: () => T | Promise<T>) {
	const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
	for (const [key, value] of Object.entries(values)) {
		if (value == null) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
	try {
		return await action();
	} finally {
		for (const [key, value] of Object.entries(previous)) {
			if (value == null) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}

class TestPreparedStatement implements D1PreparedStatementLike {
	private bindings: unknown[] = [];

	constructor(
		private readonly db: any,
		private readonly query: string,
	) {}

	bind(...values: unknown[]) {
		this.bindings = values;
		return this;
	}

	async run() {
		this.db.prepare(this.query).run(...this.bindings);
		return {};
	}

	async first<T = Record<string, unknown>>() {
		return (this.db.prepare(this.query).get(...this.bindings) as T | undefined) ?? null;
	}

	async all<T = Record<string, unknown>>() {
		return {
			results: this.db.prepare(this.query).all(...this.bindings) as T[],
		};
	}

	async raw<T = unknown[]>() {
		const rows = this.db.prepare(this.query).all(...this.bindings) as Array<Record<string, unknown>>;
		return rows.map((row) => Object.values(row)) as T[];
	}
}

class TestD1Database implements D1DatabaseLike {
	private readonly db = new DatabaseSync(':memory:');

	constructor() {
		this.db.exec(readFileSync(resolvedAuthMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedMarketMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedCatalogMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedTopologyMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedReportingMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedWebHostsMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedCapacityMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedWorkdayManagerMigrationPath, 'utf8'));
	}

	prepare(query: string) {
		return new TestPreparedStatement(this.db, query);
	}

	async exec(query: string) {
		this.db.exec(query);
		return {};
	}
}

type MarketApiTestOptions = {
	db?: D1DatabaseLike;
	sdk?: AgentSdk;
	config?: Record<string, unknown>;
	fetchImpl?: typeof fetch;
};

function createTestApp(options: MarketApiTestOptions = {}) {
	return createMarketApiApp({
		...options,
		db: options.db ?? new TestD1Database(),
		sdk: options.sdk ?? new AgentSdk({
			repoRoot: packageRoot,
		}),
		config: {
			repoRoot: packageRoot,
			authSecret: 'test-secret',
			baseUrl: 'https://market.example.com',
			issuer: 'https://market.example.com',
			projectId: 'treeseed-market',
			projectApiKey: 'market-project-key',
			projectApiPermissions: ['sdk:execute:global', 'agent:execute:global', 'operations:execute:global'],
			webServiceId: 'web',
			webServiceSecret: 'web-test-secret',
			webAssertionSecret: 'web-assertion-secret',
			...(options.config ?? {}),
		},
	});
}

async function json(response: Response) {
	return response.json() as Promise<any>;
}

async function createLegacyWebSessionsDb() {
	const db = new TestD1Database();
	await db.prepare('DROP TABLE web_sessions').run();
	await db.prepare(`CREATE TABLE web_sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		identity_id TEXT,
		provider TEXT NOT NULL,
		provider_subject TEXT NOT NULL,
		email TEXT,
		display_name TEXT,
		principal_json TEXT NOT NULL,
		csrf_token TEXT NOT NULL,
		authenticated_at TEXT NOT NULL,
		expires_at TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (identity_id) REFERENCES user_identities(id) ON DELETE SET NULL
	)`).run();
	await db.prepare('CREATE INDEX IF NOT EXISTS idx_web_sessions_user_id ON web_sessions(user_id)').run();
	return db;
}

async function authorizeApp(app: ReturnType<typeof createTestApp>, input: { principalId?: string; displayName?: string } = {}) {
	const started = await json(await app.request('/auth/device/start', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ scopes: ['auth:me'] }),
	}));
	await app.request('/auth/device/approve', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			userCode: started.userCode,
			principalId: input.principalId ?? 'user-1',
			displayName: input.displayName ?? 'Market User',
			scopes: ['auth:me'],
		}),
	});
	const tokenPayload = await json(await app.request('/auth/device/poll', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ deviceCode: started.deviceCode }),
	}));
	return tokenPayload.accessToken as string;
}

async function createTeamAndProject(app: ReturnType<typeof createTestApp>, token: string, projectInput: Record<string, unknown>) {
	const team = await json(await app.request('/v1/teams', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ slug: 'team-one', name: 'Team One' }),
	}));
	const project = await json(await app.request(`/v1/teams/${team.payload.id}/projects`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(projectInput),
	}));
	return {
		team: team.payload,
		project: project.payload.project,
	};
}

async function createTeam(app: ReturnType<typeof createTestApp>, token: string) {
	const team = await json(await app.request('/v1/teams', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ slug: 'team-one', name: 'Team One' }),
	}));
	return team.payload;
}

function encryptedHostEnvelope(overrides: Record<string, unknown> = {}) {
	return {
		version: 1,
		algorithm: 'secretbox',
		kdf: {
			algorithm: 'argon2id',
			opsLimit: 2,
			memLimit: 67108864,
		},
		salt: 'c2FsdA==',
		nonce: 'bm9uY2U=',
		ciphertext: 'Y2lwaGVydGV4dA==',
		...overrides,
	};
}

runtimeDescribe('market api', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('stores team Cloudflare web hosts as opaque encrypted payloads', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);
		const created = await app.request(`/v1/teams/${team.id}/web-hosts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Team Cloudflare',
				provider: 'cloudflare',
				ownership: 'team_owned',
				accountLabel: 'Example Account',
				allowedEnvironments: ['staging', 'prod'],
				encryptedPayload: encryptedHostEnvelope(),
				metadata: {
					accountHint: 'example',
				},
			}),
		});
		expect(created.status).toBe(201);
		const payload = await json(created);
		expect(payload.payload.encryptedPayload.ciphertext).toBe('Y2lwaGVydGV4dA==');
		expect(JSON.stringify(payload)).not.toContain('cf-secret-token');

		const listed = await json(await app.request(`/v1/teams/${team.id}/web-hosts`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(listed.payload).toHaveLength(1);
		expect(listed.payload[0].ownership).toBe('team_owned');
		expect(listed.payload[0].allowedEnvironments).toEqual(['staging', 'prod']);

		const updated = await json(await app.request(`/v1/teams/${team.id}/web-hosts/${payload.payload.id}`, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Team Cloudflare Updated',
				metadata: { accountHint: 'updated' },
			}),
		}));
		expect(updated.payload.name).toBe('Team Cloudflare Updated');
		expect(updated.payload.encryptedPayload.ciphertext).toBe('Y2lwaGVydGV4dA==');

		const deleted = await json(await app.request(`/v1/teams/${team.id}/web-hosts/${payload.payload.id}`, {
			method: 'DELETE',
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(deleted.ok).toBe(true);
	});

	it('stores team Railway agent hosts as opaque encrypted payloads', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);
		const created = await app.request(`/v1/teams/${team.id}/web-hosts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Team Agents',
				provider: 'railway',
				ownership: 'team_owned',
				accountLabel: 'Agent Workspace',
				allowedEnvironments: ['staging', 'prod'],
				encryptedPayload: encryptedHostEnvelope(),
				metadata: {
					hostType: 'agent',
					configuredKeys: ['RAILWAY_API_TOKEN', 'TREESEED_RAILWAY_WORKSPACE', 'TREESEED_WORKER_POOL_SCALER'],
				},
			}),
		});
		expect(created.status).toBe(201);
		const payload = await json(created);
		expect(payload.payload.provider).toBe('railway');
		expect(payload.payload.metadata.hostType).toBe('agent');
		expect(payload.payload.encryptedPayload.ciphertext).toBe('Y2lwaGVydGV4dA==');
		expect(JSON.stringify(payload)).not.toContain('railway-secret-token');

		const validated = await json(await app.request(`/v1/teams/${team.id}/web-hosts/${payload.payload.id}/validate`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				decryptedConfig: {
					RAILWAY_API_TOKEN: 'railway-secret-token',
					TREESEED_RAILWAY_WORKSPACE: 'knowledge-coop',
					TREESEED_WORKER_POOL_SCALER: 'railway',
				},
			}),
		}));
		expect(validated.payload.validation.receivedKeys).toEqual([
			'RAILWAY_API_TOKEN',
			'TREESEED_RAILWAY_WORKSPACE',
			'TREESEED_WORKER_POOL_SCALER',
		]);
		expect(JSON.stringify(validated)).not.toContain('railway-secret-token');
	});

	it('lists generic hosts with TreeSeed managed web and processing options', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);
		const created = await app.request(`/v1/teams/${team.id}/hosts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Team Processing',
				provider: 'railway',
				ownership: 'team_owned',
				accountLabel: 'Processing Workspace',
				allowedEnvironments: ['staging', 'prod'],
				encryptedPayload: encryptedHostEnvelope(),
				metadata: {
					hostType: 'processing',
					configuredKeys: ['RAILWAY_API_TOKEN', 'TREESEED_RAILWAY_WORKSPACE', 'TREESEED_WORKER_POOL_SCALER'],
				},
			}),
		});
		expect(created.status).toBe(201);

		const listed = await json(await app.request(`/v1/teams/${team.id}/hosts`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(listed.payload.map((host: any) => host.id)).toEqual(expect.arrayContaining([
			'treeseed-managed-web',
			'treeseed-managed-processing',
		]));
		expect(listed.payload.find((host: any) => host.id === 'treeseed-managed-processing')).toMatchObject({
			provider: 'railway',
			ownership: 'treeseed_managed',
			name: 'TreeSeed Processing Host',
			metadata: expect.objectContaining({ hostType: 'processing' }),
		});
		expect(listed.payload.find((host: any) => host.name === 'Team Processing')).toMatchObject({
			provider: 'railway',
			ownership: 'team_owned',
		});
		expect(JSON.stringify(listed)).not.toContain('railway-secret-token');
	});

	it('marks TreeSeed managed hosts active from existing platform provider env vars', async () => {
		await withEnv({
			TREESEED_MANAGED_CLOUDFLARE_API_TOKEN: undefined,
			TREESEED_MANAGED_CLOUDFLARE_ACCOUNT_ID: undefined,
			TREESEED_MANAGED_RAILWAY_API_TOKEN: undefined,
			TREESEED_MANAGED_RAILWAY_WORKSPACE: undefined,
			CLOUDFLARE_API_TOKEN: 'platform-cloudflare-token',
			CLOUDFLARE_ACCOUNT_ID: 'platform-cloudflare-account',
			RAILWAY_API_TOKEN: 'platform-railway-token',
			TREESEED_RAILWAY_WORKSPACE: 'platform-workspace',
		}, async () => {
			const app = createTestApp();
			const token = await authorizeApp(app);
			const team = await createTeam(app, token);

			const listed = await json(await app.request(`/v1/teams/${team.id}/hosts`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			const web = listed.payload.find((host: any) => host.id === 'treeseed-managed-web');
			const processing = listed.payload.find((host: any) => host.id === 'treeseed-managed-processing');
			expect(web.status).toBe('active');
			expect(web.metadata.missingConfigKeys).toEqual([]);
			expect(processing.status).toBe('active');
			expect(processing.metadata.missingConfigKeys).toEqual([]);
			expect(JSON.stringify(listed)).not.toContain('platform-cloudflare-token');
			expect(JSON.stringify(listed)).not.toContain('platform-railway-token');
		});
	});

	it('does not read local machine config for remote managed host status', async () => {
		await withEnv({
			TREESEED_LOCAL_DEV_MODE: undefined,
			TREESEED_ENVIRONMENT: 'staging',
			TREESEED_MANAGED_CLOUDFLARE_API_TOKEN: undefined,
			TREESEED_MANAGED_CLOUDFLARE_ACCOUNT_ID: undefined,
			TREESEED_MANAGED_RAILWAY_API_TOKEN: undefined,
			TREESEED_MANAGED_RAILWAY_WORKSPACE: undefined,
			CLOUDFLARE_API_TOKEN: undefined,
			CLOUDFLARE_ACCOUNT_ID: undefined,
			RAILWAY_API_TOKEN: undefined,
			TREESEED_RAILWAY_WORKSPACE: undefined,
		}, async () => {
			const hosts = await listTreeseedManagedHostsFromConfig('team_remote', {
				env: {
					TREESEED_ENVIRONMENT: 'staging',
				},
			});
			expect(hosts.find((host: any) => host.id === 'treeseed-managed-web')?.status).toBe('configuration_required');
			expect(hosts.find((host: any) => host.id === 'treeseed-managed-processing')?.status).toBe('configuration_required');
		});
	});

	it('validates team-owned Cloudflare hosts only with caller-provided decrypted config and does not persist values', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);
		const created = await json(await app.request(`/v1/teams/${team.id}/web-hosts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Team Cloudflare',
				ownership: 'team_owned',
				encryptedPayload: encryptedHostEnvelope(),
			}),
		}));

		const validated = await json(await app.request(`/v1/teams/${team.id}/web-hosts/${created.payload.id}/validate`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				decryptedConfig: {
					CLOUDFLARE_API_TOKEN: 'cf-secret-token',
					CLOUDFLARE_ACCOUNT_ID: 'account-1',
				},
			}),
		}));
		expect(validated.payload.validation.receivedKeys).toEqual(['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN']);
		expect(JSON.stringify(validated)).not.toContain('cf-secret-token');

		const listed = await json(await app.request(`/v1/teams/${team.id}/web-hosts`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(JSON.stringify(listed)).not.toContain('cf-secret-token');
	});

	it('prevents deleting Cloudflare hosts that are still assigned to projects', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);
		const host = await json(await app.request(`/v1/teams/${team.id}/web-hosts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Team Cloudflare',
				ownership: 'team_owned',
				encryptedPayload: encryptedHostEnvelope(),
			}),
		}));
		await json(await app.request(`/v1/teams/${team.id}/projects`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				slug: 'hosted-project',
				name: 'Hosted Project',
				metadata: {
					cloudflareHost: {
						mode: 'team_owned',
						hostId: host.payload.id,
					},
				},
			}),
		}));

		const deleted = await app.request(`/v1/teams/${team.id}/web-hosts/${host.payload.id}`, {
			method: 'DELETE',
			headers: { authorization: `Bearer ${token}` },
		});
		expect(deleted.status).toBe(409);
		const payload = await json(deleted);
		expect(payload.error).toBe('in_use');
		expect(payload.projects).toEqual([
			expect.objectContaining({ slug: 'hosted-project', name: 'Hosted Project' }),
		]);
	});

	it('launch accepts an unlocked team Cloudflare host without persisting plaintext config', async () => {
		const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeCoopManagedLaunch').mockRejectedValue(new Error('launch intentionally stopped'));
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);
		const host = await json(await app.request(`/v1/teams/${team.id}/web-hosts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Team Cloudflare',
				ownership: 'team_owned',
				encryptedPayload: encryptedHostEnvelope(),
			}),
		}));

		const launched = await app.request(`/v1/teams/${team.id}/projects/launch`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				slug: 'hosted-with-team-cloudflare',
				name: 'Hosted With Team Cloudflare',
				sourceKind: 'blank',
				hostingMode: 'managed',
				cloudflareHostMode: 'team_owned',
				cloudflareHostId: host.payload.id,
				targetEnvironments: ['staging', 'prod'],
				cloudflareHostConfig: {
					CLOUDFLARE_API_TOKEN: 'cf-secret-token',
					CLOUDFLARE_ACCOUNT_ID: 'account-1',
				},
			}),
		});
		expect(launched.status).toBe(502);
		const launchPayload = await json(launched);
		expect(JSON.stringify(launchPayload)).not.toContain('cf-secret-token');
		expect(launchSpy).toHaveBeenCalledWith(expect.objectContaining({
			cloudflareHost: expect.objectContaining({
				mode: 'team_owned',
				hostId: host.payload.id,
				targetEnvironments: ['staging', 'prod'],
				config: expect.objectContaining({
					CLOUDFLARE_API_TOKEN: 'cf-secret-token',
					CLOUDFLARE_ACCOUNT_ID: 'account-1',
				}),
			}),
		}));
		const projects = await json(await app.request(`/v1/projects?teamId=${team.id}`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		const projectId = projects.payload.find((project: { slug: string }) => project.slug === 'hosted-with-team-cloudflare')?.id;
		expect(projectId).toBeTruthy();

		const details = await json(await app.request(`/v1/projects/${projectId}`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(details.payload.project.metadata.cloudflareHost.mode).toBe('team_owned');
		expect(details.payload.project.metadata.cloudflareHost.hostId).toBe(host.payload.id);
		expect(JSON.stringify(details)).not.toContain('cf-secret-token');
	});

	it('launch with TreeSeed managed Cloudflare host records paid hosting metadata', async () => {
		await withEnv({
			TREESEED_MANAGED_CLOUDFLARE_API_TOKEN: 'managed-token',
			TREESEED_MANAGED_CLOUDFLARE_ACCOUNT_ID: 'managed-account',
		}, async () => {
			const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeCoopManagedLaunch').mockRejectedValue(new Error('launch intentionally stopped'));
			const app = createTestApp();
			const token = await authorizeApp(app);
			const team = await createTeam(app, token);

			const launched = await app.request(`/v1/teams/${team.id}/projects/launch`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					slug: 'hosted-with-treeseed-cloudflare',
					name: 'Hosted With TreeSeed Cloudflare',
					sourceKind: 'blank',
					hostingMode: 'managed',
					cloudflareHostMode: 'treeseed_managed',
				}),
			});
			expect(launched.status).toBe(502);
			expect(launchSpy).toHaveBeenCalledWith(expect.objectContaining({
				cloudflareHost: expect.objectContaining({
					mode: 'treeseed_managed',
					config: expect.objectContaining({
						CLOUDFLARE_API_TOKEN: 'managed-token',
						CLOUDFLARE_ACCOUNT_ID: 'managed-account',
					}),
				}),
			}));
			const projects = await json(await app.request(`/v1/projects?teamId=${team.id}`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			const projectId = projects.payload.find((project: { slug: string }) => project.slug === 'hosted-with-treeseed-cloudflare')?.id;
			expect(projectId).toBeTruthy();
			const details = await json(await app.request(`/v1/projects/${projectId}`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			expect(details.payload.project.metadata.cloudflareHost.mode).toBe('treeseed_managed');
			expect(details.payload.project.metadata.cloudflareHost.billing.fee).toBe('treeseed_cloudflare_hosting');
			expect(details.payload.entitlement.tier).toBe('paid_hosting');
		});
	});

	it('launch with TreeSeed managed processing host passes Railway config and records paid hosting metadata', async () => {
		await withEnv({
			TREESEED_MANAGED_CLOUDFLARE_API_TOKEN: 'managed-token',
			TREESEED_MANAGED_CLOUDFLARE_ACCOUNT_ID: 'managed-account',
			TREESEED_MANAGED_RAILWAY_API_TOKEN: 'managed-railway-token',
			TREESEED_MANAGED_RAILWAY_WORKSPACE: 'treeseed-processing',
		}, async () => {
			const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeCoopManagedLaunch').mockRejectedValue(new Error('launch intentionally stopped'));
			const app = createTestApp();
			const token = await authorizeApp(app);
			const team = await createTeam(app, token);

			const launched = await app.request(`/v1/teams/${team.id}/projects/launch`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					slug: 'hosted-with-treeseed-processing',
					name: 'Hosted With TreeSeed Processing',
					sourceKind: 'blank',
					hostingMode: 'managed',
					cloudflareHostMode: 'treeseed_managed',
					processingHostMode: 'treeseed_managed',
					processingHostId: 'treeseed-managed-processing',
				}),
			});
			expect(launched.status).toBe(502);
			expect(launchSpy).toHaveBeenCalledWith(expect.objectContaining({
				processingHost: expect.objectContaining({
					mode: 'treeseed_managed',
					hostId: 'treeseed-managed-processing',
					config: expect.objectContaining({
						RAILWAY_API_TOKEN: 'managed-railway-token',
						TREESEED_RAILWAY_WORKSPACE: 'treeseed-processing',
						TREESEED_WORKER_POOL_SCALER: 'railway',
					}),
				}),
			}));
			const projects = await json(await app.request(`/v1/projects?teamId=${team.id}`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			const projectId = projects.payload.find((project: { slug: string }) => project.slug === 'hosted-with-treeseed-processing')?.id;
			const details = await json(await app.request(`/v1/projects/${projectId}`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			expect(details.payload.project.metadata.processingHost.mode).toBe('treeseed_managed');
			expect(details.payload.project.metadata.processingHost.billing.fee).toBe('treeseed_processing_hosting');
			expect(JSON.stringify(details)).not.toContain('managed-railway-token');
		});
	});

	it('launch with TreeSeed managed Cloudflare host fails when operational credentials are missing', async () => {
		await withEnv({
			TREESEED_MANAGED_CLOUDFLARE_API_TOKEN: undefined,
			TREESEED_MANAGED_CLOUDFLARE_ACCOUNT_ID: undefined,
			CLOUDFLARE_API_TOKEN: undefined,
			CLOUDFLARE_ACCOUNT_ID: undefined,
		}, async () => {
			vi.spyOn(process, 'cwd').mockReturnValue('/tmp/treeseed-missing-managed-host-config');
			const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeCoopManagedLaunch').mockRejectedValue(new Error('launch should not run'));
			const app = createTestApp();
			const token = await authorizeApp(app);
			const team = await createTeam(app, token);

			const launched = await app.request(`/v1/teams/${team.id}/projects/launch`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					slug: 'hosted-with-missing-treeseed-cloudflare',
					name: 'Hosted With Missing TreeSeed Cloudflare',
					sourceKind: 'blank',
					hostingMode: 'managed',
					cloudflareHostMode: 'treeseed_managed',
				}),
			});
			expect(launched.status).toBe(500);
			const payload = await json(launched);
			expect(payload.error).toBe('TreeSeed managed Cloudflare hosting is not configured.');
			expect(payload.missing).toEqual(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']);
			expect(launchSpy).not.toHaveBeenCalled();
		});
	});

	it('routes remote inline dispatch through a hosted project api connection', async () => {
		const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
			const url = String(input);
			expect(url).toBe('https://project.example.com/internal/core/sdk/read');
			const headers = Object.fromEntries(new Headers(init?.headers).entries());
			expect(headers.authorization).toBe('Bearer hosted-project-key');
			return new Response(JSON.stringify({
				ok: true,
				model: 'knowledge',
				operation: 'read',
				payload: {
					slug: 'remote-knowledge',
				},
			}), {
				status: 200,
				headers: {
					'content-type': 'application/json',
					'x-treeseed-remote-contract-version': '1',
				},
			});
		});
		const app = createTestApp({ fetchImpl: fetchMock as unknown as typeof fetch });
		const token = await authorizeApp(app);
		const { project } = await createTeamAndProject(app, token, {
			id: 'hosted-project',
			slug: 'hosted-project',
			name: 'Hosted Project',
		});

		await app.request(`/v1/projects/${project.id}/connection`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				mode: 'hosted',
				projectApiBaseUrl: 'https://project.example.com',
				metadata: {
					projectApiKey: 'hosted-project-key',
				},
			}),
		});

		const dispatched = await app.request(`/v1/projects/${project.id}/dispatch`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				namespace: 'sdk',
				operation: 'read',
				input: {
					model: 'knowledge',
					slug: 'research/inquiry/questions-as-records',
				},
			}),
		});

		expect(dispatched.status).toBe(200);
		expect(await json(dispatched)).toMatchObject({
			ok: true,
			mode: 'inline',
			target: 'project_api',
			payload: {
				payload: {
					slug: 'remote-knowledge',
				},
			},
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('manages team profiles, invites, member roles, and guarded deletion', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const created = await json(await app.request('/v1/teams', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Alpha-Team',
				displayName: 'Alpha Team',
				logoUrl: 'https://example.com/logo.png',
				description: 'Public team summary.',
			}),
		}));
		expect(created.ok).toBe(true);
		expect(created.payload).toMatchObject({
			name: 'alpha-team',
			displayName: 'Alpha Team',
			logoUrl: 'https://example.com/logo.png',
			profileSummary: 'Public team summary.',
		});

		const updated = await json(await app.request(`/v1/teams/${created.payload.id}`, {
			method: 'PATCH',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'alpha-collective',
				displayName: 'Alpha Collective',
			}),
		}));
		expect(updated.ok).toBe(true);
		expect(updated.team.name).toBe('alpha-collective');
		expect(updated.team.displayName).toBe('Alpha Collective');

		const duplicate = await json(await app.request('/v1/teams', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'other-team',
				displayName: 'Other Team',
			}),
		}));
		const renameTaken = await json(await app.request(`/v1/teams/${duplicate.payload.id}`, {
			method: 'PATCH',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ name: 'alpha-collective' }),
		}));
		expect(renameTaken).toMatchObject({ ok: false, code: 'taken' });

		const invite = await json(await app.request(`/v1/teams/${created.payload.id}/invites`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				email: 'new-member@example.com',
				roleKey: 'reviewer',
			}),
		}));
		expect(invite.ok).toBe(true);
		expect(invite.token).toMatch(/^tiv_/);

		const memberToken = await authorizeApp(app, { principalId: 'user-2', displayName: 'Invited User' });
		const accepted = await json(await app.request(`/v1/team-invites/${invite.token}/accept`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${memberToken}`,
			},
		}));
		expect(accepted.ok).toBe(true);
		expect(accepted.team.name).toBe('alpha-collective');

		const members = await json(await app.request(`/v1/teams/${created.payload.id}/members`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		const member = members.payload.find((entry: { userId: string }) => entry.userId === 'user-2');
		expect(member.roles).toContain('reviewer');

		const updatedRole = await json(await app.request(`/v1/teams/${created.payload.id}/members/${member.id}`, {
			method: 'PATCH',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ roleKey: 'contributor' }),
		}));
		expect(updatedRole.ok).toBe(true);

		const deleted = await json(await app.request(`/v1/teams/${created.payload.id}`, {
			method: 'DELETE',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ confirmation: 'DELETE alpha-collective' }),
		}));
		expect(deleted.ok).toBe(true);
	});

	it('blocks team deletion while the team owns projects', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);
		await json(await app.request(`/v1/teams/${team.id}/projects`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				slug: 'owned-project',
				name: 'Owned Project',
			}),
		}));
		const blocked = await json(await app.request(`/v1/teams/${team.id}`, {
			method: 'DELETE',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ confirmation: 'DELETE team-one' }),
		}));
		expect(blocked).toMatchObject({ ok: false, code: 'blocked' });
		expect(blocked.blockers.some((entry: { code: string }) => entry.code === 'project')).toBe(true);
	});

	it('serves deep health and runner health summaries', async () => {
		const app = createTestApp();
		const deepHealth = await json(await app.request('/healthz/deep'));
		expect(deepHealth).toMatchObject({
			ok: true,
			status: 'ok',
			checks: {
				d1: true,
			},
		});

		const token = await authorizeApp(app);
		const { project } = await createTeamAndProject(app, token, {
			id: 'health-project',
			slug: 'health-project',
			name: 'Health Project',
		});
		const connection = await json(await app.request(`/v1/projects/${project.id}/connection`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				mode: 'hosted',
				projectApiBaseUrl: 'https://project.example.com',
				metadata: {
					projectApiKey: 'hosted-project-key',
				},
			}),
		}));
		const runnerToken = connection.payload.runnerToken as string;
		await app.request(`/v1/projects/${project.id}/runner/agent-pools/primary/register`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				environment: 'staging',
				teamId: project.teamId,
				managerId: 'manager-1',
				desiredWorkers: 1,
				observedQueueDepth: 2,
			}),
		});
		const runnerHealth = await json(await app.request(`/v1/projects/${project.id}/runner/health?environment=staging`, {
			headers: {
				authorization: `Bearer ${runnerToken}`,
			},
		}));
		expect(runnerHealth.ok).toBe(true);
		expect(Array.isArray(runnerHealth.payload.pools)).toBe(true);
		expect(runnerHealth.payload.pools[0]?.latestRegistration?.managerId).toBe('manager-1');
	});

	it('repairs legacy web session columns before serving deep health', async () => {
		const db = await createLegacyWebSessionsDb();
		const app = createTestApp({ db });
		const deepHealth = await json(await app.request('/healthz/deep'));
		expect(deepHealth).toMatchObject({
			ok: true,
			status: 'ok',
			checks: {
				d1: true,
			},
		});

		const tableInfo = await db.prepare('PRAGMA table_info(web_sessions)').all<{ name: string }>();
		const columns = new Set((tableInfo.results ?? []).map((row) => row.name));
		expect([...columns]).toEqual(expect.arrayContaining([
			'better_auth_session_id',
			'ip_address',
			'user_agent',
			'last_seen_at',
			'revoked_at',
		]));
	});

	it('queues project runner jobs and records lifecycle events', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { team, project } = await createTeamAndProject(app, token, {
			id: 'runner-project',
			slug: 'runner-project',
			name: 'Runner Project',
		});

		const keyResponse = await json(await app.request(`/v1/teams/${team.id}/api-keys`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Dispatch Key',
				permissions: ['dispatch:execute:team'],
			}),
		}));
		const connectionResponse = await json(await app.request(`/v1/projects/${project.id}/connection`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				mode: 'self_hosted',
				executionOwner: 'project_runner',
			}),
		}));

		const dispatched = await app.request(`/v1/projects/${project.id}/dispatch`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${keyResponse.payload.token}`,
			},
			body: JSON.stringify({
				namespace: 'sdk',
				operation: 'refreshGraph',
				input: {},
			}),
		});
		expect(dispatched.status).toBe(200);
		const dispatchedPayload = await json(dispatched);
		expect(dispatchedPayload).toMatchObject({
			ok: true,
			mode: 'job',
			target: 'project_runner',
		});

		const jobId = dispatchedPayload.job.id as string;
		const runnerToken = connectionResponse.payload.runnerToken as string;
		const pulled = await json(await app.request(`/v1/projects/${project.id}/runner/jobs/pull`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({ runnerId: 'runner-1', limit: 1 }),
		}));
		expect(pulled.payload[0].id).toBe(jobId);

		await app.request(`/v1/jobs/${jobId}/progress`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({ summary: 'runner started', data: { percent: 50 } }),
		});
		await app.request(`/v1/jobs/${jobId}/complete`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({ output: { snapshotRoot: 'graph-1' } }),
		});

		const job = await json(await app.request(`/v1/jobs/${jobId}`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(job.payload.status).toBe('completed');

		const events = await json(await app.request(`/v1/jobs/${jobId}/events`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(events.payload.map((entry: { kind: string }) => entry.kind)).toEqual([
			'created',
			'claimed',
			'progress',
			'completed',
		]);
	});

	it('stores project hosting topology and runner-authenticated agent pool registrations', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { team, project } = await createTeamAndProject(app, token, {
			id: 'topology-project',
			slug: 'topology-project',
			name: 'Topology Project',
		});

		const hosting = await json(await app.request(`/v1/projects/${project.id}/hosting`, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				kind: 'hosted_project',
				registration: 'optional',
				marketBaseUrl: 'https://market.example.com',
				sourceRepoOwner: 'treeseed-ai',
				sourceRepoName: 'topology-project',
				sourceRepoUrl: 'https://github.com/treeseed-ai/topology-project',
				sourceRepoWorkflowPath: '.github/workflows/deploy.yml',
			}),
		}));
		expect(hosting.payload).toMatchObject({
			projectId: project.id,
			kind: 'hosted_project',
			registration: 'optional',
		});

		const environment = await json(await app.request(`/v1/projects/${project.id}/environments/staging`, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				deploymentProfile: 'hosted_project',
				baseUrl: 'https://staging.example.com',
				cloudflareAccountId: 'cf-account-1',
				pagesProjectName: 'topology-project-staging',
				workerName: 'topology-project-staging-worker',
				r2BucketName: 'topology-project-staging-content',
				d1DatabaseName: 'topology-project-staging-db',
				queueName: 'topology-project-staging-queue',
				railwayProjectName: 'topology-project-staging',
			}),
		}));
		expect(environment.payload).toMatchObject({
			projectId: project.id,
			environment: 'staging',
			pagesProjectName: 'topology-project-staging',
		});

		const resource = await json(await app.request(`/v1/projects/${project.id}/resources`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				environment: 'staging',
				provider: 'cloudflare',
				resourceKind: 'r2',
				logicalName: 'content',
				locator: 'teams/team-one/published/common.json',
			}),
		}));
		expect(resource.payload).toMatchObject({
			projectId: project.id,
			provider: 'cloudflare',
			resourceKind: 'r2',
			logicalName: 'content',
		});

		const deployment = await json(await app.request(`/v1/projects/${project.id}/deployments`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				environment: 'staging',
				deploymentKind: 'code',
				status: 'running',
				sourceRef: 'staging',
				commitSha: 'abc123',
			}),
		}));
		expect(deployment.payload).toMatchObject({
			projectId: project.id,
			environment: 'staging',
			deploymentKind: 'code',
			status: 'running',
		});

		const pool = await json(await app.request(`/v1/projects/${project.id}/agent-pools`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				teamId: team.id,
				environment: 'staging',
				name: 'primary',
				status: 'active',
				autoscale: {
					minWorkers: 0,
					maxWorkers: 4,
					targetQueueDepth: 2,
					cooldownSeconds: 45,
				},
			}),
		}));
		expect(pool.payload).toMatchObject({
			projectId: project.id,
			name: 'primary',
			autoscale: {
				maxWorkers: 4,
				targetQueueDepth: 2,
			},
		});

		const connection = await json(await app.request(`/v1/projects/${project.id}/connection`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				mode: 'hosted',
				executionOwner: 'project_runner',
				rotateRunnerToken: true,
			}),
		}));
		const runnerToken = connection.payload.runnerToken as string;

		const registration = await json(await app.request(`/v1/projects/${project.id}/runner/agent-pools/primary/register`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				teamId: team.id,
				environment: 'staging',
				managerId: 'manager-1',
				runnerId: 'runner-1',
				serviceName: 'manager',
				desiredWorkers: 2,
				observedQueueDepth: 3,
				observedActiveLeases: 1,
			}),
		}));
		expect(registration.payload.pool).toMatchObject({
			name: 'primary',
			environment: 'staging',
		});
		expect(registration.payload.registration).toMatchObject({
			managerId: 'manager-1',
			desiredWorkers: 2,
			observedQueueDepth: 3,
		});

		const runnerEnvironment = await json(await app.request(`/v1/projects/${project.id}/runner/environments/prod`, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				deploymentProfile: 'hosted_project',
				baseUrl: 'https://prod.example.com',
				pagesProjectName: 'topology-project-prod',
				workerName: 'topology-project-prod-worker',
				r2BucketName: 'topology-project-prod-content',
				railwayProjectName: 'topology-project-prod',
			}),
		}));
		expect(runnerEnvironment.payload).toMatchObject({
			environment: 'prod',
			pagesProjectName: 'topology-project-prod',
		});

		const runnerResource = await json(await app.request(`/v1/projects/${project.id}/runner/resources`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				environment: 'prod',
				provider: 'railway',
				resourceKind: 'service',
				logicalName: 'manager',
				locator: 'railway://topology-project-prod/manager',
			}),
		}));
		expect(runnerResource.payload).toMatchObject({
			environment: 'prod',
			provider: 'railway',
			resourceKind: 'service',
			logicalName: 'manager',
		});

		const runnerDeployment = await json(await app.request(`/v1/projects/${project.id}/runner/deployments`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				environment: 'prod',
				deploymentKind: 'mixed',
				status: 'success',
				sourceRef: 'main',
				commitSha: 'def456',
			}),
		}));
		expect(runnerDeployment.payload).toMatchObject({
			environment: 'prod',
			deploymentKind: 'mixed',
			status: 'success',
		});

		const details = await json(await app.request(`/v1/projects/${project.id}`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(details.payload.hosting).toMatchObject({
			kind: 'hosted_project',
		});
		expect(details.payload.environments).toHaveLength(2);
		expect(details.payload.resources).toHaveLength(2);
		expect(details.payload.deployments).toHaveLength(2);
		expect(details.payload.agentPools).toHaveLength(1);
	});

	it('stores runner-reported scale decisions and workday summaries', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { team, project } = await createTeamAndProject(app, token, {
			id: 'manager-project',
			slug: 'manager-project',
			name: 'Manager Project',
		});

		await app.request(`/v1/projects/${project.id}/agent-pools`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				teamId: team.id,
				environment: 'staging',
				name: 'primary',
				status: 'active',
				autoscale: {
					minWorkers: 0,
					maxWorkers: 4,
					targetQueueDepth: 2,
					cooldownSeconds: 45,
				},
			}),
		});
		const connection = await json(await app.request(`/v1/projects/${project.id}/connection`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				mode: 'hosted',
				executionOwner: 'project_runner',
				rotateRunnerToken: true,
			}),
		}));
		const runnerToken = connection.payload.runnerToken as string;

		await app.request(`/v1/projects/${project.id}/runner/agent-pools/primary/register`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				teamId: team.id,
				environment: 'staging',
				managerId: 'manager-1',
				serviceName: 'manager',
				desiredWorkers: 2,
				observedQueueDepth: 3,
				observedActiveLeases: 1,
			}),
		});

		const decision = await json(await app.request(`/v1/projects/${project.id}/runner/agent-pools/primary/scale-decisions`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				environment: 'staging',
				poolName: 'primary',
				workDayId: 'workday-1',
				desiredWorkers: 2,
				observedQueueDepth: 3,
				observedActiveLeases: 1,
				reason: 'reconcile',
				metadata: {
					remainingCredits: 4,
				},
			}),
		}));
		expect(decision.payload).toMatchObject({
			projectId: project.id,
			environment: 'staging',
			desiredWorkers: 2,
			reason: 'reconcile',
		});

		const workday = await json(await app.request(`/v1/projects/${project.id}/runner/workdays`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				environment: 'staging',
				workDayId: 'workday-1',
				kind: 'workday_summary',
				state: 'completed',
				startedAt: '2026-04-15T09:00:00.000Z',
				endedAt: '2026-04-15T17:00:00.000Z',
				summary: {
					totalTasks: 3,
					usedTaskCredits: 4,
				},
			}),
		}));
		expect(workday.payload).toMatchObject({
			projectId: project.id,
			environment: 'staging',
			workDayId: 'workday-1',
			kind: 'workday_summary',
		});

		const decisions = await json(await app.request(`/v1/projects/${project.id}/agent-pools/${decision.payload.poolId}/scale-decisions`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(decisions.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({
				desiredWorkers: 2,
				workDayId: 'workday-1',
			}),
		]));

		const workdays = await json(await app.request(`/v1/projects/${project.id}/workdays?environment=staging`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(workdays.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({
				workDayId: 'workday-1',
				kind: 'workday_summary',
			}),
		]));
	});

	it('stores hosted project work policies, priority snapshots, and task-credit ledger entries', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { project } = await createTeamAndProject(app, token, {
			id: 'planning-project',
			slug: 'planning-project',
			name: 'Planning Project',
		});

		const workPolicy = await json(await app.request(`/v1/projects/${project.id}/work-policy`, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				environment: 'staging',
				schedule: {
					timezone: 'America/New_York',
					windows: [{ days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' }],
				},
				dailyTaskCreditBudget: 12,
				maxQueuedTasks: 4,
				maxQueuedCredits: 8,
				autoscale: {
					minWorkers: 0,
					maxWorkers: 3,
					targetQueueDepth: 2,
					cooldownSeconds: 60,
				},
				creditWeights: [{
					type: 'question',
					credits: 3,
				}],
				metadata: {
					managedBy: 'market',
				},
			}),
		}));
		expect(workPolicy.payload).toMatchObject({
			projectId: project.id,
			environment: 'staging',
			dailyTaskCreditBudget: 12,
			maxQueuedTasks: 4,
		});

		const priorityOverride = await json(await app.request(`/v1/projects/${project.id}/priority-overrides`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				model: 'question',
				subjectId: 'question-1',
				priority: 42,
				estimatedCredits: 3,
				metadata: {
					reason: 'customer-escalation',
				},
			}),
		}));
		expect(priorityOverride.payload).toMatchObject({
			projectId: project.id,
			model: 'question',
			subjectId: 'question-1',
			priority: 42,
		});

		const connection = await json(await app.request(`/v1/projects/${project.id}/connection`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				mode: 'hosted',
				executionOwner: 'project_runner',
				rotateRunnerToken: true,
			}),
		}));
		const runnerToken = connection.payload.runnerToken as string;

		const snapshot = await json(await app.request(`/v1/projects/${project.id}/runner/priority-snapshots`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				workDayId: 'workday-2',
				generatedAt: '2026-04-15T13:00:00.000Z',
				snapshot: {
					items: [{
						id: 'question-1',
						model: 'question',
						priority: 42,
						title: 'Critical question',
					}],
				},
				metadata: {
					source: 'manager',
				},
			}),
		}));
		expect(snapshot.payload).toMatchObject({
			projectId: project.id,
			workDayId: 'workday-2',
		});

		const taskCredit = await json(await app.request(`/v1/projects/${project.id}/runner/task-credits`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				workDayId: 'workday-2',
				taskId: 'task-1',
				phase: 'seeded',
				credits: 3,
				metadata: {
					reason: 'queued',
				},
			}),
		}));
		expect(taskCredit.payload).toMatchObject({
			projectId: project.id,
			workDayId: 'workday-2',
			taskId: 'task-1',
			phase: 'seeded',
			credits: 3,
		});

		const listedPolicy = await json(await app.request(`/v1/projects/${project.id}/work-policy?environment=staging`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(listedPolicy.payload).toMatchObject({
			environment: 'staging',
			dailyTaskCreditBudget: 12,
		});

		const listedOverrides = await json(await app.request(`/v1/projects/${project.id}/priority-overrides`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(listedOverrides.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({
				subjectId: 'question-1',
				priority: 42,
			}),
		]));

		const listedSnapshots = await json(await app.request(`/v1/projects/${project.id}/priority-snapshots?workDayId=workday-2`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(listedSnapshots.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({
				workDayId: 'workday-2',
			}),
		]));

		const listedCredits = await json(await app.request(`/v1/projects/${project.id}/workdays/workday-2/task-credits`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(listedCredits.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({
				workDayId: 'workday-2',
				taskId: 'task-1',
				credits: 3,
			}),
		]));
	});

	it('blocks dispatch when a project capability grant is disabled', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { project } = await createTeamAndProject(app, token, {
			id: 'disabled-project',
			slug: 'disabled-project',
			name: 'Disabled Project',
		});

		await app.request(`/v1/projects/${project.id}/capabilities`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				grants: [{
					namespace: 'sdk',
					operation: 'refreshGraph',
					executionClass: 'remote_job',
					allowedTargets: ['project_runner'],
					defaultDispatchMode: 'prefer_remote',
					enabled: false,
				}],
			}),
		});

		const dispatched = await app.request(`/v1/projects/${project.id}/dispatch`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				namespace: 'sdk',
				operation: 'refreshGraph',
				input: {},
			}),
		});

		expect(dispatched.status).toBe(403);
		expect(await json(dispatched)).toMatchObject({
			ok: false,
			error: 'Dispatch capability disabled for project.',
		});
	});

	it('indexes team-owned catalog items and artifact versions centrally', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { team } = await createTeamAndProject(app, token, {
			id: 'catalog-project',
			slug: 'catalog-project',
			name: 'Catalog Project',
			description: 'Central catalog seed',
			metadata: { listingEnabled: true, manifestKey: 'teams/team-one/published/common.json' },
		});

		const catalogItem = await json(await app.request(`/v1/teams/${team.id}/catalog-items`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				kind: 'template',
				slug: 'starter-pro',
				title: 'Starter Pro',
				summary: 'A team-owned starter template.',
				visibility: 'public',
				listingEnabled: true,
				offerMode: 'subscription_updates',
				artifactKey: 'teams/team-one/artifacts/template/starter-pro-v1.zip',
			}),
		}));

		const artifact = await json(await app.request(`/v1/catalog/${catalogItem.payload.id}/artifacts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				kind: 'template_artifact',
				version: '1.0.0',
				contentKey: 'teams/team-one/artifacts/template/starter-pro-v1.zip',
			}),
		}));

		const listed = await json(await app.request('/v1/catalog?kind=template'));
		expect(listed.payload[0]).toMatchObject({
			kind: 'template',
			slug: 'starter-pro',
			offerMode: 'subscription_updates',
			listingEnabled: true,
		});

		const versions = await json(await app.request(`/v1/catalog/${catalogItem.payload.id}/artifacts`));
		expect(versions.payload[0]).toMatchObject({
			version: '1.0.0',
			contentKey: 'teams/team-one/artifacts/template/starter-pro-v1.zip',
		});
		expect(artifact.payload.version).toBe('1.0.0');
	});

	it('exposes market-owned v1 auth, market registry, access, and artifact download contracts', async () => {
		const app = createTestApp({
			config: {
				baseUrl: 'https://market.example.com',
			},
		});
		const started = await json(await app.request('/v1/auth/device/start', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ clientName: 'treeseed-cli', scopes: ['auth:me', 'market'] }),
		}));
		await app.request('/auth/device/approve', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				userCode: started.userCode,
				principalId: 'user-market-v1',
				displayName: 'Market V1 User',
				scopes: ['auth:me', 'market'],
			}),
		});
		const tokenPayload = await json(await app.request('/v1/auth/device/poll', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ deviceCode: started.deviceCode }),
		}));
		expect(tokenPayload.principal.id).toBe('user-market-v1');

		const team = await json(await app.request('/v1/teams', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${tokenPayload.accessToken}`,
			},
			body: JSON.stringify({
				slug: 'market-v1-team',
				name: 'Market V1 Team',
				metadata: {
					marketProfiles: [{
						id: 'enterprise-v1',
						label: 'Enterprise V1',
						baseUrl: 'https://enterprise.example.com',
						kind: 'specialized',
					}],
				},
			}),
		}));
		const project = await json(await app.request(`/v1/teams/${team.payload.id}/projects`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${tokenPayload.accessToken}`,
			},
			body: JSON.stringify({ id: 'market-v1-project', slug: 'market-v1-project', name: 'Market V1 Project' }),
		}));

		const me = await json(await app.request('/v1/me', {
			headers: { authorization: `Bearer ${tokenPayload.accessToken}` },
		}));
		expect(me.payload.principal.id).toBe('user-market-v1');
		expect(me.payload.teams[0].id).toBe(team.payload.id);

		const markets = await json(await app.request('/v1/me/markets', {
			headers: { authorization: `Bearer ${tokenPayload.accessToken}` },
		}));
		expect(markets.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({ id: 'central', kind: 'central', alwaysAvailable: true }),
			expect.objectContaining({ id: 'enterprise-v1', kind: 'specialized', teamId: team.payload.id }),
		]));

		const access = await json(await app.request(`/v1/projects/${project.payload.project.id}/access`, {
			headers: { authorization: `Bearer ${tokenPayload.accessToken}` },
		}));
		expect(access.payload.team.summary.canAdminStaging).toBe(true);
		expect(access.payload.team.summary.canAdminProduction).toBe(true);
		expect(access.payload.environments).toEqual(expect.arrayContaining([
			expect.objectContaining({ environment: 'staging', role: 'admin' }),
			expect.objectContaining({ environment: 'prod', role: 'admin' }),
		]));

		const catalogItem = await json(await app.request(`/v1/teams/${team.payload.id}/catalog-items`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${tokenPayload.accessToken}`,
			},
			body: JSON.stringify({
				kind: 'template',
				slug: 'downloadable-starter',
				title: 'Downloadable Starter',
				visibility: 'public',
				listingEnabled: true,
				offerMode: 'free',
			}),
		}));
		await app.request(`/v1/catalog/${catalogItem.payload.id}/artifacts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${tokenPayload.accessToken}`,
			},
			body: JSON.stringify({
				kind: 'template_artifact',
				version: '1.0.0',
				contentKey: 'teams/market-v1/artifacts/downloadable-starter.tar',
				metadata: {
					contentType: 'application/vnd.treeseed.template+tar',
					sha256: 'abc123',
					downloadUrl: 'https://cdn.example.com/downloadable-starter.tar',
				},
			}),
		});
		const download = await json(await app.request(`/v1/catalog/${catalogItem.payload.id}/artifacts/1.0.0/download`));
		expect(download.payload).toMatchObject({
			itemId: catalogItem.payload.id,
			slug: 'downloadable-starter',
			version: '1.0.0',
			contentType: 'application/vnd.treeseed.template+tar',
			sha256: 'abc123',
			downloadUrl: 'https://cdn.example.com/downloadable-starter.tar',
		});
	});

	it('signs editorial preview links for team-scoped overlays', async () => {
		const app = createTestApp({
			config: {
				baseUrl: 'https://market.example.com',
			},
		});
		const token = await authorizeApp(app);
		const { team } = await createTeamAndProject(app, token, {
			id: 'preview-project',
			slug: 'preview-project',
			name: 'Preview Project',
		});

		const response = await json(await app.request(`/v1/teams/${team.id}/content-previews`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				previewId: 'staging-abc123',
				expiresAt: '2030-01-01T00:00:00.000Z',
			}),
		}));

		expect(response.payload).toMatchObject({
			teamId: team.id,
			previewId: 'staging-abc123',
		});
		expect(response.payload.token).toContain('.');
		expect(response.payload.previewUrl).toContain('?preview=');
	});

	it('executes the managed project launch pipeline and persists launch topology', async () => {
		const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeCoopManagedLaunch').mockResolvedValue({
			workingRoot: '/tmp/knowledge-coop-launch-success',
			repository: {
				slug: 'treeseed-ai/launch-project',
				owner: 'treeseed-ai',
				name: 'launch-project',
				url: 'https://github.com/treeseed-ai/launch-project',
				defaultBranch: 'main',
				stagingBranch: 'staging',
				visibility: 'private',
			},
			workflows: {
				repository: 'treeseed-ai/launch-project',
				workflows: [{ workflowPath: '.github/workflows/verify.yml', changed: true, workingDirectory: '.' }],
				secrets: { existing: [], created: ['TREESEED_API_WEB_SERVICE_SECRET'] },
				variables: { existing: [], created: ['TREESEED_API_BASE_URL'] },
			},
			cloudflare: {
				staging: {
					accountId: 'cf-account-1',
					workerName: 'launch-project-staging',
					siteUrl: 'https://launch-project-staging.pages.dev',
					pages: { projectName: 'launch-project-staging', url: 'https://launch-project-staging.pages.dev' },
					content: { bucketName: 'launch-project-staging-content' },
					siteDataDb: { databaseName: 'launch-project-staging-db' },
					queue: { name: 'launch-project-staging-queue' },
				},
				prod: {
					accountId: 'cf-account-1',
					workerName: 'launch-project',
					siteUrl: 'https://launch-project.pages.dev',
					pages: { projectName: 'launch-project', url: 'https://launch-project.pages.dev' },
					content: { bucketName: 'launch-project-content' },
					siteDataDb: { databaseName: 'launch-project-db' },
					queue: { name: 'launch-project-queue' },
				},
				verification: { ok: true },
			},
			railway: {
				services: [{
					key: 'api',
					scope: 'prod',
					projectName: 'launch-project',
					serviceName: 'launch-project-api',
					publicBaseUrl: 'https://launch-project-api.up.railway.app',
				}],
				deployments: [],
				schedules: [],
				verification: { ok: true },
			},
			projectApiBaseUrl: 'https://launch-project-api.up.railway.app',
			projectSiteUrl: 'https://launch-project.pages.dev',
			projectMetadata: {
				objectiveCount: 1,
				questionCount: 1,
				noteCount: 1,
				proposalCount: 1,
				decisionCount: 1,
				workstreams: [{
					id: 'launch-project:initial-launch',
					title: 'Initial launch',
				}],
			},
			defaultWorkstream: {
				id: 'launch-project:initial-launch',
				title: 'Initial launch',
				state: 'saved_remote',
			},
			phases: [
				{ phase: 'repo_provision', status: 'completed', detail: 'Created repository.', timestamp: '2026-04-16T00:00:00.000Z' },
				{ phase: 'content_bootstrap', status: 'completed', detail: 'Scaffolded starter template.', timestamp: '2026-04-16T00:00:01.000Z' },
				{ phase: 'workflow_bootstrap', status: 'completed', detail: 'Installed workflows.', timestamp: '2026-04-16T00:00:02.000Z' },
				{ phase: 'hosting_registration', status: 'completed', detail: 'Provisioned Cloudflare.', timestamp: '2026-04-16T00:00:03.000Z' },
				{ phase: 'runtime_connection', status: 'completed', detail: 'Connected Railway runtime.', timestamp: '2026-04-16T00:00:04.000Z' },
			],
			templatePackage: {
				outputRoot: '/tmp/knowledge-coop-launch-success/template',
				payloadRoot: '/tmp/knowledge-coop-launch-success/template/payload',
				manifestPath: '/tmp/knowledge-coop-launch-success/template/manifest.json',
				files: ['package.json'],
				manifest: {
					schemaVersion: 1,
					kind: 'template',
					id: 'launch-project-template',
					title: 'Launch Project template',
					summary: 'Template package',
					version: '0.1.0',
					generatedAt: '2026-04-16T00:00:05.000Z',
					projectSlug: 'launch-project',
					sourceProjectRoot: '/tmp/knowledge-coop-launch-success',
					payloadRoot: 'payload',
					files: ['package.json'],
					compatibility: { minCliVersion: '0.1.0', minCoreVersion: '0.1.0', minSdkVersion: '0.1.0' },
					sourceSelection: { includedPaths: ['package.json'] },
					market: { publisherId: 'team-one', publisherName: 'Team One', publishMetadata: {} },
				},
			},
			knowledgePackPackage: {
				outputRoot: '/tmp/knowledge-coop-launch-success/knowledge-pack',
				payloadRoot: '/tmp/knowledge-coop-launch-success/knowledge-pack/payload',
				manifestPath: '/tmp/knowledge-coop-launch-success/knowledge-pack/manifest.json',
				files: ['src/content/objectives/launch.mdx'],
				manifest: {
					schemaVersion: 1,
					kind: 'knowledge_pack',
					id: 'launch-project-pack',
					title: 'Launch Project knowledge pack',
					summary: 'Knowledge pack',
					version: '0.1.0',
					generatedAt: '2026-04-16T00:00:05.000Z',
					projectSlug: 'launch-project',
					sourceProjectRoot: '/tmp/knowledge-coop-launch-success',
					payloadRoot: 'payload',
					files: ['src/content/objectives/launch.mdx'],
					compatibility: { minCliVersion: '0.1.0', minCoreVersion: '0.1.0', minSdkVersion: '0.1.0' },
					sourceSelection: { includedPaths: ['src/content/objectives'] },
					market: { publisherId: 'team-one', publisherName: 'Team One', publishMetadata: {} },
				},
			},
		} as unknown as Awaited<ReturnType<typeof treeseedCore.executeKnowledgeCoopManagedLaunch>>);

		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);

		const launched = await app.request(`/v1/teams/${team.id}/projects/launch`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				slug: 'launch-project',
				name: 'Launch Project',
				sourceKind: 'template',
				sourceRef: 'starter-basic',
				hostingMode: 'managed',
			}),
		});

		expect(launched.status).toBe(200);
		const payload = await json(launched);
		expect(payload.ok).toBe(true);
		expect(payload.payload.project.project.slug).toBe('launch-project');
		expect(payload.payload.project.connection.projectApiBaseUrl).toBe('https://launch-project-api.up.railway.app');
		expect(payload.payload.launchJob.status).toBe('completed');
		expect(launchSpy).toHaveBeenCalledTimes(1);

		const details = await json(await app.request(`/v1/projects/${payload.payload.project.project.id}`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(details.payload.hosting.sourceRepoUrl).toBe('https://github.com/treeseed-ai/launch-project');
		expect(details.payload.environments.find((entry: { environment: string }) => entry.environment === 'prod')?.baseUrl).toBe('https://launch-project.pages.dev');
		expect(details.payload.resources.some((entry: { provider: string; resourceKind: string }) => entry.provider === 'cloudflare' && entry.resourceKind === 'pages')).toBe(true);

		const inbox = await json(await app.request(`/v1/teams/${team.id}/inbox`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(inbox.payload.some((entry: { kind: string }) => entry.kind === 'launch_failure')).toBe(false);
	}, 15000);

	it('records launch failures as recoverable inbox items', async () => {
		const error = Object.assign(new Error('GitHub denied repository creation.'), {
			phase: 'repo_provision_failed',
			phases: [
				{ phase: 'repo_provision', status: 'failed', detail: 'GitHub denied repository creation.', timestamp: '2026-04-16T00:00:00.000Z' },
			],
		});
		vi.spyOn(treeseedCore, 'executeKnowledgeCoopManagedLaunch').mockRejectedValue(error);

		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);

		const launched = await app.request(`/v1/teams/${team.id}/projects/launch`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				slug: 'failed-launch',
				name: 'Failed Launch',
				sourceKind: 'blank',
				hostingMode: 'managed',
			}),
		});

		expect(launched.status).toBe(502);
		const payload = await json(launched);
		expect(payload.ok).toBe(false);
		expect(payload.payload.launchJob.status).toBe('failed');
		expect(payload.payload.project.project.metadata.launchPhase).toBe('failed');

		const inbox = await json(await app.request(`/v1/teams/${team.id}/inbox`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(inbox.payload.some((entry: { kind: string; title: string }) => entry.kind === 'launch_failure' && entry.title.includes('Failed Launch'))).toBe(true);
	});

	it('manages capacity providers, lanes, grants, and project plans', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { team, project } = await createTeamAndProject(app, token, {
			slug: 'capacity-project',
			name: 'Capacity Project',
		});

		const providerResponse = await app.request(`/v1/teams/${team.id}/capacity-providers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'OpenRouter Pool',
				provider: 'openrouter',
				kind: 'team_owned',
				billingScope: 'team',
				dailyCreditBudget: 500,
				monthlyCreditBudget: 5000,
			}),
		});
		expect(providerResponse.status).toBe(201);
		const provider = (await json(providerResponse)).payload;

		const laneResponse = await app.request(`/v1/teams/${team.id}/capacity-providers/${provider.id}/lanes`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Cheap summaries',
				businessModel: 'token_metered',
				unit: 'token_usd',
				scarcityLevel: 'low',
				modelClass: 'small',
			}),
		});
		expect(laneResponse.status).toBe(201);
		const lane = (await json(laneResponse)).payload;

		const grantResponse = await app.request(`/v1/teams/${team.id}/capacity-grants`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				capacityProviderId: provider.id,
				laneId: lane.id,
				grantScope: 'project',
				projectId: project.id,
				environment: 'staging',
				dailyCreditLimit: 120,
				dailyUsdLimit: 2,
			}),
		});
		expect(grantResponse.status).toBe(201);

		const plan = await json(await app.request(`/v1/projects/${project.id}/capacity-plan?environment=staging`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(plan.payload.providers[0]).toMatchObject({ id: provider.id, provider: 'openrouter' });
		expect(plan.payload.lanes[0]).toMatchObject({ id: lane.id, businessModel: 'token_metered' });
		expect(plan.payload.remaining.dailyCredits).toBe(120);
	});
});
