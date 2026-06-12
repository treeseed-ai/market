import { describe, expect, it, vi } from 'vitest';
import { buildKnowledgeArtifactProjection, buildKnowledgeProjection } from '../../packages/admin/src/lib/market/knowledge-projection.js';

describe('knowledge projection', () => {
	it('unifies operational artifacts, imports, reports, releases, and content relationships', async () => {
		const store = {
			getProjectSummary: vi.fn(async () => ({
				repositories: [{ id: 'repo-1', owner: 'treeseed-ai', name: 'market', status: 'active' }],
			})),
			getProjectAgentsSummary: vi.fn(async () => ({
				generatedArtifacts: [{
					id: 'artifact-1',
					artifactKind: 'architecture_update',
					title: 'Deployment architecture update',
					state: 'generated',
					workDayId: 'workday-1',
					sourceRefs: ['docs/deployments.md'],
					prompt: 'hidden prompt text',
				}],
				knowledgeDrafts: [{ knowledgeDraft: { id: 'draft-1', title: 'Deployment checklist', reviewState: 'pending', workDayId: 'workday-1' } }],
				runtimeReports: [{ id: 'report-1', kind: 'workday_summary', title: 'Workday report', workDayId: 'workday-1' }],
				researchNotes: [{ id: 'research-1', title: 'Repository findings', state: 'published', workDayId: 'workday-1' }],
				optimizationReports: [{ id: 'optimization-1', title: 'Knowledge optimization report', state: 'completed', workDayId: 'workday-1' }],
			})),
			listProjectWorkdaySummaries: vi.fn(async () => [{
				id: 'summary-1',
				workDayId: 'workday-1',
				state: 'completed',
				summary: { objective: 'Improve deployment reliability guidance' },
			}]),
			listApprovalRequestsForProject: vi.fn(async () => [{
				id: 'approval-1',
				workDayId: 'workday-1',
				state: 'approved',
				title: 'Publish report',
				summary: 'Approve knowledge publication.',
				decidedBy: 'adrian',
				createdAt: '2026-05-01T10:00:00.000Z',
			}]),
			getProjectReleasesSummary: vi.fn(async () => ({
				history: [{ id: 'release-1', releaseTag: 'v1.2.3', status: 'succeeded', environment: 'prod', completedAt: '2026-05-01T12:00:00.000Z' }],
			})),
			listKnowledgePacks: vi.fn(async () => [{ id: 'pack-1', slug: 'ops-pack', name: 'Ops Pack', summary: 'Reusable operational playbook.', visibility: 'public' }]),
		};
		const contentEntries = [{
			collection: 'decisions',
			id: 'adopt-release-review',
			slug: 'adopt-release-review',
			data: {
				id: 'decision:release-review',
				title: 'Adopt release review',
				summary: 'Release review remains governed.',
				status: 'live',
				date: '2026-05-01',
			},
		}];

		const projection = await buildKnowledgeProjection({
			store,
			principal: { id: 'user-1' },
			teams: [{ id: 'team-1' }],
			projects: [{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }],
			contentEntries,
		});

		expect(projection.categories).toEqual(['Architecture', 'Operations', 'Research', 'Implementation', 'Decisions', 'Reports', 'Releases', 'Imports']);
		expect(projection.artifacts.map((artifact) => artifact.title)).toEqual(expect.arrayContaining([
			'Deployment architecture update',
			'Deployment checklist',
			'Workday report',
			'Repository findings',
			'Knowledge optimization report',
			'Release v1.2.3',
			'Adopt release review',
			'Ops Pack',
		]));
		expect(projection.imports.map((artifact) => artifact.title)).toContain('Ops Pack');
		expect(projection.reports.map((artifact) => artifact.title)).toContain('Workday report');
		expect(projection.releases.map((artifact) => artifact.title)).toContain('Release v1.2.3');
		expect(projection.relationshipSummary).toMatchObject({ workdays: 1, repositories: 2, approvals: 1, releases: 1, decisions: 1 });

		const detail = await buildKnowledgeArtifactProjection({
			store,
			principal: { id: 'user-1' },
			teams: [{ id: 'team-1' }],
			projects: [{ id: 'project-1', name: 'Ops Docs', slug: 'ops-docs' }],
			contentEntries,
			artifactId: 'artifact-1',
		});
		expect(detail?.metadata).toMatchObject({
			producedDuring: 'workday-1',
			approvalStatus: 'approved',
			approvedBy: 'adrian',
			projectName: 'Ops Docs',
		});
		expect(detail?.relationships.approvals.map((approval) => approval.id)).toContain('approval-1');
		expect(detail?.relationships.repositories.map((repository) => repository.name ?? repository.title)).toContain('market');

		const serialized = JSON.stringify(projection);
		expect(serialized).not.toContain('hidden prompt text');
		expect(serialized).not.toContain('payloadJson');
		expect(serialized).not.toContain('agentId');
	});
});
