import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as treeseedCore from '@treeseed/core';
import { AgentSdk, PlatformRunnerClient } from '@treeseed/sdk';
import type { D1DatabaseLike, D1PreparedStatementLike } from '@treeseed/core/types/cloudflare';
import { createMarketApiApp } from '../../src/api/app.js';
import { MarketControlPlaneStore } from '../../src/api/store.js';
import { listTreeseedManagedHostsFromConfig } from '../../src/lib/market/managed-hosts.js';
import { runOnceWithClient } from '../../src/market-operations-runner/entrypoint.js';

const runTreeseedHostingAuditMock = vi.hoisted(() => vi.fn(async (input: Record<string, unknown> = {}) => ({
	ok: true,
	environment: input.environment === 'prod' ? 'prod' : input.environment === 'local' ? 'local' : 'staging',
	requestedEnvironment: input.environment ?? 'current',
	repairMode: input.repair === true,
	repaired: false,
	target: { kind: 'persistent', scope: input.environment === 'prod' ? 'prod' : 'staging', label: input.environment === 'prod' ? 'prod' : 'staging' },
	hostKinds: input.hostKinds ?? ['repository', 'web', 'email'],
	checkedAt: '2026-01-01T00:00:00.000Z',
	checks: [],
	missingConfig: [],
	resources: {},
	warnings: [],
	blockers: [],
	nextActions: ['Hosting setup is ready for host saving and project launch.'],
})));

vi.mock('@treeseed/sdk/workflow-support', async (importOriginal) => ({
	...(await importOriginal<typeof import('@treeseed/sdk/workflow-support')>()),
	runTreeseedHostingAudit: runTreeseedHostingAuditMock,
}));

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
const hubLaunchSpineMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0020_hub_launch_spine.sql'),
	resolve(packageRoot, '../migrations/0020_hub_launch_spine.sql'),
];
const hubLaunchSpineMigrationPath = hubLaunchSpineMigrationPathCandidates.find((candidate) => existsSync(candidate));
const capacityProviderApiKeysMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0021_capacity_provider_api_keys.sql'),
	resolve(packageRoot, '../migrations/0021_capacity_provider_api_keys.sql'),
];
const capacityProviderApiKeysMigrationPath = capacityProviderApiKeysMigrationPathCandidates.find((candidate) => existsSync(candidate));
const capacityProviderRuntimeMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0026_capacity_provider_runtime.sql'),
	resolve(packageRoot, '../migrations/0026_capacity_provider_runtime.sql'),
];
const capacityProviderRuntimeMigrationPath = capacityProviderRuntimeMigrationPathCandidates.find((candidate) => existsSync(candidate));
const platformOperationsMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0027_platform_operations.sql'),
	resolve(packageRoot, '../migrations/0027_platform_operations.sql'),
];
const platformOperationsMigrationPath = platformOperationsMigrationPathCandidates.find((candidate) => existsSync(candidate));
const seedRunsMigrationPathCandidates = [
	resolve(packageRoot, 'migrations/0024_seed_runs.sql'),
	resolve(packageRoot, '../migrations/0024_seed_runs.sql'),
];
const seedRunsMigrationPath = seedRunsMigrationPathCandidates.find((candidate) => existsSync(candidate));
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
const resolvedHubLaunchSpineMigrationPath = hubLaunchSpineMigrationPath as string;
const resolvedCapacityProviderApiKeysMigrationPath = capacityProviderApiKeysMigrationPath as string;
const resolvedCapacityProviderRuntimeMigrationPath = capacityProviderRuntimeMigrationPath as string;
const resolvedPlatformOperationsMigrationPath = platformOperationsMigrationPath as string;
const resolvedSeedRunsMigrationPath = seedRunsMigrationPath as string;

