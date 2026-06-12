import { describe, expect, it, vi } from 'vitest';
import { buildGovernanceApprovalProjection, buildGovernanceProjection } from '../../packages/admin/src/lib/market/governance-projection.js';

const approval = {
	id: 'approval-1',
	teamId: 'team-1',
	projectId: 'project-1',
	workDayId: 'workday-1',
	taskId: 'task-1',
	kind: 'publish_report',
	state: 'pending',
	severity: 'critical',
	title: 'Publish operational report',
	summary: 'Review generated operational report before publication.',
	options: [{ id: 'approve', label: 'Approve publication' }, { id: 'request_changes', label: 'Request revision' }],
	policySnapshot: { requiresApproval: true, reason: 'Publication is externally visible.' },
	recommendation: { decision: 'approve' },
	createdAt: '2026-05-01T10:00:00.000Z',
};

function store() {
	return {
		listApprovalRequestsForTeam: vi.fn(async () => [approval]),
		listApprovalRequestsForProject: vi.fn(async () => [approval]),
		getProjectSummary: vi.fn(async () => ({
			repositories: [{ id: 'repo-1', owner: 'treeseed-ai', name: 'market' }],
			capabilityGrants: [{ id: 'grant-1', namespace: 'release', operation: 'publish', label: 'Publish release', enabled: true, approvalPolicy: { requiresApproval: true, reason: 'External release.' } }],
			recentActivity: [{ id: 'activity-1', title: 'Verification completed', status: 'completed', timestamp: '2026-05-01T09:00:00.000Z' }],
		})),
		getProjectAgentsSummary: vi.fn(async () => ({
			generatedArtifacts: [{ id: 'artifact-1', workDayId: 'workday-1', title: 'Deployment report', state: 'generated' }],
			knowledgeDrafts: [],
			runtimeReports: [],
		})),
		getProjectCapacityOperations: vi.fn(async () => ({
			summary: { readiness: 'waiting_for_budget', reasons: ['daily_budget_exhausted'], workPolicy: { enabled: true, environment: 'staging', dailyTaskCreditBudget: 20, maxQueuedTasks: 4, maxQueuedCredits: 20 } },
			blockedRoutingDecisions: [{ id: 'route-1', workDayId: 'workday-1', decision: 'approval_required', reason: 'budget approval required' }],
			interruptionReservations: [],
		})),
		listProjectWorkdaySummaries: vi.fn(async () => [{ id: 'summary-1', workDayId: 'workday-1', state: 'active', summary: { objective: 'Improve deployment reliability guidance' } }]),
		listPersistedTeamInboxItems: vi.fn(async () => [{ id: 'inbox-1', projectId: 'project-1', kind: 'approval', state: 'waiting_for_approval', title: 'Publish operational report', itemKey: 'approval-1' }]),
		listAuditEventsForTarget: vi.fn(async () => [{ id: 'audit-1', actorType: 'user', eventType: 'approval_requested', targetType: 'project', targetId: 'project-1', data: { summary: 'Approval entered review.' }, createdAt: '2026-05-01T10:01:00.000Z' }]),
	};
}

describe('governance projection', () => {
	it('builds a review dashboard from approvals, policies, capacity, inbox, and audit data', async () => {
		const projection = await buildGovernanceProjection({
			store: store(),
			principal: { id: 'user-1' },
			teams: [{ id: 'team-1' }],
			projects: [{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }],
		});

		expect(projection.pendingApprovals).toHaveLength(1);
		expect(projection.escalations[0]).toMatchObject({ approvalId: 'approval-1', severity: 'critical' });
		expect(projection.reviewQueue[0].href).toBe('/app/work/decisions/approval-1');
		expect(projection.policies.map((item) => item.title)).toEqual(expect.arrayContaining(['Publish release', 'Ops Docs workday policy']));
		expect(projection.policyViolations.map((item) => item.title)).toContain('Capacity approval required');
		expect(projection.auditTrail.map((item) => item.title)).toContain('Approval Requested');

		const serialized = JSON.stringify(projection);
		expect(serialized).not.toContain('agentId');
		expect(serialized).not.toContain('payloadJson');
		expect(serialized).not.toContain('prompt');
	});

	it('builds one approval review surface with related context and decision options', async () => {
		const detail = await buildGovernanceApprovalProjection({
			store: store(),
			principal: { id: 'user-1' },
			teams: [{ id: 'team-1' }],
			projects: [{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }],
			approvalId: 'approval-1',
		});

		expect(detail?.approval).toMatchObject({ approvalId: 'approval-1', title: 'Publish operational report' });
		expect(detail?.decisionOptions.map((option) => option.id)).toEqual(['approve', 'request_changes']);
		expect(detail?.repositories[0]).toMatchObject({ name: 'market' });
		expect(detail?.relatedArtifacts.map((artifact) => artifact.title)).toContain('Deployment report');
		expect(detail?.capacityConstraints.map((item) => item.title)).toContain('Capacity approval required');
	});

	it('resolves approval detail when UI links normalize separators', async () => {
		const detail = await buildGovernanceApprovalProjection({
			store: store(),
			principal: { id: 'user-1' },
			teams: [{ id: 'team-1' }],
			projects: [{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }],
			approvalId: 'approval:1',
		});

		expect(detail?.approval).toMatchObject({ approvalId: 'approval-1', title: 'Publish operational report' });
	});
});
