import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionMock = vi.hoisted(() => vi.fn());
const teamsMock = vi.hoisted(() => vi.fn());
const storeMock = vi.hoisted(() => ({
	listTeamProjects: vi.fn(),
	getProjectSummary: vi.fn(),
	getProjectAgentsSummary: vi.fn(),
	listProjectWorkdaySummaries: vi.fn(),
	listApprovalRequestsForProject: vi.fn(),
	getProjectReleasesSummary: vi.fn(),
	listKnowledgePacks: vi.fn(),
}));
const contentEntriesMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/auth/session-store', () => ({
	loadSiteWebSession: sessionMock,
}));

vi.mock('../../src/lib/market/store', () => ({
	resolveMarketStore: () => storeMock,
	loadAccessibleTeams: teamsMock,
}));

vi.mock('../../src/view-models/knowledge-content', () => ({
	loadKnowledgeContentEntries: contentEntriesMock,
}));

const listRoute = await import('../../src/pages/api/knowledge/index.js');
const detailRoute = await import('../../src/pages/api/knowledge/[artifactId].js');

function context(path = '/api/knowledge') {
	const url = new URL(`https://market.example.com${path}`);
	return {
		params: { artifactId: path.split('/')[3] },
		locals: {},
		cookies: { get: vi.fn() },
		request: new Request(url),
		url,
	} as any;
}

async function json(response: Response) {
	return response.json() as Promise<any>;
}

describe('knowledge API routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionMock.mockResolvedValue({ principal: { id: 'user-1' } });
		teamsMock.mockResolvedValue([{ id: 'team-1' }]);
		storeMock.listTeamProjects.mockResolvedValue([{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }]);
		storeMock.getProjectSummary.mockResolvedValue({ repositories: [{ id: 'repo-1', owner: 'treeseed-ai', name: 'market', status: 'active' }] });
		storeMock.getProjectAgentsSummary.mockResolvedValue({
			generatedArtifacts: [{
				id: 'artifact-1',
				artifactKind: 'knowledge_report',
				title: 'Deployment reliability report',
				state: 'generated',
				workDayId: 'workday-1',
				prompt: 'hidden prompt text',
			}],
			knowledgeDrafts: [],
			runtimeReports: [],
			researchNotes: [],
			optimizationReports: [],
		});
		storeMock.listProjectWorkdaySummaries.mockResolvedValue([{ id: 'summary-1', workDayId: 'workday-1', summary: { objective: 'Improve docs' } }]);
		storeMock.listApprovalRequestsForProject.mockResolvedValue([{ id: 'approval-1', workDayId: 'workday-1', state: 'pending', title: 'Review report' }]);
		storeMock.getProjectReleasesSummary.mockResolvedValue({ history: [] });
		storeMock.listKnowledgePacks.mockResolvedValue([{ id: 'pack-1', name: 'Ops Pack', visibility: 'public' }]);
		contentEntriesMock.mockResolvedValue([]);
	});

	it('requires authentication', async () => {
		sessionMock.mockResolvedValue(null);
		const response = await listRoute.GET(context());
		expect(response.status).toBe(401);
		expect(await json(response)).toMatchObject({ ok: false, error: 'Authentication required.' });
	});

	it('returns the knowledge projection and artifact detail', async () => {
		const list = await json(await listRoute.GET(context()));
		const detail = await json(await detailRoute.GET(context('/api/knowledge/artifact-1')));

		expect(list.payload.artifacts.map((artifact: any) => artifact.title)).toContain('Deployment reliability report');
		expect(list.payload.imports.map((artifact: any) => artifact.title)).toContain('Ops Pack');
		expect(detail.payload).toMatchObject({
			id: 'artifact-1',
			title: 'Deployment reliability report',
			metadata: { producedDuring: 'workday-1', approvalStatus: 'pending' },
		});
		expect(detail.payload.href).toBe('/app/knowledge/reports/artifact-1');
		expect(JSON.stringify(detail.payload)).not.toContain('hidden prompt text');
	});

	it('returns 404 for unknown artifacts', async () => {
		const response = await detailRoute.GET(context('/api/knowledge/missing'));
		expect(response.status).toBe(404);
		expect(await json(response)).toMatchObject({ ok: false, error: 'Unknown knowledge artifact.' });
	});
});