if (!authMigrationPath || !marketMigrationPath || !catalogMigrationPath || !topologyMigrationPath || !reportingMigrationPath || !webHostsMigrationPath || !capacityMigrationPath || !workdayManagerMigrationPath || !hubLaunchSpineMigrationPath || !capacityProviderApiKeysMigrationPath || !capacityProviderRuntimeMigrationPath || !platformOperationsMigrationPath || !seedRunsMigrationPath) {
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
		this.db.exec(readFileSync(resolvedHubLaunchSpineMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedCapacityProviderApiKeysMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedCapacityProviderRuntimeMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedPlatformOperationsMigrationPath, 'utf8'));
		this.db.exec(readFileSync(resolvedSeedRunsMigrationPath, 'utf8'));
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
	store?: MarketControlPlaneStore;
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
			siteUrl: 'https://market.example.com',
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

function createTestStore(db: D1DatabaseLike) {
	return new MarketControlPlaneStore({
		repoRoot: packageRoot,
		authSecret: 'test-secret',
		baseUrl: 'https://market.example.com',
		siteUrl: 'https://market.example.com',
		issuer: 'https://market.example.com',
		projectId: 'treeseed-market',
		projectApiKey: 'market-project-key',
		projectApiPermissions: ['sdk:execute:global', 'agent:execute:global', 'operations:execute:global'],
		serviceId: 'web',
		serviceSecret: 'web-test-secret',
		assertionSecret: 'web-assertion-secret',
	}, db);
}

async function json(response: Response) {
	return response.json() as Promise<any>;
}

function git(cwd: string, args: string[]) {
	return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

async function withHttpMarketApp<T>(app: ReturnType<typeof createTestApp>, action: (baseUrl: string) => Promise<T>) {
	const server = createServer((request, response) => {
		void (async () => {
			const chunks: Buffer[] = [];
			for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
			const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
			const webResponse = await app.fetch(new Request(url, {
				method: request.method,
				headers: request.headers as HeadersInit,
				body,
			}));
			response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));
			response.end(Buffer.from(await webResponse.arrayBuffer()));
		})().catch((error) => {
			response.writeHead(500, { 'content-type': 'application/json' });
			response.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
		});
	});
	await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
	const address = server.address();
	const baseUrl = typeof address === 'object' && address ? `http://127.0.0.1:${address.port}` : '';
	try {
		return await action(baseUrl);
	} finally {
		await new Promise<void>((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
	}
}

function createRunnerRepoFixture() {
	const root = mkdtempSync(resolve(tmpdir(), 'treeseed-market-runner-'));
	const repo = resolve(root, 'repo');
	const workspace = resolve(root, 'workspace');
	mkdirSync(resolve(repo, 'src/content/notes'), { recursive: true });
	mkdirSync(workspace, { recursive: true });
	writeFileSync(resolve(repo, 'README.md'), 'runner fixture\n', 'utf8');
	git(repo, ['init', '-b', 'staging']);
	git(repo, ['config', 'user.email', 'test@example.com']);
	git(repo, ['config', 'user.name', 'TreeSeed Test']);
	git(repo, ['add', '.']);
	git(repo, ['commit', '-m', 'init']);
	return { root, repo, workspace };
}

function unsignedTestJwt(payload: Record<string, unknown>) {
	const encode = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
	return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
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

function encryptedTestHostEnvelope(config: Record<string, unknown>, passphrase: string) {
	return encryptedHostEnvelope({
		algorithm: 'test-json',
		passphrase,
		ciphertext: Buffer.from(JSON.stringify(config), 'utf8').toString('base64'),
	});
}

runtimeDescribe('market api', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('owns web auth lifecycle and acceptance session seeding in the Market API', async () => {
		const app = createTestApp();
		const signup = await json(await app.request('/v1/auth/web/sign-up', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				email: 'api-auth@example.com',
				username: 'api-auth-user',
				password: 'TreeSeed-auth-test-123!',
				name: 'API Auth User',
			}),
		}));
		expect(signup.ok).toBe(true);
		expect(signup.payload.accessToken).toEqual(expect.any(String));
		const signin = await json(await app.request('/v1/auth/web/sign-in', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				email: 'api-auth@example.com',
				password: 'TreeSeed-auth-test-123!',
			}),
		}));
		expect(signin.ok).toBe(true);
		const sessions = await json(await app.request('/v1/auth/web/sessions', {
			headers: { authorization: `Bearer ${signin.payload.accessToken}` },
		}));
		expect(sessions.ok).toBe(true);
		expect(sessions.payload.length).toBeGreaterThan(0);
		const seeded = await json(await app.request('/v1/acceptance/seed', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-treeseed-service-id': 'web',
				'x-treeseed-service-secret': 'web-test-secret',
			},
			body: JSON.stringify({ namespace: 'acceptance-test' }),
		}));
		expect(seeded.ok).toBe(true);
		expect(seeded.payload.actors.siteAdmin.accessToken).toEqual(expect.any(String));
		expect(seeded.payload.actors.providerKey.accessToken).toEqual(expect.any(String));
		expect(seeded.payload.fixtures.team.id).toEqual(expect.any(String));
		expect(seeded.payload.fixtures.project.id).toEqual(expect.any(String));
		expect(seeded.payload.fixtures.provider.id).toEqual(expect.any(String));
		expect(seeded.payload.fixtures.platformOperation.id).toEqual(expect.any(String));
		expect(seeded.payload.fixtures.platformRunner.id).toEqual(expect.any(String));
		expect(seeded.payload.fixtures.catalogItem.id).toEqual(expect.any(String));
		expect(seeded.payload.fixtures.catalogArtifact.version).toBe('1.0.0');
		expect(seeded.payload.fixtures.seedRun.id).toEqual(expect.any(String));
		expect(seeded.payload.fixtures.passwordReset.token).toEqual(expect.any(String));
	});

	it('deletes projects and project-owned records through the project API', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { team, project } = await createTeamAndProject(app, token, {
			slug: 'delete-me',
			name: 'Delete Me',
			description: 'Temporary project',
		});
		const headers = {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		};

		const blockers = await json(await app.request(`/v1/projects/${project.id}/deletion-blockers`, { headers }));
		expect(blockers.ok).toBe(true);
		expect(blockers.payload).toEqual([]);

		await app.request(`/v1/projects/${project.id}/work-policy`, {
			method: 'PUT',
			headers,
			body: JSON.stringify({
				environment: 'local',
				enabled: true,
				dailyCreditBudget: 100,
			}),
		});

		const rejected = await json(await app.request(`/v1/projects/${project.id}`, {
			method: 'DELETE',
			headers,
			body: JSON.stringify({ confirmation: 'DELETE wrong' }),
		}));
		expect(rejected.ok).toBe(false);
		expect(rejected.code).toBe('confirmation');

		const deleted = await json(await app.request(`/v1/projects/${project.id}`, {
			method: 'DELETE',
			headers,
			body: JSON.stringify({ confirmation: 'DELETE delete-me' }),
		}));
		expect(deleted.ok).toBe(true);
		expect(deleted.project.id).toBe(project.id);

		const after = await app.request(`/v1/projects/${project.id}`, {
			headers: { authorization: `Bearer ${token}` },
		});
		expect(after.status).toBe(404);
		const projects = await json(await app.request(`/v1/projects?teamId=${team.id}`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(projects.payload.find((entry: { id: string }) => entry.id === project.id)).toBeUndefined();
	});

	it('updates project profile settings through the project API', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { team, project } = await createTeamAndProject(app, token, {
			slug: 'settings-before',
			name: 'Settings Before',
			description: 'Before description',
		});
		const headers = {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		};

		const updated = await json(await app.request(`/v1/projects/${project.id}`, {
			method: 'PUT',
			headers,
			body: JSON.stringify({
				slug: 'settings-after',
				name: 'Settings After',
				description: 'After description',
			}),
		}));
		expect(updated.ok).toBe(true);
		expect(updated.payload.project.slug).toBe('settings-after');
		expect(updated.payload.project.name).toBe('Settings After');

		const listed = await json(await app.request(`/v1/projects?teamId=${team.id}`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(listed.payload.find((entry: { id: string }) => entry.id === project.id)?.slug).toBe('settings-after');

		const duplicate = await json(await app.request(`/v1/teams/${team.id}/projects`, {
			method: 'POST',
			headers,
			body: JSON.stringify({ slug: 'taken-project', name: 'Taken Project' }),
		}));
		const rejected = await json(await app.request(`/v1/projects/${duplicate.payload.project.id}`, {
			method: 'PUT',
			headers,
			body: JSON.stringify({
				slug: 'settings-after',
				name: 'Taken Project',
			}),
		}));
		expect(rejected.ok).toBe(false);
		expect(rejected.code).toBe('slug_taken');
	});

	it('blocks project deletion while active work is attached', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { project } = await createTeamAndProject(app, token, {
			slug: 'busy-project',
			name: 'Busy Project',
		});
		const headers = {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		};

		await app.request(`/v1/projects/${project.id}/workday-requests`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				environment: 'local',
				type: 'one_off_run',
				reason: 'block deletion',
			}),
		});
		const blockers = await json(await app.request(`/v1/projects/${project.id}/deletion-blockers`, { headers }));
		expect(blockers.payload.some((entry: { code: string }) => entry.code === 'workday_request')).toBe(true);

		const deleted = await json(await app.request(`/v1/projects/${project.id}`, {
			method: 'DELETE',
			headers,
			body: JSON.stringify({ confirmation: 'DELETE busy-project' }),
		}));
		expect(deleted.ok).toBe(false);
		expect(deleted.code).toBe('blocked');
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

	it('audits team hosting readiness without exposing secrets', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);
		const audited = await json(await app.request(`/v1/teams/${team.id}/hosting-audit`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				environment: 'local',
				hostKinds: ['repository'],
			}),
		}));
		expect(audited.ok).toBe(true);
		expect(audited.payload.ok).toBe(true);
		expect(runTreeseedHostingAuditMock).toHaveBeenCalledWith(expect.objectContaining({
			environment: 'local',
			hostKinds: ['repository'],
			repair: false,
		}));
		expect(JSON.stringify(audited)).not.toContain('secret-token');
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

		it('lists generic hosts with TreeSeed managed web and capacity provider host records', async () => {
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
					name: 'Team Capacity Provider Host',
					provider: 'railway',
					ownership: 'team_owned',
					accountLabel: 'Capacity Provider Workspace',
					allowedEnvironments: ['staging', 'prod'],
					encryptedPayload: encryptedHostEnvelope(),
					metadata: {
						hostType: 'capacity_provider',
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
			]));
			expect(listed.payload.find((host: any) => host.name === 'Team Capacity Provider Host')).toMatchObject({
				provider: 'railway',
				ownership: 'team_owned',
				metadata: expect.objectContaining({ hostType: 'capacity_provider' }),
			});
			expect(JSON.stringify(listed)).not.toContain('railway-secret-token');
		});

	it('marks TreeSeed managed hosts active from existing platform provider env vars', async () => {
		await withEnv({
			CLOUDFLARE_API_TOKEN: 'platform-cloudflare-token',
			CLOUDFLARE_ACCOUNT_ID: 'platform-cloudflare-account',
			}, async () => {
			const app = createTestApp();
			const token = await authorizeApp(app);
			const team = await createTeam(app, token);

			const listed = await json(await app.request(`/v1/teams/${team.id}/hosts`, {
				headers: { authorization: `Bearer ${token}` },
				}));
				const web = listed.payload.find((host: any) => host.id === 'treeseed-managed-web');
				expect(web.status).toBe('active');
				expect(web.metadata.missingConfigKeys).toEqual([]);
				expect(JSON.stringify(listed)).not.toContain('platform-cloudflare-token');
			});
		});

	it('does not read local machine config for remote managed host status', async () => {
		await withEnv({
			TREESEED_LOCAL_DEV_MODE: undefined,
			TREESEED_ENVIRONMENT: 'staging',
			CLOUDFLARE_API_TOKEN: undefined,
			CLOUDFLARE_ACCOUNT_ID: undefined,
			}, async () => {
			const hosts = await listTreeseedManagedHostsFromConfig('team_remote', {
				env: {
					TREESEED_ENVIRONMENT: 'staging',
				},
				});
				expect(hosts.find((host: any) => host.id === 'treeseed-managed-web')?.status).toBe('configuration_required');
				expect(hosts.find((host: any) => host.id === 'treeseed-managed-capacity-provider')).toBeUndefined();
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
		const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeHubProviderLaunch').mockRejectedValue(new Error('launch intentionally stopped'));
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);
		const passphrase = 'correct horse battery staple';
		const host = await json(await app.request(`/v1/teams/${team.id}/web-hosts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Team Cloudflare',
				ownership: 'team_owned',
				encryptedPayload: encryptedTestHostEnvelope({
					CLOUDFLARE_API_TOKEN: 'cf-secret-token',
					CLOUDFLARE_ACCOUNT_ID: 'account-1',
				}, passphrase),
			}),
		}));
		const session = await json(await app.request(`/v1/teams/${team.id}/provider-credential-sessions`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				hostKind: 'web_host',
				hostId: host.payload.id,
				passphrase,
				purpose: 'launch_project',
				expiresInSeconds: 600,
			}),
		}));
		expect(session.payload.id).toBeTruthy();

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
				credentialSessions: {
					webHost: session.payload.id,
				},
			}),
		});
		expect(launched.status).toBe(202);
		const launchPayload = await json(launched);
		expect(JSON.stringify(launchPayload)).not.toContain('cf-secret-token');
		expect(launchPayload.payload.launchJob.status).toBe('pending');
		expect(launchSpy).not.toHaveBeenCalled();
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
		expect(details.payload.latestLaunch.state).toBe('queued');
		expect(JSON.stringify(details)).not.toContain('cf-secret-token');
		const connection = await json(await app.request(`/v1/projects/${projectId}/connection`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				mode: 'hosted',
				rotateRunnerToken: true,
			}),
		}));
		const consumed = await json(await app.request(`/v1/jobs/${launchPayload.payload.launchJob.id}/provider-credential-sessions/${session.payload.id}/consume`, {
			method: 'POST',
			headers: { authorization: `Bearer ${connection.payload.runnerToken}` },
		}));
		expect(consumed.payload.hostKind).toBe('web_host');
		expect(consumed.payload.config.CLOUDFLARE_API_TOKEN).toBe('cf-secret-token');
		const consumedAgain = await app.request(`/v1/jobs/${launchPayload.payload.launchJob.id}/provider-credential-sessions/${session.payload.id}/consume`, {
			method: 'POST',
			headers: { authorization: `Bearer ${connection.payload.runnerToken}` },
		});
		expect(consumedAgain.status).toBe(404);
	});

	it('launch with TreeSeed managed Cloudflare host records paid hosting metadata', async () => {
		await withEnv({
			CLOUDFLARE_API_TOKEN: 'managed-token',
			CLOUDFLARE_ACCOUNT_ID: 'managed-account',
		}, async () => {
			const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeHubProviderLaunch').mockRejectedValue(new Error('launch intentionally stopped'));
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
			expect(launched.status).toBe(202);
			const launchPayload = await json(launched);
			expect(launchPayload.payload.launchJob.status).toBe('pending');
			expect(launchSpy).not.toHaveBeenCalled();
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

		it('rejects removed runtime host fields during project launch', async () => {
			await withEnv({
				CLOUDFLARE_API_TOKEN: 'managed-token',
				CLOUDFLARE_ACCOUNT_ID: 'managed-account',
			}, async () => {
				const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeHubProviderLaunch').mockRejectedValue(new Error('launch intentionally stopped'));
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
					slug: 'hosted-with-capacity-provider',
					name: 'Hosted With Capacity Provider',
						sourceKind: 'blank',
						hostingMode: 'managed',
						cloudflareHostMode: 'treeseed_managed',
						processingHostMode: 'treeseed_managed',
						processingHostId: 'treeseed-managed-runtime',
					}),
				});
				expect(launched.status).toBe(400);
				const launchPayload = await json(launched);
				expect(launchPayload.error).toMatch(/no longer accepts runtime host configuration/u);
				expect(launchSpy).not.toHaveBeenCalled();
			});
		});

	it('launch with TreeSeed managed Cloudflare host fails when operational credentials are missing', async () => {
		await withEnv({
			CLOUDFLARE_API_TOKEN: undefined,
			CLOUDFLARE_ACCOUNT_ID: undefined,
		}, async () => {
			vi.spyOn(process, 'cwd').mockReturnValue('/tmp/treeseed-missing-managed-host-config');
			const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeHubProviderLaunch').mockRejectedValue(new Error('launch should not run'));
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

	it('delegates project agents artifact, approval, and Codex readiness requests with read-only fallbacks', async () => {
		const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === 'https://project.example.com/v1/agent-artifacts') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						items: [{
							artifactKind: 'knowledge_draft',
							id: 'knowledge:runtime',
							title: 'Runtime',
							targetPath: 'src/content/knowledge/architecture/runtime/runtime.mdx',
							totalScore: 29,
							recommendation: 'promote',
						}],
						warnings: [],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/agent-artifacts/knowledge%3Aruntime') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						artifact: {
							id: 'knowledge:runtime',
							artifactKind: 'knowledge_draft',
							title: 'Runtime',
						},
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/agent-artifacts/knowledge%3Aruntime/source-map') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						artifactId: 'knowledge:runtime',
						sourceMap: [{ path: 'packages/agent/src/services/manager.ts', evidence: 'direct' }],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/agent-artifacts/knowledge%3Aruntime/diff') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						artifactId: 'knowledge:runtime',
						changedPaths: ['src/content/knowledge/architecture/runtime/runtime.mdx'],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/approvals') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						items: [{ id: 'promotion:runtime', taskId: 'task-promote' }],
						warnings: [],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/approvals/promotion%3Aruntime') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						approval: { id: 'promotion:runtime', state: 'pending' },
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/agents/status') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						agents: [{ agentSlug: 'treeseed-docs-planner', handler: 'planner', status: 'idle' }],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/research-notes') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						items: [{ taskId: 'task-research', researchNote: { id: 'research:runtime' } }],
						warnings: [],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/knowledge-drafts') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						items: [{ taskId: 'task-draft', knowledgeDraft: { id: 'knowledge:runtime', title: 'Runtime' } }],
						warnings: [],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/optimization-reports') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						items: [{ taskId: 'task-optimize', optimizationReport: { id: 'optimization:runtime', draftId: 'knowledge:runtime', totalScore: 29, recommendation: 'promote' } }],
						warnings: [],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/approvals/promotion%3Aruntime/decision') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						id: 'promotion:runtime',
						decision: JSON.parse(String(init?.body ?? '{}')).decision,
						releaseAttempted: false,
						stagingAttempted: false,
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/providers/codex/readiness') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						ok: true,
						providerSelected: true,
						sdkInstalled: true,
						nodeVersionOk: true,
						authDetected: false,
						subscriptionPlan: 'pro',
						warnings: [],
						blockingIssues: [],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/operations/grants') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						items: [{
							id: 'grant-stage-docs',
							operations: ['stage'],
							modes: ['dry_run'],
							allowedPaths: ['src/content/knowledge/**'],
						}],
						warnings: [],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/operations/events') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						items: [{
							id: 'event-stage-1',
							operation: 'stage',
							status: 'completed',
							changedPaths: ['src/content/knowledge/architecture/runtime/runtime.mdx'],
							stagedPaths: ['src/content/knowledge/architecture/runtime/runtime.mdx'],
						}],
						lifecycle: {
							worktreeSnapshots: [{ kind: 'verified_snapshot', taskId: 'task-promote' }],
							stagingMerges: [{ mergedToStaging: true, commitSha: 'abc123' }],
							mergeFailures: [],
							repairTasks: [],
							releaseApprovals: [],
							releaseResults: [],
							codexUsage: [],
						},
						warnings: [],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/operations/stage/dry-run') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						dryRun: true,
						decision: { allowed: true },
						result: { status: 'completed' },
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/workdays/current') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						id: 'workday-1',
						state: 'active',
						updatedAt: '2026-05-13T00:00:00.000Z',
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			if (url === 'https://project.example.com/v1/workdays/reports') {
				return new Response(JSON.stringify({
					ok: true,
					payload: {
						projectId: 'hosted-project',
						items: [{ id: 'report-1', kind: 'workday_summary', workDayId: 'workday-1', createdAt: '2026-05-13T00:01:00.000Z' }],
						warnings: [],
					},
				}), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			return new Response(JSON.stringify({ ok: false }), { status: 404, headers: { 'content-type': 'application/json' } });
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

		const headers = { authorization: `Bearer ${token}` };
		const artifacts = await json(await app.request(`/v1/projects/${project.id}/agent-artifacts`, { headers }));
		expect(artifacts.payload.items).toEqual([expect.objectContaining({ id: 'knowledge:runtime' })]);

		const artifactDetail = await json(await app.request(`/v1/projects/${project.id}/agent-artifacts/knowledge%3Aruntime`, { headers }));
		expect(artifactDetail.payload.artifact).toMatchObject({ id: 'knowledge:runtime' });

		const sourceMap = await json(await app.request(`/v1/projects/${project.id}/agent-artifacts/knowledge%3Aruntime/source-map`, { headers }));
		expect(sourceMap.payload.sourceMap).toEqual([expect.objectContaining({ path: 'packages/agent/src/services/manager.ts' })]);

		const artifactDiff = await json(await app.request(`/v1/projects/${project.id}/agent-artifacts/knowledge%3Aruntime/diff`, { headers }));
		expect(artifactDiff.payload.changedPaths).toEqual(['src/content/knowledge/architecture/runtime/runtime.mdx']);

		const approvals = await json(await app.request(`/v1/projects/${project.id}/approvals`, { headers }));
		expect(approvals.payload.items).toEqual([expect.objectContaining({ id: 'promotion:runtime' })]);

		const approvalDetail = await json(await app.request(`/v1/projects/${project.id}/approvals/promotion%3Aruntime`, { headers }));
		expect(approvalDetail.payload.approval).toMatchObject({ id: 'promotion:runtime' });

		const operationGrants = await json(await app.request(`/v1/projects/${project.id}/operations/grants`, { headers }));
		expect(operationGrants.payload.items).toEqual([expect.objectContaining({ id: 'grant-stage-docs' })]);

		const operationEvents = await json(await app.request(`/v1/projects/${project.id}/operations/events`, { headers }));
		expect(operationEvents.payload.items).toEqual([expect.objectContaining({ operation: 'stage' })]);
		expect(operationEvents.payload.lifecycle).toMatchObject({
			worktreeSnapshots: [expect.objectContaining({ kind: 'verified_snapshot' })],
			stagingMerges: [expect.objectContaining({ mergedToStaging: true })],
		});

		const operationDryRun = await json(await app.request(`/v1/projects/${project.id}/operations/stage/dry-run`, {
			method: 'POST',
			headers: {
				...headers,
				'content-type': 'application/json',
			},
			body: JSON.stringify({ request: { mode: 'dry_run' } }),
		}));
		expect(operationDryRun.payload).toMatchObject({
			dryRun: true,
			result: { status: 'completed' },
		});

		const delegatedDecision = await json(await app.request(`/v1/projects/${project.id}/approvals/promotion%3Aruntime/decision`, {
			method: 'POST',
			headers: {
				...headers,
				'content-type': 'application/json',
			},
			body: JSON.stringify({ decision: 'approve_as_book_content', reason: 'Reviewed in Agents page.' }),
		}));
		expect(delegatedDecision.payload).toMatchObject({
			id: 'promotion:runtime',
			decision: 'approve_as_book_content',
			releaseAttempted: false,
			stagingAttempted: false,
		});
		const decisionCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/v1/approvals/promotion%3Aruntime/decision'));
		expect(decisionCall?.[1]).toMatchObject({ method: 'POST' });
		expect(JSON.parse(String(decisionCall?.[1]?.body ?? '{}'))).toMatchObject({
			decision: 'approve_as_book_content',
			reason: 'Reviewed in Agents page.',
		});

		const delegatedAliasDecision = await json(await app.request(`/v1/projects/${project.id}/approvals/promotion%3Aruntime/decision`, {
			method: 'POST',
			headers: {
				...headers,
				'content-type': 'application/json',
			},
			body: JSON.stringify({ decision: 'approve', reason: 'Reviewed from the governance table.' }),
		}));
		expect(delegatedAliasDecision.payload).toMatchObject({
			id: 'promotion:runtime',
			decision: 'approve',
		});

		const invalidDecision = await app.request(`/v1/projects/${project.id}/approvals/promotion%3Aruntime/decision`, {
			method: 'POST',
			headers: {
				...headers,
				'content-type': 'application/json',
			},
			body: JSON.stringify({ decision: 'publish_release' }),
		});
		expect(invalidDecision.status).toBe(400);
		expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/v1/approvals/promotion%3Aruntime/decision'))).toHaveLength(2);

		const readiness = await json(await app.request(`/v1/projects/${project.id}/providers/codex/readiness`, { headers }));
		expect(readiness.payload).toMatchObject({ providerSelected: true, subscriptionPlan: 'pro' });

		const agents = await json(await app.request(`/v1/projects/${project.id}/agents`, { headers }));
		expect(agents.payload).toMatchObject({
			projectId: 'hosted-project',
			agents: [expect.objectContaining({ agentSlug: 'treeseed-docs-planner' })],
			generatedArtifacts: [expect.objectContaining({ id: 'knowledge:runtime', totalScore: 29 })],
			researchNotes: [expect.objectContaining({ taskId: 'task-research' })],
			knowledgeDrafts: [expect.objectContaining({ taskId: 'task-draft' })],
			optimizationReports: [expect.objectContaining({ taskId: 'task-optimize' })],
			approvals: [expect.objectContaining({ id: 'promotion:runtime' })],
			operationGrants: [expect.objectContaining({ id: 'grant-stage-docs' })],
			operationEvents: [expect.objectContaining({ operation: 'stage' })],
			operationLifecycle: expect.objectContaining({
				worktreeSnapshots: [expect.objectContaining({ kind: 'verified_snapshot' })],
				stagingMerges: [expect.objectContaining({ mergedToStaging: true })],
			}),
			codexReadiness: expect.objectContaining({ providerSelected: true, subscriptionPlan: 'pro' }),
			currentWorkday: expect.objectContaining({ id: 'workday-1', state: 'active' }),
			runtimeReports: [expect.objectContaining({ id: 'report-1' })],
			docsAutomation: expect.objectContaining({
				researchNoteCount: 1,
				knowledgeDraftCount: 1,
				optimizationReportCount: 1,
				generatedArtifactCount: 1,
			}),
		});

		const agentDetail = await json(await app.request(`/v1/projects/${project.id}/agents/treeseed-docs-planner`, { headers }));
		expect(agentDetail.payload.agent).toMatchObject({ agentSlug: 'treeseed-docs-planner', handler: 'planner' });

		const disconnectedProjectResponse = await json(await app.request(`/v1/teams/${project.teamId}/projects`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				id: 'disconnected-project',
				slug: 'disconnected-project',
				name: 'Disconnected Project',
			}),
		}));
		const disconnectedProject = disconnectedProjectResponse.payload.project;
		const fallback = await json(await app.request(`/v1/projects/${disconnectedProject.id}/agent-artifacts`, { headers }));
		expect(fallback.payload).toMatchObject({
			items: [],
			warnings: ['Project runtime is not connected or unavailable.'],
		});
		const fallbackOperations = await json(await app.request(`/v1/projects/${disconnectedProject.id}/operations/grants`, { headers }));
		expect(fallbackOperations.payload).toMatchObject({
			items: [],
			warnings: ['Project runtime is not connected or unavailable.'],
		});

		const fallbackDryRun = await app.request(`/v1/projects/${disconnectedProject.id}/operations/stage/dry-run`, {
			method: 'POST',
			headers: {
				...headers,
				'content-type': 'application/json',
			},
			body: JSON.stringify({ request: { mode: 'dry_run' } }),
		});
		expect(fallbackDryRun.status).toBe(409);

		const unavailableDecision = await json(await app.request(`/v1/projects/${disconnectedProject.id}/approvals/promotion%3Aruntime/decision`, {
			method: 'POST',
			headers: {
				...headers,
				'content-type': 'application/json',
			},
			body: JSON.stringify({ decision: 'reject' }),
		}));
		expect(unavailableDecision).toMatchObject({
			ok: false,
			payload: {
				approvalId: 'promotion:runtime',
				warnings: ['Project runtime is not connected or unavailable.'],
				releaseAttempted: false,
				stagingAttempted: false,
			},
		});

		const disconnectedAgents = await json(await app.request(`/v1/projects/${disconnectedProject.id}/agents`, { headers }));
		expect(disconnectedAgents.payload).toMatchObject({
			generatedArtifacts: [],
			approvals: [],
			operationGrants: [],
			operationEvents: [],
			operationLifecycle: expect.objectContaining({
				worktreeSnapshots: [],
				stagingMerges: [],
			}),
			currentWorkday: null,
			runtimeReports: [],
			runtimeWarnings: ['Project runtime is not connected or unavailable.'],
		});
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

	it('creates platform operations and lets the market operations runner claim and complete them', async () => {
		const app = createTestApp({
			config: {
				platformRunnerSecret: 'platform-runner-secret',
			},
		});
		const token = await authorizeApp(app);

		const created = await json(await app.request('/v1/platform/operations', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				namespace: 'repository',
				operation: 'write_content_record',
				idempotencyKey: 'platform-op-one',
				input: { collection: 'notes', slug: 'hello' },
			}),
		}));
		expect(created.ok).toBe(true);
		expect(created.operation).toMatchObject({
			namespace: 'repository',
			operation: 'write_content_record',
			status: 'queued',
			target: 'market_operations_runner',
		});

		const unauthenticatedClaim = await app.request('/v1/platform/runners/jobs/claim', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ runnerId: 'runner-1' }),
		});
		expect(unauthenticatedClaim.status).toBe(401);

		const team = await createTeam(app, token);
		const providerCreated = await json(await app.request(`/v1/teams/${team.id}/capacity-providers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Not A Platform Runner',
				launchMode: 'self_hosted',
			}),
		}));
		const providerClaim = await app.request('/v1/platform/runners/jobs/claim', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${providerCreated.apiKey.plaintext}`,
			},
			body: JSON.stringify({ runnerId: 'provider-1' }),
		});
		expect(providerClaim.status).toBe(401);
		for (const path of [
			`/v1/platform/runners/jobs/${created.operation.id}/renew-lease`,
			`/v1/platform/runners/jobs/${created.operation.id}/checkpoint`,
			`/v1/platform/runners/jobs/${created.operation.id}/complete`,
			`/v1/platform/runners/jobs/${created.operation.id}/fail`,
		]) {
			const providerUpdate = await app.request(path, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${providerCreated.apiKey.plaintext}`,
				},
				body: JSON.stringify({ runnerId: 'provider-1' }),
			});
			expect(providerUpdate.status).toBe(401);
		}

		const registered = await json(await app.request('/v1/platform/runners/register', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer platform-runner-secret',
			},
			body: JSON.stringify({
				runnerId: 'market-ops-test-1',
				environment: 'staging',
				capabilities: ['repository:write_content_record'],
			}),
		}));
		expect(registered.runner).toMatchObject({
			id: 'market-ops-test-1',
			environment: 'staging',
		});

		const claimed = await json(await app.request('/v1/platform/runners/jobs/claim', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer platform-runner-secret',
			},
			body: JSON.stringify({ runnerId: 'market-ops-test-1', limit: 1 }),
		}));
		expect(claimed.operation.id).toBe(created.operation.id);
		expect(claimed.operation.status).toBe('leased');

		const staleCheckpoint = await app.request(`/v1/platform/runners/jobs/${created.operation.id}/checkpoint`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer platform-runner-secret',
			},
			body: JSON.stringify({
				runnerId: 'market-ops-other',
				output: { changedPaths: [] },
			}),
		});
		expect(staleCheckpoint.status).toBe(409);

		const renewed = await json(await app.request(`/v1/platform/runners/jobs/${created.operation.id}/renew-lease`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer platform-runner-secret',
			},
			body: JSON.stringify({
				runnerId: 'market-ops-test-1',
				leaseSeconds: 600,
			}),
		}));
		expect(renewed.operation.leaseExpiresAt).toEqual(expect.any(String));

		const checkpoint = await json(await app.request(`/v1/platform/runners/jobs/${created.operation.id}/checkpoint`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer platform-runner-secret',
			},
			body: JSON.stringify({
				runnerId: 'market-ops-test-1',
				output: { changedPaths: [] },
				event: { kind: 'runner.progress', data: { phase: 'verified' } },
			}),
		}));
		expect(checkpoint.operation.status).toBe('running');

		const completed = await json(await app.request(`/v1/platform/runners/jobs/${created.operation.id}/complete`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer platform-runner-secret',
			},
			body: JSON.stringify({
				runnerId: 'market-ops-test-1',
				output: { changedPaths: ['src/content/notes/hello.mdx'] },
			}),
		}));
		expect(completed.operation.status).toBe('succeeded');

		const events = await json(await app.request(`/v1/platform/operations/${created.operation.id}/events`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(events.events.map((event: Record<string, unknown>) => event.kind)).toEqual([
			'created',
			'claimed',
			'runner.lease_renewed',
			'runner.progress',
			'completed',
		]);
	});

	it('tracks platform repository claims with runner ownership and safe release metadata', async () => {
		const db = new TestD1Database();
		const store = createTestStore(db);
		await store.ensureInitialized();
		await store.upsertMarketOperationRunner({
			runnerId: 'market-ops-runner-01',
			environment: 'staging',
			metadata: { dataDir: '/data' },
		});
		const operation = await store.createPlatformOperation({
			namespace: 'repository',
			operation: 'write_content_record',
			input: {
				repository: {
					provider: 'local',
					owner: 'treeseed',
					name: 'market',
					defaultBranch: 'staging',
					cloneUrl: '/tmp/market',
				},
			},
			requestedByType: 'user',
			requestedById: 'user-1',
		});
		expect(operation).not.toBeNull();
		const claimed = await store.claimPlatformOperation({
			runnerId: 'market-ops-runner-01',
			operationId: operation!.id,
			leaseSeconds: 120,
		});
		expect(claimed).not.toBeNull();
		expect(claimed!.assignedRunnerId).toBe('market-ops-runner-01');
		const claimRows = await store.all(`SELECT * FROM platform_repository_claims`);
		expect(claimRows).toHaveLength(1);
		expect(claimRows[0]).toMatchObject({
			repository_key: 'local-treeseed-market',
			runner_id: 'market-ops-runner-01',
			workspace_path: '/data/repositories/local-treeseed-market/repo',
			branch: 'staging',
			claim_state: 'active',
		});
		const events = await store.listPlatformOperationEvents(operation!.id);
		expect(events.map((event: Record<string, unknown>) => event.kind)).toEqual(['created', 'claimed', 'repository.claimed']);
		await store.renewPlatformOperationLease(operation!.id, {
			runnerId: 'market-ops-runner-01',
			leaseSeconds: 240,
		});
		const renewed = await store.all(`SELECT * FROM platform_repository_claims`);
		expect(renewed[0].lease_expires_at).toEqual(expect.any(String));
		await store.completePlatformOperation(operation!.id, {
			runnerId: 'market-ops-runner-01',
			output: {
				branch: 'treeseed/platform-test',
				commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
			},
		});
		const released = await store.all(`SELECT * FROM platform_repository_claims`);
		expect(released[0]).toMatchObject({
			claim_state: 'released',
			branch: 'treeseed/platform-test',
			commit_sha: 'abcdef1234567890abcdef1234567890abcdef12',
			lease_expires_at: null,
		});
	});

	it('skips approval-waiting operations and preserves cancellation/retry safety', async () => {
		const app = createTestApp({
			config: {
				platformRunnerSecret: 'platform-runner-secret',
			},
		});
		const token = await authorizeApp(app);
		const waiting = await json(await app.request('/v1/platform/operations', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				namespace: 'repository',
				operation: 'write_content_record',
				input: {
					approvalRequired: true,
					approvalId: 'approval-one',
					collection: 'notes',
				},
			}),
		}));
		expect(waiting.operation.status).toBe('waiting_for_approval');
		const skipped = await json(await app.request('/v1/platform/runners/jobs/claim', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer platform-runner-secret',
			},
			body: JSON.stringify({ runnerId: 'market-ops-test-1', operationId: waiting.operation.id }),
		}));
		expect(skipped.operation).toBe(null);

		const created = await json(await app.request('/v1/platform/operations', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				namespace: 'market',
				operation: 'noop',
				input: {},
			}),
		}));
		await json(await app.request('/v1/platform/runners/jobs/claim', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer platform-runner-secret',
			},
			body: JSON.stringify({ runnerId: 'market-ops-test-1', operationId: created.operation.id }),
		}));
		const cancelled = await json(await app.request(`/v1/platform/operations/${created.operation.id}/cancel`, {
			method: 'POST',
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(cancelled.operation.status).toBe('cancelled');
		const completeAfterCancel = await app.request(`/v1/platform/runners/jobs/${created.operation.id}/complete`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer platform-runner-secret',
			},
			body: JSON.stringify({ runnerId: 'market-ops-test-1', output: { late: true } }),
		});
		expect(completeAfterCancel.status).toBe(409);
		const retried = await json(await app.request(`/v1/platform/operations/${created.operation.id}/retry`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ inputPatch: { retry: true } }),
		}));
		expect(retried.operation).toMatchObject({
			status: 'queued',
			assignedRunnerId: null,
			leaseExpiresAt: null,
			input: { retry: true },
		});
	});

	it('lets the market operations runner complete a queued noop operation through API service auth', async () => {
		const app = createTestApp({
			config: {
				platformRunnerSecret: 'platform-runner-secret',
			},
		});
		const token = await authorizeApp(app);
		const created = await json(await app.request('/v1/platform/operations', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				namespace: 'market',
				operation: 'noop',
				input: { source: 'runner-integration-test' },
			}),
		}));
		await withHttpMarketApp(app, async (baseUrl) => {
			const client = new PlatformRunnerClient({
				marketUrl: baseUrl,
				marketId: 'local',
				runnerSecret: 'platform-runner-secret',
			});
			const result = await runOnceWithClient({
				runnerId: 'market-ops-test-1',
				environment: 'local',
				dataDir: resolve(packageRoot, '.treeseed/test-market-ops'),
			}, client, 'test');
			expect(result).toMatchObject({ ok: true, claimed: true });
		});
		const completed = await json(await app.request(`/v1/platform/operations/${created.operation.id}`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(completed.operation).toMatchObject({
			status: 'succeeded',
			terminal: true,
			output: {
				ok: true,
				message: 'Market operations runner diagnostic completed.',
			},
		});
	});

	it('converts local content write routes into repository platform operations', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { project } = await createTeamAndProject(app, token, {
			id: 'platform-content-project',
			slug: 'platform-content-project',
			name: 'Platform Content Project',
		});

		const response = await json(await app.request(`/v1/projects/${project.id}/local-content/notes`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				title: 'Queued note',
				summary: 'This should become a platform operation.',
				idempotencyKey: 'note-queued-one',
			}),
		}));

		expect(response.ok).toBe(true);
		expect(response).not.toHaveProperty('payload');
		expect(response.job).toMatchObject({
			namespace: 'repository',
			operation: 'write_content_record',
			status: 'queued',
			input: {
				projectId: project.id,
				collection: 'notes',
				repository: {
					name: 'platform-content-project',
					cloneUrl: packageRoot,
					writeMode: 'workspace',
				},
			},
		});
	});

	it('runs repository content jobs in the runner workspace instead of the API process', async () => {
		const fixture = createRunnerRepoFixture();
		try {
			const app = createTestApp({
				config: {
					platformRunnerSecret: 'platform-runner-secret',
				},
			});
			const token = await authorizeApp(app);
			const { project } = await createTeamAndProject(app, token, {
				id: 'runner-repository-project',
				slug: 'runner-repository-project',
				name: 'Runner Repository Project',
			});
			const queued = await json(await app.request(`/v1/projects/${project.id}/local-content/notes`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					title: 'Runner executed note',
					summary: 'Written by the market operations runner.',
					repository: {
						provider: 'local',
						owner: 'treeseed',
						name: 'runner-repository-project',
						defaultBranch: 'staging',
						cloneUrl: fixture.repo,
						writeMode: 'workspace',
					},
				}),
			}));
			await withHttpMarketApp(app, async (baseUrl) => {
				const client = new PlatformRunnerClient({
					marketUrl: baseUrl,
					marketId: 'local',
					runnerSecret: 'platform-runner-secret',
				});
				const result = await runOnceWithClient({
					runnerId: 'market-ops-test-1',
					environment: 'local',
					dataDir: fixture.workspace,
				}, client, 'test', { operationId: queued.job.id });
				expect(result).toMatchObject({ ok: true, claimed: true });
			});
			const completed = await json(await app.request(`/v1/platform/operations/${queued.job.id}`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			expect(completed.operation).toMatchObject({
				status: 'succeeded',
				href: '/app/work/notes/runner-executed-note',
				changedPaths: ['src/content/notes/runner-executed-note.mdx'],
				branch: 'staging',
				commitSha: null,
				output: {
					href: '/app/work/notes/runner-executed-note',
					changedPaths: ['src/content/notes/runner-executed-note.mdx'],
					baseBranch: 'staging',
					branch: 'staging',
					commitSha: null,
					verification: null,
					pullRequest: null,
					workflowRun: null,
					workspacePath: '<runner-workspace>',
				},
			});
			expect(JSON.stringify(completed.operation.output)).not.toContain(fixture.workspace);
			expect(existsSync(resolve(fixture.repo, 'src/content/notes/runner-executed-note.mdx'))).toBe(false);
		} finally {
			rmSync(fixture.root, { recursive: true, force: true });
		}
	});

	it('runs branch-mode repository jobs with verification and fails before commit when verification fails', async () => {
		const fixture = createRunnerRepoFixture();
		try {
			const app = createTestApp({
				config: {
					platformRunnerSecret: 'platform-runner-secret',
				},
			});
			const token = await authorizeApp(app);
			const branchJob = await json(await app.request('/v1/platform/operations', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					namespace: 'repository',
					operation: 'write_content_record',
					input: {
						projectId: 'runner-branch-project',
						collection: 'notes',
						payload: { title: 'Branch verified note' },
						repository: {
							provider: 'local',
							owner: 'treeseed',
							name: 'runner-branch-project',
							defaultBranch: 'staging',
							cloneUrl: fixture.repo,
							writeMode: 'branch',
							branchName: 'treeseed/branch-verified',
							verificationCommands: [{ command: process.execPath, args: ['-e', 'process.exit(0)'] }],
						},
					},
				}),
			}));
			await withHttpMarketApp(app, async (baseUrl) => {
				const client = new PlatformRunnerClient({
					marketUrl: baseUrl,
					marketId: 'local',
					runnerSecret: 'platform-runner-secret',
				});
				const result = await runOnceWithClient({
					runnerId: 'market-ops-runner-01',
					environment: 'staging',
					dataDir: fixture.workspace,
				}, client, 'test', { operationId: branchJob.operation.id });
				expect(result).toMatchObject({ ok: true, claimed: true });
			});
			const completed = await json(await app.request(`/v1/platform/operations/${branchJob.operation.id}`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			expect(completed.operation).toMatchObject({
				status: 'succeeded',
				branch: 'treeseed/branch-verified',
				output: {
					branch: 'treeseed/branch-verified',
					operationBranch: 'treeseed/branch-verified',
					verification: { status: 'passed' },
					pullRequest: null,
					workflowRun: null,
				},
			});
			expect(completed.operation.commitSha).toMatch(/^[a-f0-9]{40}$/u);
			expect(git(fixture.repo, ['branch', '--list', 'treeseed/branch-verified'])).toBe('');

			const failingJob = await json(await app.request('/v1/platform/operations', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					namespace: 'repository',
					operation: 'write_content_record',
					input: {
						projectId: 'runner-branch-project',
						collection: 'notes',
						payload: { title: 'Verification failing note' },
						repository: {
							provider: 'local',
							owner: 'treeseed',
							name: 'runner-failing-project',
							defaultBranch: 'staging',
							cloneUrl: fixture.repo,
							writeMode: 'branch',
							branchName: 'treeseed/failing-branch',
							verificationCommands: [{ command: process.execPath, args: ['-e', 'process.exit(9)'] }],
						},
					},
				}),
			}));
			await withHttpMarketApp(app, async (baseUrl) => {
				const client = new PlatformRunnerClient({
					marketUrl: baseUrl,
					marketId: 'local',
					runnerSecret: 'platform-runner-secret',
				});
				const result = await runOnceWithClient({
					runnerId: 'market-ops-runner-02',
					environment: 'staging',
					dataDir: resolve(fixture.root, 'workspace-2'),
				}, client, 'test', { operationId: failingJob.operation.id });
				expect(result).toMatchObject({ ok: false, claimed: true });
			});
			const failed = await json(await app.request(`/v1/platform/operations/${failingJob.operation.id}`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			expect(failed.operation).toMatchObject({
				status: 'failed',
				error: { message: expect.stringContaining('Repository verification failed') },
			});
			const events = await json(await app.request(`/v1/platform/operations/${failingJob.operation.id}/events`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			expect(events.events.map((event: Record<string, unknown>) => event.kind)).toContain('repository.verification_failed');
			expect(git(fixture.repo, ['branch', '--list', 'treeseed/failing-branch'])).toBe('');
		} finally {
			rmSync(fixture.root, { recursive: true, force: true });
		}
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
				sourceRepoWorkflowPath: '.github/workflows/deploy-web.yml',
			}),
		}));
		expect(hosting.payload).toMatchObject({
			projectId: project.id,
			kind: 'hosted_project',
			registration: 'optional',
		});
		const invalidHosting = await json(await app.request(`/v1/projects/${project.id}/hosting`, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				kind: 'mystery_host',
			}),
		}));
		expect(invalidHosting.ok).toBe(false);
		expect(invalidHosting.error).toBe('Invalid hosting kind.');
		const advancedConnection = await json(await app.request(`/v1/projects/${project.id}/connection`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				mode: 'hybrid',
				executionOwner: 'project_runner',
				projectApiBaseUrl: '',
			}),
		}));
		expect(advancedConnection.payload.connection).toMatchObject({
			projectId: project.id,
			mode: 'hybrid',
			projectApiBaseUrl: null,
			executionOwner: 'project_runner',
		});
		const invalidConnection = await json(await app.request(`/v1/projects/${project.id}/connection`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				mode: 'chaos',
			}),
		}));
		expect(invalidConnection.ok).toBe(false);
		expect(invalidConnection.error).toBe('Invalid connection mode.');

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
					generatedAt: '2026-04-15T17:01:00.000Z',
					docsAutomation: {
						researchNoteCount: 1,
						knowledgeDraftCount: 1,
						optimizationReportCount: 1,
						docsMutationCount: 1,
						pendingApprovalCount: 0,
						verificationFailureCount: 0,
					},
					contentSnapshot: {
						relativePath: 'src/content/workdays/2026-04-15-workday-1.mdx',
						slug: 'workdays/2026-04-15/workday-1/report',
						reportVersion: '20260415T170100Z-test',
						title: 'TreeSeed Documentation Automation Workday - 2026-04-15',
						status: 'completed',
					},
				},
				metadata: {
					reportId: 'report:workday-1',
				},
			}),
		}));
		expect(workday.payload).toMatchObject({
			projectId: project.id,
			environment: 'staging',
			workDayId: 'workday-1',
			kind: 'workday_summary',
			state: 'completed',
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
				summary: expect.objectContaining({
					docsAutomation: expect.objectContaining({ docsMutationCount: 1 }),
					contentSnapshot: expect.objectContaining({ relativePath: 'src/content/workdays/2026-04-15-workday-1.mdx' }),
				}),
			}),
		]));

		const projectSummary = await json(await app.request(`/v1/projects/${project.id}/summary`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(projectSummary.payload).toMatchObject({
			docsAutomation: {
				latestWorkdayReport: expect.objectContaining({
					workDayId: 'workday-1',
					reportId: 'report:workday-1',
					generatedArtifactCount: 4,
					pendingApprovalCount: 0,
					verificationFailureCount: 0,
				}),
			},
		});

		const inbox = await json(await app.request(`/v1/teams/${team.id}/inbox`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(inbox.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({
				kind: 'workday_summary',
				state: 'completed',
				href: expect.stringContaining('/app/projects/'),
				metadata: expect.objectContaining({
					workDayId: 'workday-1',
					reportId: 'report:workday-1',
					generatedArtifactCount: 4,
				}),
			}),
		]));
	});

	it('allows project runners to drive hosted workday task lifecycle and manager leases', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { team, project } = await createTeamAndProject(app, token, {
			id: 'hosted-runtime-project',
			slug: 'hosted-runtime-project',
			name: 'Hosted Runtime Project',
		});
		const provider = await json(await app.request(`/v1/teams/${team.id}/capacity-providers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Hosted Runtime Capacity',
				launchMode: 'self_hosted',
			}),
		}));
		const capacityProvider = provider.provider;
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

		const unauthenticated = await app.request(`/v1/projects/${project.id}/runner/tasks`);
		expect(unauthenticated.status).toBe(401);

		const workday = await json(await app.request(`/v1/projects/${project.id}/runner/workdays/start`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				id: 'hosted-workday-1',
				capacityBudget: 25,
				summary: { runtimeMode: 'hosted' },
			}),
		}));
		expect(workday.payload).toMatchObject({
			id: 'hosted-workday-1',
			projectId: project.id,
			state: 'active',
		});

		const lease = await json(await app.request(`/v1/projects/${project.id}/runner/manager-leases/claim`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				environment: 'staging',
				workDayId: 'hosted-workday-1',
				managerId: 'manager-hosted',
				ttlSeconds: 60,
				now: '2026-05-14T12:00:00.000Z',
				metadata: { runtimeMode: 'hosted' },
			}),
		}));
		expect(lease.payload).toMatchObject({
			managerId: 'manager-hosted',
			state: 'active',
		});

		const task = await json(await app.request(`/v1/projects/${project.id}/runner/tasks`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				workDayId: 'hosted-workday-1',
				agentId: 'system',
				type: 'refresh_project_graph',
				idempotencyKey: 'hosted-workday-1:refresh_project_graph',
				payload: { projectId: project.id },
				actor: 'manager',
			}),
		}));
		expect(task.payload).toMatchObject({
			workDayId: 'hosted-workday-1',
			type: 'refresh_project_graph',
			state: 'pending',
		});

		const claimed = await json(await app.request(`/v1/projects/${project.id}/runner/tasks/${task.payload.id}/claim`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				workerId: 'worker-hosted',
				leaseSeconds: 300,
				actor: 'worker',
			}),
		}));
		expect(claimed.payload).toMatchObject({
			state: 'claimed',
			claimedBy: 'worker-hosted',
		});

		await json(await app.request(`/v1/projects/${project.id}/runner/tasks/${task.payload.id}/events`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				kind: 'worker_started',
				data: { workerId: 'worker-hosted' },
				actor: 'worker',
			}),
		}));
		const artifactBody = {
			artifactKind: 'codebase_inventory',
			codebaseInventory: {
				kind: 'codebase_inventory',
				generatedAt: '2026-05-14T12:00:00.000Z',
				packages: [],
				modules: [],
				knowledgeGaps: [],
			},
			generatedArtifacts: [{
				artifactKind: 'codebase_inventory',
				id: 'inventory-1',
				title: 'Hosted inventory',
				taskId: task.payload.id,
				sourceRefs: ['packages/agent/src/index.ts'],
			}],
			summary: {
				status: 'completed',
				summary: 'Hosted inventory completed.',
			},
		};
		const artifactUpload = await json(await app.request(`/v1/projects/${project.id}/runner/artifacts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				objectKey: 'agent-artifacts/hosted-workday-1/inventory.json',
				content: JSON.stringify(artifactBody),
				contentType: 'application/json',
			}),
		}));
		expect(artifactUpload.payload).toMatchObject({
			artifactStorage: 'r2',
			outputRef: 'r2:agent-artifacts/hosted-workday-1/inventory.json',
		});
		const completed = await json(await app.request(`/v1/projects/${project.id}/runner/tasks/${task.payload.id}/complete`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				output: {
					artifactKind: 'codebase_inventory',
					artifactStorage: 'r2',
					outputRef: artifactUpload.payload.outputRef,
					objectKey: artifactUpload.payload.objectKey,
					sizeBytes: artifactUpload.payload.sizeBytes,
					sha256: artifactUpload.payload.sha256,
				},
				outputRef: artifactUpload.payload.outputRef,
				summary: { status: 'done' },
				actor: 'worker',
			}),
		}));
		expect(completed.payload).toMatchObject({ state: 'completed' });

		const outputs = await json(await app.request(`/v1/projects/${project.id}/runner/tasks/${task.payload.id}/outputs`, {
			headers: { authorization: `Bearer ${runnerToken}` },
		}));
		expect(outputs.payload).toEqual([
			expect.objectContaining({
				taskId: task.payload.id,
				outputRef: 'r2:agent-artifacts/hosted-workday-1/inventory.json',
				outputJson: expect.stringContaining('Hosted inventory completed'),
			}),
		]);

		const publicWorkdays = await json(await app.request(`/v1/projects/${project.id}/workdays`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(Array.isArray(publicWorkdays.payload)).toBe(true);

		const publicWorkdayDetail = await json(await app.request(`/v1/projects/${project.id}/workdays/hosted-workday-1`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(publicWorkdayDetail.payload).toMatchObject({ id: 'hosted-workday-1' });

		const publicTasks = await json(await app.request(`/v1/projects/${project.id}/tasks`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(publicTasks.payload).toEqual([expect.objectContaining({ id: task.payload.id })]);

		const publicTask = await json(await app.request(`/v1/projects/${project.id}/tasks/${task.payload.id}`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(publicTask.payload).toMatchObject({ id: task.payload.id });

		const publicTaskEvents = await json(await app.request(`/v1/projects/${project.id}/tasks/${task.payload.id}/events`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(publicTaskEvents.payload).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'worker_started' })]));

		const publicArtifacts = await json(await app.request(`/v1/projects/${project.id}/agent-artifacts`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(publicArtifacts.payload.items).toEqual([expect.objectContaining({ id: 'inventory-1', artifactKind: 'codebase_inventory' })]);

		const publicArtifactDetail = await json(await app.request(`/v1/projects/${project.id}/agent-artifacts/inventory-1`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(publicArtifactDetail.payload.artifact).toMatchObject({ id: 'inventory-1' });

		const publicArtifactDiff = await json(await app.request(`/v1/projects/${project.id}/agent-artifacts/inventory-1/diff`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(publicArtifactDiff.payload).toMatchObject({ artifactId: 'inventory-1', changedPaths: [] });

		const approval = await json(await app.request(`/v1/projects/${project.id}/runner/approval-requests`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				id: 'hosted-approval-1',
				workDayId: 'hosted-workday-1',
				taskId: task.payload.id,
				kind: 'promote_knowledge_draft',
				title: 'Promote hosted docs',
				summary: 'Hosted docs promotion needs approval.',
				metadata: { runtimeMode: 'hosted' },
			}),
		}));
		expect(approval.payload).toMatchObject({
			id: 'hosted-approval-1',
			projectId: project.id,
			teamId: team.id,
			state: 'pending',
		});

		const usage = await json(await app.request(`/v1/projects/${project.id}/runner/capacity/usage`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${runnerToken}`,
			},
			body: JSON.stringify({
				capacityProviderId: capacityProvider.id,
				workDayId: 'hosted-workday-1',
				taskId: task.payload.id,
				phase: 'consume',
				credits: 2,
				source: 'hosted_agent_runtime',
			}),
		}));
		expect(usage.payload.entry).toMatchObject({
			capacityProviderId: capacityProvider.id,
			projectId: project.id,
			credits: 2,
		});

		const listed = await json(await app.request(`/v1/projects/${project.id}/runner/tasks?workDayId=hosted-workday-1`, {
			headers: { authorization: `Bearer ${runnerToken}` },
		}));
		expect(listed.payload).toEqual([
			expect.objectContaining({
				id: task.payload.id,
				state: 'completed',
			}),
		]);
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
				siteUrl: 'https://app.market.example.com',
			},
		});
		const started = await json(await app.request('/v1/auth/device/start', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ clientName: 'treeseed-cli', scopes: ['auth:me', 'market'] }),
		}));
		expect(started.verificationUri).toBe('https://app.market.example.com/auth/device/approve');
		expect(started.verificationUriComplete).toBe(`https://app.market.example.com/auth/device/approve?user_code=${encodeURIComponent(started.userCode)}`);
		await app.request('/v1/auth/device/approve', {
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

	it('serves Market UI projections from backend v1 routes', async () => {
		const db = new TestD1Database();
		const store = createTestStore(db);
		const app = createTestApp({ db, store });
		const token = await authorizeApp(app, { principalId: 'ui-projection-user', displayName: 'UI Projection User' });
		const headers = { authorization: `Bearer ${token}` };
		const { team, project } = await createTeamAndProject(app, token, {
			id: 'ui-projection-project',
			slug: 'ui-projection-project',
			name: 'UI Projection Project',
		});
		const approval = await store.createApprovalRequest({
			id: 'ui-approval-1',
			teamId: team.id,
			projectId: project.id,
			workDayId: 'ui-workday-1',
			kind: 'publish_report',
			severity: 'high',
			requestedByType: 'platform',
			requestedById: 'market-operations-runner',
			title: 'Publish projection report',
			summary: 'Review the generated projection report.',
			options: [{ id: 'approve', label: 'Approve', state: 'approved' }],
		});
		await store.createProjectWorkdaySummary(project.id, {
			id: 'ui-workday-summary-1',
			environment: 'staging',
			workDayId: 'ui-workday-1',
			state: 'active',
			summary: { objective: 'Verify backend UI projections' },
		});

		const governance = await json(await app.request('/v1/ui/governance', { headers }));
		expect(governance).toMatchObject({
			ok: true,
			payload: {
				pendingApprovals: expect.arrayContaining([
					expect.objectContaining({ approvalId: approval.id, href: `/app/work/decisions/${approval.id}` }),
				]),
			},
		});

		const approvalDetail = await json(await app.request(`/v1/ui/governance/${approval.id}`, { headers }));
		expect(approvalDetail).toMatchObject({
			ok: true,
			payload: {
				approval: expect.objectContaining({ approvalId: approval.id, title: 'Publish projection report' }),
				decisionOptions: expect.arrayContaining([expect.objectContaining({ id: 'approve' })]),
			},
		});

		const decided = await json(await app.request(`/v1/ui/governance/${approval.id}/decision`, {
			method: 'POST',
			headers: { ...headers, 'content-type': 'application/json' },
			body: JSON.stringify({ optionId: 'approve', note: 'Looks ready.' }),
		}));
		expect(decided).toMatchObject({
			ok: true,
			payload: expect.objectContaining({ id: approval.id, state: 'approved' }),
		});

		const infrastructure = await json(await app.request('/v1/ui/infrastructure', { headers }));
		expect(infrastructure).toMatchObject({ ok: true, payload: expect.any(Object) });

		const knowledge = await json(await app.request('/v1/ui/knowledge', { headers }));
		expect(knowledge).toMatchObject({ ok: true, payload: expect.objectContaining({ artifacts: expect.any(Array) }) });

		const workday = await json(await app.request('/v1/ui/workdays/ui-workday-1', { headers }));
		expect(workday).toMatchObject({
			ok: true,
			payload: {
				workday: expect.objectContaining({
					id: 'ui-workday-1',
					objective: 'Verify backend UI projections',
				}),
			},
		});

		const missingArtifact = await app.request('/v1/ui/knowledge/missing-artifact', { headers });
		expect(missingArtifact.status).toBe(404);
		expect(await json(missingArtifact)).toMatchObject({ ok: false, error: 'Unknown knowledge artifact.' });

		const anonymous = await app.request('/v1/ui/governance');
		expect(anonymous.status).toBe(401);
		expect(await json(anonymous)).toMatchObject({ ok: false });
	});

	it('uses the configured production web approval URL for the central API', async () => {
		const app = createTestApp({
			config: {
				baseUrl: 'https://api.treeseed.ai',
				siteUrl: 'https://treeseed.ai',
			},
		});
		const started = await json(await app.request('/v1/auth/device/start', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ clientName: 'treeseed-cli', scopes: ['auth:me', 'market'] }),
		}));

		expect(started.verificationUri).toBe('https://treeseed.ai/auth/device/approve');
		expect(started.verificationUriComplete).toBe(`https://treeseed.ai/auth/device/approve?user_code=${encodeURIComponent(started.userCode)}`);
	});

	it('redirects legacy v1 browser approval links to the web approval page', async () => {
		const app = createTestApp({
			config: {
				baseUrl: 'https://api.treeseed.ai',
				siteUrl: 'https://treeseed.ai',
			},
		});

		const response = await app.request('/v1/auth/device/approve?user_code=ABCD-EFGH');

		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe('https://treeseed.ai/auth/device/approve?user_code=ABCD-EFGH');
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
		const launchSpy = vi.spyOn(treeseedCore, 'executeKnowledgeHubProviderLaunch').mockResolvedValue({
			workingRoot: '/tmp/hub-provider-launch-success',
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
				outputRoot: '/tmp/hub-provider-launch-success/template',
				payloadRoot: '/tmp/hub-provider-launch-success/template/payload',
				manifestPath: '/tmp/hub-provider-launch-success/template/manifest.json',
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
					sourceProjectRoot: '/tmp/hub-provider-launch-success',
					payloadRoot: 'payload',
					files: ['package.json'],
					compatibility: { minCliVersion: '0.1.0', minCoreVersion: '0.1.0', minSdkVersion: '0.1.0' },
					sourceSelection: { includedPaths: ['package.json'] },
					market: { publisherId: 'team-one', publisherName: 'Team One', publishMetadata: {} },
				},
			},
			knowledgePackPackage: {
				outputRoot: '/tmp/hub-provider-launch-success/knowledge-pack',
				payloadRoot: '/tmp/hub-provider-launch-success/knowledge-pack/payload',
				manifestPath: '/tmp/hub-provider-launch-success/knowledge-pack/manifest.json',
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
					sourceProjectRoot: '/tmp/hub-provider-launch-success',
					payloadRoot: 'payload',
					files: ['src/content/objectives/launch.mdx'],
					compatibility: { minCliVersion: '0.1.0', minCoreVersion: '0.1.0', minSdkVersion: '0.1.0' },
					sourceSelection: { includedPaths: ['src/content/objectives'] },
					market: { publisherId: 'team-one', publisherName: 'Team One', publishMetadata: {} },
				},
			},
		} as unknown as Awaited<ReturnType<typeof treeseedCore.executeKnowledgeHubProviderLaunch>>);

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

		expect(launched.status).toBe(202);
		const payload = await json(launched);
		expect(payload.ok).toBe(true);
		expect(payload.payload.project.project.slug).toBe('launch-project');
		expect(payload.payload.project.latestLaunch.state).toBe('queued');
		expect(payload.payload.launchJob.status).toBe('pending');
		expect(launchSpy).not.toHaveBeenCalled();

		const details = await json(await app.request(`/v1/projects/${payload.payload.project.project.id}`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(details.payload.repositories).toEqual(expect.arrayContaining([
			expect.objectContaining({ role: 'software', name: 'launch-project-site', status: 'queued' }),
			expect.objectContaining({ role: 'content', name: 'launch-project-content', status: 'queued' }),
		]));
		expect(details.payload.contentSource.productionSource).toBe('r2_published_artifacts');
		expect(details.payload.latestLaunch.state).toBe('queued');

		const inbox = await json(await app.request(`/v1/teams/${team.id}/inbox`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(inbox.payload.some((entry: { kind: string }) => entry.kind === 'launch_failure')).toBe(false);
	}, 15000);

	it('exchanges GitHub OIDC for managed operation jobs without exposing provider secrets', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const team = await createTeam(app, token);

		const launched = await json(await app.request(`/v1/teams/${team.id}/projects/launch`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				slug: 'ci-managed-project',
				name: 'CI Managed Project',
				sourceKind: 'blank',
				hostingMode: 'managed',
			}),
		}));
		const projectId = launched.payload.project.project.id as string;
		const details = await json(await app.request(`/v1/projects/${projectId}`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		const softwareRepository = details.payload.repositories.find((repository: { role: string }) => repository.role === 'software');
		const repository = `${softwareRepository.owner}/${softwareRepository.name}`.toLowerCase();
		const now = Math.floor(Date.now() / 1000);
		const oidcToken = unsignedTestJwt({
			iss: 'https://token.actions.githubusercontent.com',
			aud: `treeseed:${projectId}`,
			exp: now + 300,
			nbf: now - 10,
			repository,
			ref: 'refs/heads/staging',
			ref_name: 'staging',
			sha: '1234567890abcdef1234567890abcdef12345678',
			workflow: 'Treeseed Web Deploy',
			workflow_ref: `${repository}/.github/workflows/deploy-web.yml@refs/heads/staging`,
			run_id: '1001',
			run_attempt: '1',
			actor: 'octocat',
			event_name: 'push',
		});

		const exchanged = await app.request(`/v1/projects/${projectId}/ci/oidc/exchange`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				oidcToken,
				actionKind: 'deploy_web',
				environment: 'staging',
				sha: '1234567890abcdef1234567890abcdef12345678',
			}),
		});
		expect(exchanged.status).toBe(202);
		const payload = await json(exchanged);
		expect(payload.payload.job).toMatchObject({
			projectId,
			namespace: 'workflow',
			operation: 'deploy_runtime',
			requestedByType: 'ci_oidc',
			requestedById: repository,
		});
		expect(payload.payload.operationToken).toContain('.');
		expect(JSON.stringify(payload)).not.toContain('CLOUDFLARE_API_TOKEN');
		expect(JSON.stringify(payload)).not.toContain('RAILWAY_API_TOKEN');
		expect(JSON.stringify(payload)).not.toContain('TREESEED_SMTP_PASSWORD');

		const status = await app.request(`/v1/projects/${projectId}/ci/jobs/${payload.payload.job.id}`, {
			headers: {
				authorization: `Bearer ${payload.payload.operationToken}`,
			},
		});
		expect(status.status).toBe(200);
		const statusPayload = await json(status);
		expect(statusPayload.payload.job.id).toBe(payload.payload.job.id);
		expect(statusPayload.payload.job.input.managedHostExecution).toMatchObject({
			mode: 'treeseed_managed',
			credentialExposure: 'none',
		});

		const mismatchedToken = unsignedTestJwt({
			iss: 'https://token.actions.githubusercontent.com',
			aud: `treeseed:${projectId}`,
			exp: now + 300,
			repository: 'other-owner/other-repo',
			ref: 'refs/heads/staging',
			workflow_ref: 'other-owner/other-repo/.github/workflows/deploy-web.yml@refs/heads/staging',
		});
		const rejected = await app.request(`/v1/projects/${projectId}/ci/oidc/exchange`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				oidcToken: mismatchedToken,
				actionKind: 'deploy_web',
				environment: 'staging',
			}),
		});
		expect(rejected.status).toBe(403);
	});

	it('queues launch failures for worker recovery instead of failing the request', async () => {
		const error = Object.assign(new Error('GitHub denied repository creation.'), {
			phase: 'repo_provision_failed',
			phases: [
				{ phase: 'repo_provision', status: 'failed', detail: 'GitHub denied repository creation.', timestamp: '2026-04-16T00:00:00.000Z' },
			],
		});
		vi.spyOn(treeseedCore, 'executeKnowledgeHubProviderLaunch').mockRejectedValue(error);

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

		expect(launched.status).toBe(202);
		const payload = await json(launched);
		expect(payload.ok).toBe(true);
		expect(payload.payload.launchJob.status).toBe('pending');
		expect(payload.payload.project.project.metadata.launchPhase).toBe('queued');

		const inbox = await json(await app.request(`/v1/teams/${team.id}/inbox`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(inbox.payload.some((entry: { kind: string; title: string }) => entry.kind === 'launch_failure' && entry.title.includes('Failed Launch'))).toBe(false);
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
				launchMode: 'self_hosted',
			}),
		});
		expect(providerResponse.status).toBe(201);
		const provider = (await json(providerResponse)).provider;

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
		expect(plan.payload.providers[0]).toMatchObject({ id: provider.id, provider: '@treeseed/agent' });
		expect(plan.payload.lanes[0]).toMatchObject({ id: lane.id, businessModel: 'token_metered' });
		expect(plan.payload.providers[0].metadata.pressure).toMatchObject({
			activeReservations: 0,
			congestionRatio: 0,
			activeAttentionLoad: 0,
			activeContextTokens: 0,
			cooperative: expect.objectContaining({
				spilloverEligible: false,
			}),
		});
		expect(plan.payload.lanes[0].metadata.pressure).toMatchObject({
			activeReservations: 0,
			congestionRatio: 0,
			activeAttentionLoad: 0,
			activeContextTokens: 0,
			cooperative: expect.any(Object),
		});
		expect(plan.payload.remaining.dailyCredits).toBe(120);
	});

		it('rejects removed host-backed capacity provider launches and omits runtime host collections', async () => {
			const app = createTestApp();
			const token = await authorizeApp(app);
			const { team, project } = await createTeamAndProject(app, token, {
				slug: 'host-backed-capacity-project',
				name: 'Host-backed Capacity Project',
			});

			const rejected = await app.request(`/v1/teams/${team.id}/capacity/providers/host-backed`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					name: 'Rejected Capacity',
					processingHostId: 'removed-runtime-host',
				}),
			});
			expect(rejected.status).toBe(404);

			const capacity = await json(await app.request(`/v1/teams/${team.id}/capacity`, {
				headers: { authorization: `Bearer ${token}` },
			}));
			expect(capacity.payload).not.toHaveProperty('processingHosts');
			expect(capacity.payload).not.toHaveProperty('activeProcessingHosts');
			expect(capacity.payload.projects.map((entry: { id: string }) => entry.id)).toContain(project.id);
		});

	it('creates, rotates, and scopes capacity provider API keys without exposing hashes', async () => {
		const db = new TestD1Database();
		const store = createTestStore(db);
		const app = createTestApp({ db, store });
		const token = await authorizeApp(app);
		const { team } = await createTeamAndProject(app, token, {
			slug: 'capacity-keys-project',
			name: 'Capacity Keys Project',
		});

		const providerResponse = await app.request(`/v1/teams/${team.id}/capacity-providers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Local Runner',
				launchMode: 'self_hosted',
			}),
		});
		expect(providerResponse.status).toBe(201);
		const createdProvider = await json(providerResponse);
		const provider = createdProvider.provider;
		const firstKey = createdProvider.apiKey.plaintext;
		expect(firstKey).toMatch(/^tsp_/);
		expect(createdProvider.apiKey.prefix).toBe(firstKey.slice(0, 16));
		expect(JSON.stringify(createdProvider.apiKey)).not.toContain('keyHash');
		expect(JSON.stringify(createdProvider.selfHosting.redactedEnv)).not.toContain(firstKey);
		expect(JSON.stringify(createdProvider.selfHosting.commands)).not.toContain(firstKey);

		const selfHostingResponse = await app.request(`/v1/teams/${team.id}/capacity-providers/${provider.id}/self-hosting`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		});
		expect(selfHostingResponse.status).toBe(200);
		const selfHosting = await json(selfHostingResponse);
		expect(selfHosting.selfHosting.env.TREESEED_CAPACITY_PROVIDER_API_KEY).toMatch(/REDACTED|rotate-to-reveal/i);
		expect(JSON.stringify(selfHosting.selfHosting)).not.toContain(firstKey);
		expect(JSON.stringify(selfHosting.selfHosting)).not.toContain('env_file');

		const rejectedCreate = await app.request(`/v1/teams/${team.id}/capacity-providers/${provider.id}/api-keys`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(rejectedCreate.status).toBe(410);

		const listed = await json(await app.request(`/v1/teams/${team.id}/capacity-providers/${provider.id}/api-keys`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
		}));
		expect(listed.payload).toHaveLength(1);
		expect(listed.payload[0]).toMatchObject({
			status: 'active',
			keyPrefix: createdProvider.apiKey.prefix,
		});
		expect(listed.payload[0]).not.toHaveProperty('plaintextKey');
		expect(listed.payload[0]).not.toHaveProperty('keyHash');

		const insufficient = await app.request('/v1/provider/reports', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${firstKey}`,
			},
			body: JSON.stringify({ workDayId: 'missing', kind: 'test', body: {} }),
		});
		expect(insufficient.status).toBe(404);

		const rotateResponse = await app.request(`/v1/teams/${team.id}/capacity-providers/${provider.id}/keys/rotate`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(rotateResponse.status).toBe(200);
		const rotated = await json(rotateResponse);
		expect(rotated.apiKey.plaintext).toMatch(/^tsp_/);
		expect(rotated.apiKey.plaintext).not.toBe(firstKey);
		expect(rotated.requiresRestart).toBe(true);

		const oldHeartbeat = await app.request('/v1/provider/heartbeat', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${firstKey}`,
			},
			body: JSON.stringify({ marketId: 'local' }),
		});
		expect(oldHeartbeat.status).toBe(401);

		const newHeartbeat = await app.request('/v1/provider/heartbeat', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${rotated.apiKey.plaintext}`,
			},
			body: JSON.stringify({ marketId: 'local' }),
		});
		expect(newHeartbeat.status).toBe(200);
	});

	it('handles capacity provider deployment intents without exposing provider secrets', async () => {
		const db = new TestD1Database();
		const store = createTestStore(db);
		const app = createTestApp({ db, store });
		const token = await authorizeApp(app);
		const { team } = await createTeamAndProject(app, token, {
			slug: 'capacity-deploy-project',
			name: 'Capacity Deploy Project',
		});

		const selfHosted = await json(await app.request(`/v1/teams/${team.id}/capacity-providers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Self-host Runner',
				launchMode: 'self_hosted',
			}),
		}));
		const selfHostIntent = await app.request(`/v1/teams/${team.id}/capacity-providers/${selfHosted.provider.id}/deployments`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ launchMode: 'self_hosted' }),
		});
		expect(selfHostIntent.status).toBe(200);
		const selfHostPayload = await json(selfHostIntent);
		expect(selfHostPayload.deployment).toBeNull();
		expect(selfHostPayload.selfHosting.commands.join('\n')).toContain('capacity-provider:build');
		expect(await store.listCapacityProviderDeployments(team.id, selfHosted.provider.id)).toHaveLength(0);
		expect(JSON.stringify(selfHostPayload)).not.toContain(selfHosted.apiKey.plaintext);

		const managed = await json(await app.request(`/v1/teams/${team.id}/capacity-providers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Managed Runner',
				launchMode: 'managed_market_host',
			}),
		}));
		const managedDeploy = await app.request(`/v1/teams/${team.id}/capacity-providers/${managed.provider.id}/deployments`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ launchMode: 'managed_market_host' }),
		});
		expect(managedDeploy.status).toBe(201);
		const managedPayload = await json(managedDeploy);
		expect(managedPayload.deployment.status).toBe('deployed');
		expect(Object.keys(managedPayload.deployment.serviceRefs)).toEqual(['api', 'manager', 'runner']);
		expect(managedPayload.deployment.envRefs.TREESEED_CAPACITY_PROVIDER_API_KEY).toBe('<host-secret>');
		expect(JSON.stringify(managedPayload)).not.toContain(managed.apiKey.plaintext);

		const rejectedPlaintext = await app.request(`/v1/teams/${team.id}/capacity-providers/${managed.provider.id}/deployments`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				launchMode: 'managed_market_host',
				RAILWAY_API_TOKEN: 'plain-railway-token',
			}),
		});
		expect(rejectedPlaintext.status).toBe(400);
	});

	it('deploys connected Railway capacity providers with one-use credential sessions', async () => {
		const db = new TestD1Database();
		const store = createTestStore(db);
		const app = createTestApp({ db, store });
		const token = await authorizeApp(app);
		const { team } = await createTeamAndProject(app, token, {
			slug: 'connected-capacity-deploy-project',
			name: 'Connected Capacity Deploy Project',
		});
		const passphrase = 'provider-host-passphrase';

		const host = await json(await app.request(`/v1/teams/${team.id}/hosts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Capacity Provider Railway',
				provider: 'railway',
				ownership: 'team_owned',
				accountLabel: 'Provider Workspace',
				encryptedPayload: encryptedTestHostEnvelope({
					RAILWAY_API_TOKEN: 'railway-secret-token',
					TREESEED_RAILWAY_WORKSPACE: 'provider-workspace',
				}, passphrase),
				metadata: {
					hostType: 'capacity_provider',
				},
			}),
		}));
		const session = await json(await app.request(`/v1/teams/${team.id}/provider-credential-sessions`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				hostKind: 'capacity_provider_host',
				hostId: host.payload.id,
				passphrase,
				purpose: 'deploy_capacity_provider',
				expiresInSeconds: 600,
			}),
		}));
		expect(session.payload.id).toBeTruthy();

		const provider = await json(await app.request(`/v1/teams/${team.id}/capacity-providers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Connected Runner',
				launchMode: 'connected_host',
			}),
		}));
		const missingSession = await app.request(`/v1/teams/${team.id}/capacity-providers/${provider.provider.id}/deployments`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ launchMode: 'connected_host' }),
		});
		expect(missingSession.status).toBe(400);

		const deployed = await app.request(`/v1/teams/${team.id}/capacity-providers/${provider.provider.id}/deployments`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				launchMode: 'connected_host',
				hostId: host.payload.id,
				credentialSessions: {
					capacityProviderHost: session.payload.id,
				},
			}),
		});
		expect(deployed.status).toBe(201);
		const payload = await json(deployed);
		expect(payload.deployment.status).toBe('deployed');
			expect(payload.deployment.serviceRefs.api.serviceId).toContain('railway:provider-workspace');
			expect(JSON.stringify(payload)).not.toContain('railway-secret-token');
			expect(JSON.stringify(payload)).not.toContain(provider.apiKey.plaintext);
			const consumed = await store.getProviderCredentialSession(team.id, session.payload.id);
			if (!consumed) {
				throw new Error('Expected capacity provider host credential session to be consumed.');
			}
			expect(consumed.status).toBe('consumed');

		const reused = await app.request(`/v1/teams/${team.id}/capacity-providers/${provider.provider.id}/deployments`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				launchMode: 'connected_host',
				hostId: host.payload.id,
				credentialSessions: {
					capacityProviderHost: session.payload.id,
				},
			}),
		});
		expect(reused.status).toBe(400);
	});

	it('uses canonical project repositories in provider portfolios and stores provider-generated workday/report state', async () => {
		const db = new TestD1Database();
		const store = createTestStore(db);
		const app = createTestApp({ db, store });
		const token = await authorizeApp(app);
		const { team, project } = await createTeamAndProject(app, token, {
			slug: 'portfolio-project',
			name: 'Portfolio Project',
			metadata: {
				repository: {
					provider: 'github',
					owner: 'metadata-owner',
					name: 'metadata-repo',
					cloneUrl: 'git@github.com:metadata-owner/metadata-repo.git',
					defaultBranch: 'metadata',
				},
			},
		});
		await store.upsertHubRepository(project.id, {
			teamId: team.id,
			role: 'primary',
			provider: 'github',
			owner: 'canonical-owner',
			name: 'canonical-repo',
			url: 'https://github.com/canonical-owner/canonical-repo.git',
			defaultBranch: 'main',
			currentBranch: 'main',
			status: 'active',
			submodulePath: 'packages/canonical',
			metadata: { webUrl: 'https://github.com/canonical-owner/canonical-repo' },
		});
		const createdProvider = await json(await app.request(`/v1/teams/${team.id}/capacity-providers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Portfolio Runner',
				launchMode: 'self_hosted',
			}),
		}));
		const providerKey = createdProvider.apiKey.plaintext;
		const portfolioResponse = await app.request('/v1/provider/portfolio', {
			headers: { authorization: `Bearer ${providerKey}` },
		});
		expect(portfolioResponse.status).toBe(200);
		const portfolioPayload = await json(portfolioResponse);
		expect(portfolioPayload.projects[0].repository).toMatchObject({
			provider: 'github',
			role: 'primary',
			owner: 'canonical-owner',
			name: 'canonical-repo',
			defaultBranch: 'main',
			cloneUrl: 'https://github.com/canonical-owner/canonical-repo.git',
			submodulePath: 'packages/canonical',
			webUrl: 'https://github.com/canonical-owner/canonical-repo',
		});

		const workdayResponse = await app.request('/v1/provider/workdays', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${providerKey}`,
			},
			body: JSON.stringify({
				projectId: project.id,
				environment: 'local',
				idempotencyKey: 'provider-workday-local',
				summary: {
					capacityBudget: 10,
					agentCount: 1,
				},
			}),
		});
		expect(workdayResponse.status).toBe(200);
		const workdayPayload = await json(workdayResponse);
		expect(workdayPayload.workDay.summary.provider).toMatchObject({
			id: createdProvider.provider.id,
		});

		const reportResponse = await app.request('/v1/provider/reports', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${providerKey}`,
			},
			body: JSON.stringify({
				workDayId: workdayPayload.workDay.id,
				kind: 'provider_portfolio_processing',
				body: {
					status: 'ok',
					summary: 'Provider portfolio processing completed.',
				},
			}),
		});
		expect(reportResponse.status).toBe(200);
		const provider = await store.getCapacityProvider(team.id, createdProvider.provider.id);
		expect(provider?.metadata).toMatchObject({
			latestProviderWorkday: {
				projectId: project.id,
				workDayId: workdayPayload.workDay.id,
				environment: 'local',
			},
			latestProviderReport: {
				workDayId: workdayPayload.workDay.id,
				kind: 'provider_portfolio_processing',
				summary: 'Provider portfolio processing completed.',
			},
		});
	});

	it('rejects expired and insufficient-scope provider API keys distinctly', async () => {
		const db = new TestD1Database();
		const store = createTestStore(db);
		const app = createTestApp({ db, store });
		const token = await authorizeApp(app);
		const { team } = await createTeamAndProject(app, token, {
			slug: 'capacity-auth-project',
			name: 'Capacity Auth Project',
		});

		const createdProvider = await json(await app.request(`/v1/teams/${team.id}/capacity-providers`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				name: 'Scoped Runner',
				launchMode: 'self_hosted',
			}),
		}));

		const limited = await store.createCapacityProviderApiKey(team.id, createdProvider.provider.id, {
			name: 'Heartbeat only',
			scopes: ['provider:heartbeat'],
		});
		const insufficient = await app.request('/v1/provider/reports', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${limited!.plaintextKey}`,
			},
			body: JSON.stringify({ workDayId: 'missing', kind: 'test', body: {} }),
		});
		expect(insufficient.status).toBe(403);

		const expired = await store.createCapacityProviderApiKey(team.id, createdProvider.provider.id, {
			name: 'Expired',
			expiresAt: '2000-01-01T00:00:00.000Z',
		});
		const expiredHeartbeat = await app.request('/v1/provider/heartbeat', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${expired!.plaintextKey}`,
			},
			body: JSON.stringify({ marketId: 'local' }),
		});
		expect(expiredHeartbeat.status).toBe(401);
	});

	it('launches managed capacity, reserves budgeted agent work, settles actuals, and rejects revoked provider keys', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const { team, project } = await createTeamAndProject(app, token, {
			slug: 'capacity-spine-project',
			name: 'Capacity Spine Project',
		});

		const launchResponse = await app.request(`/v1/teams/${team.id}/capacity/providers/managed`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(launchResponse.status).toBe(201);
		const launch = (await json(launchResponse)).payload;
		expect(launch.provider.status).toBe('active');
		expect(launch.plaintextKey).toMatch(/^tsp_/);
		expect(launch.lanes.map((lane: { id: string }) => lane.id).join(' ')).toContain('proposal-drafting');

		const taskResponse = await app.request(`/v1/projects/${project.id}/agent-tasks`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				taskKind: 'proposal.draft',
				estimatedCreditsP50: 5,
				estimatedCreditsP90: 8,
				utilityValue: 75,
				maintenanceValue: 5,
				successProbability: 0.9,
				cooperativeRouting: true,
				predictiveReservePolicy: { enabled: true, baseReservePercent: 5 },
				hybridExecutionPlan: {
					planId: 'market-hybrid-1',
					phases: [
						{ kind: 'planning', executionProfileId: 'large-reasoning-model', mutationAllowed: false },
						{ kind: 'review', executionProfileId: 'cheap-review-model', mutationAllowed: false },
					],
				},
			}),
		});
		expect(taskResponse.status).toBe(201);
		const taskPayload = (await json(taskResponse)).payload;
		expect(taskPayload.reservation).toMatchObject({
			state: 'reserved',
			reservedCredits: 8,
		});
		expect(taskPayload.task.input.capacity).toMatchObject({
			providerId: launch.provider.id,
			reservationId: taskPayload.reservation.id,
			reservedCredits: 8,
		});
		expect(taskPayload.reservation.metadata).toMatchObject({
			utilityEstimate: expect.objectContaining({ successProbability: 0.9 }),
			reservePrediction: expect.objectContaining({ reservePercent: 5 }),
			hybridExecutionPlan: expect.objectContaining({ planId: 'market-hybrid-1' }),
		});

		const heartbeat = await app.request('/v1/provider/heartbeat', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${launch.plaintextKey}`,
			},
			body: JSON.stringify({
				queueDepth: 1,
				activeWorkers: 1,
				maxWorkers: 2,
				capabilities: ['agent_execution'],
				environments: ['staging'],
			}),
		});
		expect(heartbeat.status).toBe(200);

		const completeResponse = await app.request(`/v1/provider/tasks/${taskPayload.task.id}/complete`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${launch.plaintextKey}`,
			},
				body: JSON.stringify({
					actualCredits: 3,
					usageActual: {
						taskSignature: 'proposal.draft',
						executionProfileId: 'standard-code-model',
						filesChanged: 1,
					},
					output: { summary: 'Drafted proposal.' },
				}),
			});
		expect(completeResponse.status).toBe(200);
		const completed = await json(completeResponse);
		expect(completed.task).toMatchObject({
			id: taskPayload.task.id,
			status: 'completed',
		});

		const rotateResponse = await app.request(`/v1/teams/${team.id}/capacity-providers/${launch.provider.id}/keys/rotate`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(rotateResponse.status).toBe(200);
		const oldHeartbeat = await app.request('/v1/provider/heartbeat', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${launch.plaintextKey}`,
			},
			body: JSON.stringify({ queueDepth: 0 }),
		});
		expect(oldHeartbeat.status).toBe(401);
	});

	it('plans and applies staging seeds with audit records, then reports unchanged', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);

		const unauthenticated = await app.request('/v1/seeds/treeseed/plan', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ environments: ['staging'] }),
		});
		expect(unauthenticated.status).toBe(401);

		const teamResponse = await app.request('/v1/teams', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ slug: 'treeseed', name: 'TreeSeed' }),
		});
		expect(teamResponse.status).toBe(200);
		const team = (await json(teamResponse)).payload;

		const planResponse = await app.request('/v1/seeds/treeseed/plan', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ environments: ['staging'] }),
		});
		expect(planResponse.status).toBe(200);
		const plan = await json(planResponse);
		expect(plan.ok).toBe(true);
		expect(plan.summary).toMatchObject({ create: 5, update: 1, unchanged: 0, skip: 3 });
		expect(plan.run).toMatchObject({ state: 'completed', mode: 'plan', seedName: 'treeseed' });

		const firstApplyResponse = await app.request('/v1/seeds/treeseed/apply', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ environments: ['staging'] }),
		});
		expect(firstApplyResponse.status).toBe(200);
		const firstApply = await json(firstApplyResponse);
		expect(firstApply.ok).toBe(true);
		expect(firstApply.summary).toMatchObject({ create: 5, update: 1, unchanged: 0, skip: 3 });
		expect(firstApply.run).toMatchObject({ state: 'completed', mode: 'apply', seedName: 'treeseed' });
		expect(firstApply.result.actionCount).toBe(6);
		expect(firstApply.result.capacityProviderKeys.created).toHaveLength(0);

		const runs = await json(await app.request('/v1/seeds/runs', {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(JSON.stringify(runs)).not.toContain('tsp_');
		expect(runs.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({
				seedName: 'treeseed',
				mode: 'apply',
				state: 'completed',
			}),
		]));

		const secondApplyResponse = await app.request('/v1/seeds/treeseed/apply', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ environments: ['staging'] }),
		});
		expect(secondApplyResponse.status).toBe(200);
		const secondApply = await json(secondApplyResponse);
		expect(secondApply.summary).toMatchObject({ create: 0, update: 0, unchanged: 6, skip: 3 });
		expect(secondApply.result.actionCount).toBe(0);
		expect(secondApply.result.capacityProviderKeys.created).toHaveLength(0);
		expect(secondApply.result.capacityProviderKeys.existing).toHaveLength(0);

		const exportResponse = await app.request(`/v1/teams/${team.id}/seeds/export`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ name: 'treeseed', environments: ['staging'], includeArtifacts: true }),
		});
		expect(exportResponse.status).toBe(200);
		const exported = await json(exportResponse);
		expect(exported.ok).toBe(true);
		expect(exported.yaml).toContain('repositoryHosts:');
		expect(exported.yaml).toContain('products:');
		expect(exported.yaml).toContain('catalogArtifacts:');
		expect(exported.yaml).not.toMatch(/encryptedPayload|BEGIN PRIVATE KEY|ghp_/u);
	});

	it('gates production seed apply on matching approved requests', async () => {
		const app = createTestApp();
		const token = await authorizeApp(app);
		const teamResponse = await app.request('/v1/teams', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ slug: 'treeseed', name: 'TreeSeed' }),
		});
		const team = (await json(teamResponse)).payload;
		await app.request('/v1/seeds/treeseed/apply', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ environments: ['staging'] }),
		});

		const blockedResponse = await app.request('/v1/seeds/treeseed/apply', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ environments: ['prod'] }),
		});
		expect(blockedResponse.status).toBe(409);
		const blocked = await json(blockedResponse);
		expect(blocked.ok).toBe(false);
		expect(blocked.result.blocked).toBe(true);
		expect(blocked.result.approvalRequest).toMatchObject({
			kind: 'seed_production_apply',
			state: 'pending',
		});

		const teamApprovals = await json(await app.request(`/v1/teams/${team.id}/approval-requests?kind=seed_production_apply`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(teamApprovals.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({
				id: blocked.result.approvalRequest.id,
				kind: 'seed_production_apply',
				state: 'pending',
			}),
		]));

		const inbox = await json(await app.request(`/v1/teams/${team.id}/inbox`, {
			headers: { authorization: `Bearer ${token}` },
		}));
		expect(inbox.payload).toEqual(expect.arrayContaining([
			expect.objectContaining({
				href: `/app/work/decisions#approval-${blocked.result.approvalRequest.id}`,
				metadata: expect.objectContaining({
					approvalId: blocked.result.approvalRequest.id,
					approvalKind: 'seed_production_apply',
				}),
			}),
		]));

		const staleResponse = await app.request('/v1/seeds/treeseed/apply', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ environments: ['prod'], approvalRequestId: blocked.result.approvalRequest.id }),
		});
		expect(staleResponse.status).toBe(409);

		const decided = await app.request(`/v1/approval-requests/${blocked.result.approvalRequest.id}/decide`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ state: 'approved' }),
		});
		expect(decided.status).toBe(200);

		const appliedResponse = await app.request('/v1/seeds/treeseed/apply', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ environments: ['prod'], approvalRequestId: blocked.result.approvalRequest.id }),
		});
		expect(appliedResponse.status).toBe(200);
		const applied = await json(appliedResponse);
		expect(applied.ok).toBe(true);
		expect(applied.summary.create).toBeGreaterThan(0);
		expect(applied.run).toMatchObject({ state: 'completed', mode: 'apply' });
	});
});
