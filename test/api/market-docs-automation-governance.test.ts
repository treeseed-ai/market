import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TREESEED_PLATFORM_KNOWLEDGE_QUESTIONS } from '../../packages/agent/src/agents/knowledge/pipeline.ts';
import { runLocalEndToEndVerification } from '../../packages/agent/src/agents/testing/local-e2e-verification.ts';

describe('market docs automation governance dogfood', () => {
	it('runs the governed research, draft, approval, mutation, and report loop', async () => {
		const result = await runLocalEndToEndVerification({
			now: new Date('2026-05-14T12:00:00.000Z'),
			projectId: 'treeseed-market',
			teamId: 'treeseed-market',
			environment: 'local',
		});
		try {
			const questionCount = TREESEED_PLATFORM_KNOWLEDGE_QUESTIONS.length;
			expect(result.ok).toBe(true);
			expect(result.seededTaskCount).toBe(questionCount);
			expect(result.taskCounts.byKind).toMatchObject({
				research_question: questionCount,
				generate_knowledge_draft: questionCount,
				optimize_knowledge_draft: questionCount,
				promote_knowledge_draft_request: questionCount,
				promote_knowledge_to_staging: questionCount,
				release_staged_knowledge_request: questionCount,
			});
			expect(result.artifactCounts).toMatchObject({
				research_note: questionCount,
				knowledge_draft: questionCount,
				optimization_report: questionCount,
				promotion_request: questionCount,
				release_request: questionCount,
			});
			expect(result.approvalCount).toBe(questionCount * 2);
			expect(result.stagingAttempted).toBe(true);
			expect(result.releaseAttempted).toBe(true);
			expect(result.stagedPathCount).toBe(questionCount);
			expect(result.api).toMatchObject({
				currentWorkdayReported: true,
				reportCount: 1,
				approvalCount: questionCount * 2,
				releaseApprovalCount: questionCount,
			});
			expect(result.generatedTargetPaths).toEqual(expect.arrayContaining(
				TREESEED_PLATFORM_KNOWLEDGE_QUESTIONS.map((question) => question.targetPath),
			));

			const report = readFileSync(resolve(result.repoRoot, result.report.relativePath), 'utf8');
			expect(report).toContain('## Generated Artifacts');
			expect(report).toContain('## Operation Events');
			expect(report).toContain('## Staging And Release');
			expect(report).toContain('Release results:');
			for (const question of TREESEED_PLATFORM_KNOWLEDGE_QUESTIONS) {
				expect(report).toContain(question.targetPath);
			}
		} finally {
			rmSync(result.repoRoot, { recursive: true, force: true });
		}
	});
});
