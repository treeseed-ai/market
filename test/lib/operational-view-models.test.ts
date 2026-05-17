import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockProject = { id: 'project-1', teamId: 'team-1', slug: 'ops-docs', name: 'Ops Docs', description: 'Operational documentation' };
const mockApproval = {
	id: 'approval-1',
	projectId: 'project-1',
	workDayId: 'workday-1',
	kind: 'publish',
	state: 'pending',
	severity: 'high',
	title: 'Publish operational report',
	summary: 'Review generated operational report before publication.',
	createdAt: '2026-05-01T10:00:00.000Z',
};
const mockStore: any = {
	listTeamProjects: vi.fn(async () => [mockProject]),
	getProjectSummary: vi.fn(async () => ({
		project: mockProject,
		repositories: [{ id: 'repo-1', owner: 'treeseed-ai', name: 'market', role: 'software', status: 'active' }],
		capabilityGrants: [{ id: 'grant-1', namespace: 'release', operation: 'publish', label: 'Publish release', enabled: true, approvalPolicy: { requiresApproval: true, reason: 'Publication is externally visible.' } }],
		latestProdDeployment: { environment: 'prod', status: 'succeeded', releaseTag: 'v1' },
		recentActivity: [{ id: 'activity-1', title: 'Verification completed', status: 'completed', timestamp: '2026-05-01T09:00:00.000Z' }],
	})),
	getProjectAgentsSummary: vi.fn(async () => ({
		currentWorkday: { id: 'workday-1', state: 'active', summary: { objective: 'Improve deployment reliability guidance' }, updatedAt: '2026-05-01T11:00:00.000Z' },
		generatedArtifacts: [{ id: 'artifact-1', artifactKind: 'knowledge_report', title: 'Deployment reliability report', state: 'generated', workDayId: 'workday-1' }],
		knowledgeDrafts: [{ knowledgeDraft: { id: 'draft-1', title: 'Deployment checklist', reviewState: 'pending', workDayId: 'workday-1' } }],
		runtimeReports: [{ id: 'report-1', kind: 'workday_summary', workDayId: 'workday-1' }],
		taskHealth: { activeTasks: [{ id: 'task-1', workDayId: 'workday-1', type: 'verification', state: 'running', priority: 1 }] },
		workerRunners: [{ id: 'runner-1', runnerId: 'runner-1', state: 'active', activeLocalWorkers: 1, maxLocalWorkers: 2 }],
	})),
	listProjectWorkdaySummaries: vi.fn(async () => [{
		id: 'summary-1',
		projectId: 'project-1',
		workDayId: 'workday-1',
		environment: 'staging',
		kind: 'workday_summary',
		state: 'active',
		summary: { objective: 'Improve deployment reliability guidance', docsAutomation: { generatedArtifactCount: 1, pendingApprovalCount: 1 } },
		updatedAt: '2026-05-01T11:00:00.000Z',
	}]),
	listApprovalRequestsForTeam: vi.fn(async () => [mockApproval]),
	listApprovalRequestsForProject: vi.fn(async () => [mockApproval]),
	getProjectCapacitySummary: vi.fn(async () => ({ readiness: 'ready' })),
	getProjectCapacityOperations: vi.fn(async () => ({
		summary: { readiness: 'waiting_for_budget', reasons: ['daily_budget_exhausted'], workPolicy: { enabled: true, environment: 'staging', dailyTaskCreditBudget: 12, maxQueuedTasks: 5, maxQueuedCredits: 12 } },
		blockedRoutingDecisions: [{ id: 'blocked-route-1', workDayId: 'workday-1', decision: 'approval_required', reason: 'daily budget threshold' }],
		interruptionReservations: [],
		pendingApprovalRequests: [mockApproval],
	})),
	getProjectReleasesSummary: vi.fn(async () => ({ history: [{ environment: 'prod', status: 'succeeded', releaseTag: 'v1' }] })),
	listRuntimeWorkDays: vi.fn(async () => [{ id: 'workday-1', projectId: 'project-1', state: 'active', capacityBudget: 12, capacityUsed: 4, summaryJson: JSON.stringify({ objective: 'Improve deployment reliability guidance' }) }]),
	listRuntimeTasks: vi.fn(async () => [{ id: 'task-1', workDayId: 'workday-1', type: 'verification', state: 'completed' }]),
	listRuntimeTaskEvents: vi.fn(async () => [{ id: 'event-1', kind: 'VerificationCompleted', createdAt: '2026-05-01T12:00:00.000Z' }]),
	listRuntimeTaskOutputs: vi.fn(async () => [{
		id: 'output-1',
		taskId: 'task-1',
		outputRef: 'r2:agent-artifacts/workday-1/verification.json',
		createdAt: '2026-05-01T12:05:00.000Z',
		output: {
			artifactKind: 'verification_checklist',
			id: 'verification-artifact-1',
			title: 'Deployment verification checklist',
			sourceRefs: ['packages/deploy/src/index.ts'],
		},
	}]),
	listCapacityLedgerEntries: vi.fn(async () => [{ id: 'ledger-1', workDayId: 'workday-1', taskId: 'task-1', phase: 'consume', credits: 4, usd: 1.25 }]),
	listCapacityRoutingDecisionsForProject: vi.fn(async () => [{ id: 'route-1', workDayId: 'workday-1', taskId: 'task-1', decision: 'selected', reason: 'verification lane' }]),
	listPersistedTeamInboxItems: vi.fn(async () => [{ id: 'inbox-1', projectId: 'project-1', kind: 'approval', state: 'waiting_for_approval', title: 'Publish operational report', itemKey: 'approval-1' }]),
	listAuditEventsForTarget: vi.fn(async () => [{ id: 'audit-1', actorType: 'user', eventType: 'approval_requested', targetType: 'project', targetId: 'project-1', data: { summary: 'Approval entered review.' }, createdAt: '2026-05-01T10:01:00.000Z' }]),
	listKnowledgePacks: vi.fn(async () => [{ id: 'pack-1', slug: 'ops-pack', name: 'Ops Pack', summary: 'Operational import', visibility: 'public' }]),
	listTeamWebHosts: vi.fn(async () => [{ id: 'host-1', name: 'Staging host', provider: 'cloudflare', status: 'active' }]),
	listRepositoryHosts: vi.fn(async () => [{ id: 'repo-host-1', name: 'GitHub', provider: 'github', status: 'active' }]),
	listTeamCapacityProviders: vi.fn(async () => [{ id: 'provider-1', name: 'Managed capacity', provider: 'railway', status: 'active' }]),
	listCapacityGrants: vi.fn(async () => [{ id: 'grant-capacity-1', state: 'active', grantScope: 'team' }]),
	listTeamProducts: vi.fn(async () => [{ id: 'resource-1', title: 'Deployment workflow', kind: 'template', visibility: 'private' }]),
};

