import { beforeEach, describe, expect, it, vi } from 'vitest';

const teamsMock = vi.hoisted(() => vi.fn());
const currentApproval = vi.hoisted(() => ({
	id: 'approval-1',
	teamId: 'team-1',
	projectId: 'project-1',
	workDayId: 'workday-1',
	kind: 'publish_report',
	state: 'pending',
	severity: 'high',
	title: 'Publish operational report',
	summary: 'Review generated operational report.',
	options: [],
	createdAt: '2026-05-01T10:00:00.000Z',
}));
const storeMock = vi.hoisted(() => ({
	listTeamProjects: vi.fn(),
	listApprovalRequestsForTeam: vi.fn(),
	listApprovalRequestsForProject: vi.fn(),
	getProjectSummary: vi.fn(),
	getProjectAgentsSummary: vi.fn(),
	getProjectCapacityOperations: vi.fn(),
	listProjectWorkdaySummaries: vi.fn(),
	listPersistedTeamInboxItems: vi.fn(),
	listAuditEventsForTarget: vi.fn(),
	decideApprovalRequest: vi.fn(),
	deleteTeamInboxItemsByItemKey: vi.fn(),
}));

vi.mock('../../src/lib/market/store', () => ({
	resolveMarketApi: () => storeMock,
	loadAccessibleTeams: teamsMock,
}));

const listRoute = await import('../../src/pages/api/governance/index.js');
const detailRoute = await import('../../src/pages/api/governance/[approvalId].js');
const decisionRoute = await import('../../src/pages/api/governance/[approvalId]/decision.js');

function context(path = '/api/governance', request?: Request) {
	const url = new URL(`https://market.example.com${path}`);
	return {
		params: { approvalId: path.split('/')[3] },
		locals: { auth: { principal: { id: 'user-1' } } },
		cookies: { get: vi.fn() },
		request: request ?? new Request(url),
		url,
		redirect: (location: string, status = 302) => new Response(null, { status, headers: { location } }),
	} as any;
}

async function json(response: Response) {
	return response.json() as Promise<any>;
}

describe('governance API routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		currentApproval.state = 'pending';
		teamsMock.mockResolvedValue([{ id: 'team-1' }]);
		storeMock.listTeamProjects.mockResolvedValue([{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }]);
		storeMock.listApprovalRequestsForTeam.mockResolvedValue([currentApproval]);
		storeMock.listApprovalRequestsForProject.mockResolvedValue([currentApproval]);
		storeMock.getProjectSummary.mockResolvedValue({ repositories: [{ id: 'repo-1', name: 'market' }], capabilityGrants: [] });
		storeMock.getProjectAgentsSummary.mockResolvedValue({ generatedArtifacts: [], knowledgeDrafts: [], runtimeReports: [] });
		storeMock.getProjectCapacityOperations.mockResolvedValue({ summary: { readiness: 'ready' }, blockedRoutingDecisions: [], interruptionReservations: [] });
		storeMock.listProjectWorkdaySummaries.mockResolvedValue([{ id: 'summary-1', workDayId: 'workday-1', summary: { objective: 'Improve docs' } }]);
		storeMock.listPersistedTeamInboxItems.mockResolvedValue([]);
		storeMock.listAuditEventsForTarget.mockResolvedValue([]);
		storeMock.decideApprovalRequest.mockResolvedValue({ ...currentApproval, state: 'approved' });
		storeMock.deleteTeamInboxItemsByItemKey.mockResolvedValue(undefined);
	});

	it('requires authentication', async () => {
		const unauthenticated = context();
		unauthenticated.locals.auth = null;
		const response = await listRoute.GET(unauthenticated);
		expect(response.status).toBe(401);
		expect(await json(response)).toMatchObject({ ok: false, error: 'Authentication required.' });
	});

	it('returns governance projection and approval detail', async () => {
		const list = await json(await listRoute.GET(context()));
		const detail = await json(await detailRoute.GET(context('/api/governance/approval-1')));

		expect(list.payload.pendingApprovals[0]).toMatchObject({ approvalId: 'approval-1', href: '/app/work/decisions/approval-1' });
		expect(detail.payload.approval).toMatchObject({ approvalId: 'approval-1', title: 'Publish operational report' });
	});

	it('records authenticated decisions', async () => {
		const request = new Request('https://market.example.com/api/governance/approval-1/decision', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ optionId: 'approve', note: 'Looks ready.' }),
		});
		const response = await decisionRoute.POST(context('/api/governance/approval-1/decision', request));
		const body = await json(response);

		expect(response.status).toBe(200);
		expect(body.ok).toBe(true);
		expect(storeMock.decideApprovalRequest).toHaveBeenCalledWith('approval-1', expect.objectContaining({
			state: 'approved',
			decidedById: 'user-1',
			decision: expect.objectContaining({ optionId: 'approve', note: 'Looks ready.' }),
		}));
	});

	it('returns 404 for unknown approvals and 409 for decided approvals', async () => {
		const missing = await detailRoute.GET(context('/api/governance/missing'));
		expect(missing.status).toBe(404);

		currentApproval.state = 'approved';
		const request = new Request('https://market.example.com/api/governance/approval-1/decision', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ optionId: 'approve' }),
		});
		const conflict = await decisionRoute.POST(context('/api/governance/approval-1/decision', request));
		expect(conflict.status).toBe(409);
	});
});
