import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionMock = vi.hoisted(() => vi.fn());
const storeMock = vi.hoisted(() => ({
	listTeamProjects: vi.fn(),
	listProjectWorkdaySummaries: vi.fn(),
	listRuntimeWorkDays: vi.fn(),
	getProjectAgentsSummary: vi.fn(),
	getProjectSummary: vi.fn(),
	listRuntimeTasks: vi.fn(),
	listRuntimeTaskEvents: vi.fn(),
	listRuntimeTaskOutputs: vi.fn(),
	listApprovalRequestsForProject: vi.fn(),
	getProjectCapacitySummary: vi.fn(),
	listCapacityLedgerEntries: vi.fn(),
	listCapacityRoutingDecisionsForProject: vi.fn(),
}));
const teamsMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/auth/session-store', () => ({
	loadSiteWebSession: sessionMock,
}));

vi.mock('../../src/lib/market/store', () => ({
	resolveMarketStore: () => storeMock,
	loadAccessibleTeams: teamsMock,
}));

const { GET } = await import('../../src/pages/api/workdays/[workdayId].js');

function context(workdayId = 'workday-1') {
	return {
		params: { workdayId },
		locals: {},
		cookies: { get: vi.fn() },
		request: new Request(`https://market.example.com/api/workdays/${workdayId}`),
		url: new URL(`https://market.example.com/api/workdays/${workdayId}`),
	} as any;
}

async function json(response: Response) {
	return response.json() as Promise<any>;
}

describe('workday aggregate API route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionMock.mockResolvedValue({ principal: { id: 'user-1' } });
		teamsMock.mockResolvedValue([{ id: 'team-1', name: 'TreeSeed' }]);
		storeMock.listTeamProjects.mockResolvedValue([{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }]);
		storeMock.listProjectWorkdaySummaries.mockResolvedValue([{
			id: 'summary-1',
			projectId: 'project-1',
			workDayId: 'workday-1',
			environment: 'staging',
			state: 'active',
			summary: { objective: 'Improve deployment reliability guidance' },
		}]);
		storeMock.listRuntimeWorkDays.mockResolvedValue([{ id: 'workday-1', projectId: 'project-1', state: 'active' }]);
		storeMock.getProjectAgentsSummary.mockResolvedValue({ generatedArtifacts: [], knowledgeDrafts: [], runtimeReports: [] });
		storeMock.getProjectSummary.mockResolvedValue({ repositories: [{ id: 'repo-1', owner: 'treeseed-ai', name: 'market' }] });
		storeMock.listRuntimeTasks.mockResolvedValue([{ id: 'task-1', workDayId: 'workday-1', type: 'verification', state: 'completed' }]);
		storeMock.listRuntimeTaskEvents.mockResolvedValue([{ id: 'event-1', taskId: 'task-1', kind: 'VerificationCompleted', createdAt: '2026-05-01T11:00:00.000Z' }]);
		storeMock.listRuntimeTaskOutputs.mockResolvedValue([{ id: 'output-1', taskId: 'task-1', output: { artifactKind: 'verification_checklist', id: 'checklist-1', title: 'Deployment verification checklist' } }]);
		storeMock.listApprovalRequestsForProject.mockResolvedValue([{ id: 'approval-1', workDayId: 'workday-1', state: 'pending', severity: 'high', title: 'Publish report' }]);
		storeMock.getProjectCapacitySummary.mockResolvedValue({ readiness: 'ready' });
		storeMock.listCapacityLedgerEntries.mockResolvedValue([{ id: 'ledger-1', workDayId: 'workday-1', credits: 3 }]);
		storeMock.listCapacityRoutingDecisionsForProject.mockResolvedValue([{ id: 'route-1', workDayId: 'workday-1' }]);
	});

	it('requires authentication', async () => {
		sessionMock.mockResolvedValue(null);
		const response = await GET(context());
		expect(response.status).toBe(401);
		expect(await json(response)).toMatchObject({ ok: false, error: 'Authentication required.' });
	});

	it('returns the sanitized workday projection', async () => {
		const response = await GET(context());
		const body = await json(response);

		expect(response.status).toBe(200);
		expect(body.ok).toBe(true);
		expect(body.payload.workday).toMatchObject({
			id: 'workday-1',
			objective: 'Improve deployment reliability guidance',
			riskClassification: 'High',
		});
		expect(body.payload.timeline.map((event: any) => event.title)).toContain('Verification Completed');
		expect(body.payload.artifacts.map((artifact: any) => artifact.title)).toContain('Deployment verification checklist');
		expect(body.payload.capacity).toMatchObject({ totalCredits: 3, routingDecisionCount: 1 });
	});

	it('returns 404 for unknown workdays', async () => {
		const response = await GET(context('missing-workday'));
		expect(response.status).toBe(404);
		expect(await json(response)).toMatchObject({ ok: false, error: 'Unknown workday.' });
	});
});
