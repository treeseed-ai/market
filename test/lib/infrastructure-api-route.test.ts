import { beforeEach, describe, expect, it, vi } from 'vitest';

const teamsMock = vi.hoisted(() => vi.fn());
const storeValue = vi.hoisted(() => ({ current: null as any }));
const seedStateMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/market/store', () => ({
	resolveMarketApi: () => storeValue.current,
	loadAccessibleTeams: teamsMock,
}));

vi.mock('../../src/lib/market/infrastructure-seeds', () => ({
	loadInfrastructureSeedState: seedStateMock,
}));

const route = await import('../../src/pages/api/infrastructure.js');

function context(path = '/api/infrastructure') {
	const url = new URL(`https://market.example.com${path}`);
	return {
		params: {},
		locals: { auth: { principal: { id: 'user-1' } } },
		cookies: { get: vi.fn() },
		request: new Request(url),
		url,
	} as any;
}

async function json(response: Response) {
	return response.json() as Promise<any>;
}

describe('infrastructure API route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		teamsMock.mockResolvedValue([{ id: 'team-1', name: 'treeseed' }]);
		seedStateMock.mockResolvedValue({ selectedSeed: 'treeseed', selectedEnvironments: 'local', plan: null, diagnostics: [], runs: [], approvals: [] });
		storeValue.current = {
			listTeamProjects: vi.fn(async () => [{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }]),
			listTeamWebHosts: vi.fn(async () => [{ id: 'host-1', name: 'Staging host', provider: 'cloudflare', status: 'active' }]),
			listRepositoryHosts: vi.fn(async () => []),
			listTeamCapacityProviders: vi.fn(async () => []),
			listCapacityGrants: vi.fn(async () => []),
			listTeamProducts: vi.fn(async () => []),
			getTeamCapacitySummary: vi.fn(async () => ({ readiness: 'ready' })),
			listAuditEventsForTarget: vi.fn(async () => []),
			getProjectSummary: vi.fn(async () => ({ repositories: [{ id: 'repo-1', owner: 'treeseed-ai', name: 'market', status: 'active' }], capabilityGrants: [] })),
			getProjectDetails: vi.fn(async () => ({ resources: [], deployments: [], repositories: [] })),
			getProjectAgentsSummary: vi.fn(async () => ({
				workerRunners: [{ id: 'runner-1', runnerId: 'runner-secret-token', runnerServiceName: 'worker-runner-01', state: 'active' }],
				taskHealth: { activeTasks: [{ id: 'task-1', state: 'running', payloadJson: '{"prompt":"hidden"}' }] },
			})),
			getProjectReleasesSummary: vi.fn(async () => ({ history: [] })),
			getProjectCapacityOperations: vi.fn(async () => ({ summary: { readiness: 'ready' }, blockedRoutingDecisions: [], interruptionReservations: [] })),
		};
	});

	it('requires authentication', async () => {
		const unauthenticated = context();
		unauthenticated.locals.auth = null;
		const response = await route.GET(unauthenticated);
		expect(response.status).toBe(401);
		expect(await json(response)).toMatchObject({ ok: false, error: 'Authentication required.' });
	});

	it('returns unavailable store errors', async () => {
		storeValue.current = null;
		const response = await route.GET(context());
		expect(response.status).toBe(503);
		expect(await json(response)).toMatchObject({ ok: false, error: 'Market API facade is unavailable.' });
	});

	it('returns sanitized infrastructure projection', async () => {
		const response = await route.GET(context());
		const body = await json(response);

		expect(response.status).toBe(200);
		expect(body.ok).toBe(true);
		expect(body.payload.projects[0]).toMatchObject({ title: 'Ops Docs' });
		expect(body.payload.repositories[0]).toMatchObject({ title: 'treeseed-ai/market' });
		expect(body.payload.hosts[0]).toMatchObject({ title: 'Staging host' });
		const serialized = JSON.stringify(body.payload);
		expect(serialized).not.toContain('runner-secret-token');
		expect(serialized).not.toContain('payloadJson');
		expect(serialized).not.toContain('prompt');
	});
});
