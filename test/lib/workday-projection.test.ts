import { describe, expect, it, vi } from 'vitest';
import { buildWorkdayProjection } from '../../src/lib/market/workday-projection.js';

describe('workday projection', () => {
	it('builds a sanitized operational projection from runtime and store data', async () => {
		const store = {
			listProjectWorkdaySummaries: vi.fn(async () => [{
				id: 'summary-1',
				projectId: 'project-1',
				workDayId: 'workday-1',
				environment: 'staging',
				state: 'active',
				summary: { objective: 'Improve deployment reliability guidance' },
				updatedAt: '2026-05-01T10:00:00.000Z',
			}]),
			listRuntimeWorkDays: vi.fn(async () => [{
				id: 'workday-1',
				projectId: 'project-1',
				state: 'active',
				capacityBudget: 20,
				capacityUsed: 6,
			}]),
			getProjectAgentsSummary: vi.fn(async () => ({
				currentWorkday: { id: 'workday-1', state: 'active' },
				generatedArtifacts: [{
					id: 'artifact-1',
					workDayId: 'workday-1',
					artifactKind: 'architecture_update',
					title: 'Deployment architecture update',
					state: 'generated',
					sourceRefs: ['docs/deployments.md'],
				}],
				knowledgeDrafts: [{ knowledgeDraft: { id: 'draft-1', workDayId: 'workday-1', title: 'Release review notes', reviewState: 'pending' } }],
				runtimeReports: [{ id: 'report-1', workDayId: 'workday-1', kind: 'workday_summary', title: 'Operational report' }],
			})),
			getProjectSummary: vi.fn(async () => ({
				repositories: [{ id: 'repo-1', owner: 'treeseed-ai', name: 'market', status: 'active' }],
			})),
			listRuntimeTasks: vi.fn(async () => [{
				id: 'task-1',
				workDayId: 'workday-1',
				agentId: 'planner-agent',
				type: 'verification',
				state: 'completed',
				payloadJson: JSON.stringify({ prompt: 'hidden prompt text' }),
			}]),
			listRuntimeTaskEvents: vi.fn(async () => [{ id: 'event-1', taskId: 'task-1', kind: 'VerificationCompleted', createdAt: '2026-05-01T11:00:00.000Z' }]),
			listRuntimeTaskOutputs: vi.fn(async () => [{
				id: 'output-1',
				taskId: 'task-1',
				outputRef: 'r2:agent-artifacts/workday-1/checklist.json',
				createdAt: '2026-05-01T11:01:00.000Z',
				output: {
					artifactKind: 'verification_checklist',
					id: 'checklist-1',
					title: 'Deployment verification checklist',
					sourceRefs: ['packages/worker/src/index.ts'],
					prompt: 'hidden prompt text',
				},
			}]),
			listApprovalRequestsForProject: vi.fn(async () => [{
				id: 'approval-1',
				workDayId: 'workday-1',
				state: 'pending',
				severity: 'high',
				title: 'Publish operational report',
				summary: 'Review before publication.',
				createdAt: '2026-05-01T11:05:00.000Z',
			}]),
			getProjectCapacitySummary: vi.fn(async () => ({ readiness: 'ready' })),
			listCapacityLedgerEntries: vi.fn(async () => [{ id: 'ledger-1', workDayId: 'workday-1', taskId: 'task-1', credits: 6, usd: 2.5 }]),
			listCapacityRoutingDecisionsForProject: vi.fn(async () => [{ id: 'route-1', workDayId: 'workday-1', taskId: 'task-1', decision: 'selected' }]),
		};

		const projection = await buildWorkdayProjection({
			store,
			principal: { id: 'user-1' },
			projects: [{ id: 'project-1', slug: 'ops-docs', name: 'Ops Docs' }],
			workdayId: 'workday-1',
		});

		expect(projection?.workday).toMatchObject({
			id: 'workday-1',
			objective: 'Improve deployment reliability guidance',
			riskClassification: 'High',
			currentPhase: 'Governance',
		});
		expect(projection?.phases.map((phase) => phase.label)).toEqual(['Research', 'Implementation', 'Verification', 'Governance', 'Knowledge']);
		expect(projection?.timeline.map((event) => event.title)).toContain('Verification Completed');
		expect(projection?.artifacts.map((artifact) => artifact.type)).toEqual(expect.arrayContaining(['Architecture Update', 'Verification Checklist', 'Release Note', 'Report']));
		expect(projection?.repositoryContext.map((entry) => entry.name ?? entry.title)).toEqual(expect.arrayContaining(['market', 'Referenced operational files']));
		expect(projection?.capacity).toMatchObject({ totalCredits: 6, totalUsd: 2.5, routingDecisionCount: 1 });
		expect(projection?.agentActivity).toEqual(expect.arrayContaining([
			expect.objectContaining({ id: 'planner-agent', taskCount: 1, completedCount: 1, failedCount: 0 }),
		]));

		const serialized = JSON.stringify(projection);
		expect(serialized).not.toContain('hidden prompt text');
		expect(serialized).not.toContain('payloadJson');
	});
});