vi.mock('../../src/lib/market/store.js', () => ({
	resolveMarketStore: () => mockStore,
	resolveMarketPrincipal: () => ({ id: 'user-1' }),
	loadAccessibleTeams: async () => [{ id: 'team-1', name: 'treeseed', displayName: 'TreeSeed' }],
}));

describe('operational view models', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads Mission Control from existing operational data', async () => {
		const { loadMissionControlViewModel } = await import('../../src/view-models/mission-control.vm.js');
		const vm = await loadMissionControlViewModel({} as App.Locals);

		expect(vm.metrics.map((metric) => metric.label)).toContain('Active workdays');
		expect(vm.activeWorkdays[0]).toMatchObject({ id: 'workday-1', projectName: 'Ops Docs' });
		expect(vm.pendingApprovals[0]).toMatchObject({ title: 'Publish operational report' });
	});

	it('loads Workday list and detail projections', async () => {
		const { loadWorkdayListViewModel, loadWorkdayDetailViewModel } = await import('../../src/view-models/workday.vm.js');
		const list = await loadWorkdayListViewModel({} as App.Locals);
		const detail = await loadWorkdayDetailViewModel({} as App.Locals, 'workday-1');

		expect(list.workdays).toHaveLength(1);
		expect(detail.timeline.map((event) => event.title)).toContain('Verification Completed');
		expect(detail.artifacts.map((artifact) => artifact.title)).toContain('Deployment reliability report');
		expect(detail.artifacts.map((artifact) => artifact.title)).toContain('Deployment verification checklist');
		expect(detail.phases.map((phase) => phase.label)).toEqual(['Research', 'Implementation', 'Verification', 'Governance', 'Knowledge']);
		expect(detail.capacity.totalCredits).toBe(4);
		expect(detail.repositoryContext.map((entry) => entry.title ?? entry.name)).toContain('Referenced operational files');
	});

	it('loads Governance, Knowledge, and Infrastructure projections', async () => {
		const { loadGovernanceViewModel } = await import('../../src/view-models/governance.vm.js');
		const { loadKnowledgeViewModel } = await import('../../src/view-models/knowledge.vm.js');
		const { loadInfrastructureViewModel } = await import('../../src/view-models/infrastructure.vm.js');

		const governance = await loadGovernanceViewModel({} as App.Locals);
		const knowledge = await loadKnowledgeViewModel({} as App.Locals);
		const infrastructure = await loadInfrastructureViewModel({} as App.Locals);

		expect(governance.pendingApprovals).toHaveLength(1);
		expect(governance.reviewQueue.map((item) => item.href)).toContain('/app/governance/approval-1');
		expect(governance.auditTrail.map((item) => item.title)).toContain('Approval Requested');
		expect(governance.policies.map((item) => item.title)).toContain('Publish release');
		expect(governance.capacityConstraints.map((item) => item.title)).toContain('Capacity approval required');
		expect(knowledge.artifacts.map((artifact) => artifact.title)).toContain('Ops Pack');
		expect(knowledge.categories).toEqual(['Architecture', 'Operations', 'Research', 'Implementation', 'Decisions', 'Reports', 'Releases', 'Imports']);
		expect(knowledge.reports.map((artifact) => artifact.title)).toContain('Deployment reliability report');
		expect(knowledge.relationshipSummary.approvals).toBe(1);
		expect(knowledge.artifacts.find((artifact) => artifact.title === 'Deployment reliability report')?.relationships.repositories.map((repository) => repository.name)).toContain('market');
		expect(infrastructure.repositories[0]).toMatchObject({ title: 'treeseed-ai/market' });
		expect(infrastructure.capacity.map((entry) => entry.title)).toContain('Managed capacity');
		expect(infrastructure.workers.map((entry) => entry.title)).toContain('runner-1');
		expect(infrastructure.hosts.map((entry) => entry.title)).toContain('Staging host');
		expect(infrastructure.resources.map((entry) => entry.title)).toContain('Deployment workflow');
		expect(infrastructure.seeds.map((entry) => entry.title)).toContain('Seed treeseed');
		expect(infrastructure.diagnostics.length).toBeGreaterThan(0);
	});
});
