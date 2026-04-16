import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentSdk } from '@treeseed/sdk';
import type { D1DatabaseLike, D1PreparedStatementLike } from '@treeseed/core/types/cloudflare';
import { createMarketApiApp } from '../../src/api/app.js';

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
const sqliteModule = await import('node:sqlite').catch(() => null);
const DatabaseSyncCtor = sqliteModule?.DatabaseSync ?? null;
const DatabaseSync = DatabaseSyncCtor as NonNullable<typeof DatabaseSyncCtor>;
const runtimeDescribe = DatabaseSyncCtor ? describe : describe.skip;
const resolvedAuthMigrationPath = authMigrationPath as string;
const resolvedMarketMigrationPath = marketMigrationPath as string;
const resolvedCatalogMigrationPath = catalogMigrationPath as string;
const resolvedTopologyMigrationPath = topologyMigrationPath as string;

if (!authMigrationPath || !marketMigrationPath || !catalogMigrationPath || !topologyMigrationPath) {
	throw new Error('Unable to resolve required market migration fixtures.');
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

async function authorizeApp(app: ReturnType<typeof createTestApp>) {
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
			principalId: 'user-1',
			displayName: 'Market User',
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

runtimeDescribe('market api', () => {
	afterEach(() => {
		vi.restoreAllMocks();
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
});
