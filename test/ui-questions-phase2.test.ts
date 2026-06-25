import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUESTION_CAPABILITY, QUESTION_RESOURCE_SCHEMA } from '../packages/admin/src/capabilities/questions';
import {
	buildQuestionsPageViewModel,
	resolveQuestionsPolicy,
} from '../packages/admin/src/view-models/ui-foundation/questions.vm';
import type { WorkContentEntry } from '../packages/admin/src/view-models/work-content';

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function context(overrides: Record<string, unknown> = {}) {
	return {
		store: null,
		principal: { id: 'user-1', permissions: ['projects:manage:team'] },
		teams: [{ id: 'team-1', name: 'TreeSeed' }],
		activeTeam: { id: 'team-1', name: 'TreeSeed' },
		projects: [{ id: 'project-1', name: 'Market' }],
		...overrides,
	};
}

function governance(overrides: Record<string, unknown> = {}) {
	return {
		context: context(overrides),
		metrics: [],
		pendingApprovals: [],
		escalations: [],
		reviewQueue: [],
		reviewTimeline: [],
		policies: [],
		policyViolations: [],
		capacityConstraints: [],
		auditTrail: [],
	};
}

function question(overrides: Partial<WorkContentEntry> = {}): WorkContentEntry {
	return {
		id: 'how-should-agents-use-questions',
		collection: 'questions',
		title: 'How should agents use questions?',
		description: 'Clarify the operating loop.',
		summary: 'Questions should guide planning and proposals.',
		status: 'planned',
		date: '2026-06-25',
		type: 'strategy',
		primaryContributor: 'market-steward',
		relations: ['objective:core'],
		href: '/app/work/questions/how-should-agents-use-questions',
		...overrides,
	};
}

describe('Phase 2 question vertical', () => {
	it('declares question capability and resource schema', () => {
		expect(QUESTION_CAPABILITY).toMatchObject({
			id: 'work.questions',
			path: '/app/work/questions',
			template: 'collection',
			resourceType: 'question',
			primaryAction: 'question.create',
		});
		expect(QUESTION_RESOURCE_SCHEMA).toMatchObject({
			type: 'question',
			display: { label: 'Question', pluralLabel: 'Questions' },
		});
	});

	it('resolves allowed, read-only, denied, unauthenticated, and setup-required states', () => {
		expect(resolveQuestionsPolicy(context()).create).toBe('allowed');
		expect(resolveQuestionsPolicy(context({ principal: { id: 'reader', permissions: [] } })).create).toBe('readOnly');
		expect(resolveQuestionsPolicy(context({ principal: { id: 'blocked', permissions: ['questions:deny'] } })).read).toBe('denied');
		expect(resolveQuestionsPolicy(context({ principal: null })).read).toBe('requiresSignIn');
		expect(resolveQuestionsPolicy(context({ activeTeam: null, projects: [] })).read).toBe('requiresSetup');
	});

	it('maps filters and empty collection state without service calls', () => {
		const url = new URL('https://example.test/app/work/questions?q=missing&status=planned&questionType=strategy');
		const vm = buildQuestionsPageViewModel({
			governance: governance(),
			knowledge: null,
			questionEntries: [question()],
			approvalQuestions: [],
			artifactQuestions: [],
			url,
		});

		const collection = vm.collection as any;
		expect(collection.filters?.map((filter: any) => [filter.key, filter.value])).toEqual([
			['q', 'missing'],
			['status', 'planned'],
			['questionType', 'strategy'],
		]);
		expect(collection.rows).toHaveLength(0);
		expect(collection.emptyDescription).toBe('No questions match the current filters.');
		expect((vm as any).permissions['question.create']).toBe('allowed');
	});

	it('resolves policy-filtered contextual help for question actions', () => {
		const readOnlyVm = buildQuestionsPageViewModel({
			governance: governance({ principal: { id: 'reader', permissions: [] } }),
			knowledge: null,
			questionEntries: [],
			approvalQuestions: [],
			artifactQuestions: [],
			url: new URL('https://example.test/app/work/questions'),
		});
		const deniedVm = buildQuestionsPageViewModel({
			governance: governance({ principal: { id: 'blocked', permissions: ['questions:deny'] } }),
			knowledge: null,
			questionEntries: [],
			approvalQuestions: [],
			artifactQuestions: [],
			url: new URL('https://example.test/app/work/questions'),
		});
		const setupVm = buildQuestionsPageViewModel({
			governance: governance({ activeTeam: null, projects: [] }),
			knowledge: null,
			questionEntries: [],
			approvalQuestions: [],
			artifactQuestions: [],
			url: new URL('https://example.test/app/work/questions'),
		});

		expect(readOnlyVm.help).toMatchObject({
			capabilityId: 'work.questions',
			routePattern: '/app/work/questions',
			searchScope: 'project',
			visibility: 'team',
			feedbackType: 'question',
		});
		expect(readOnlyVm.help.topics?.some((topic) => topic.source === 'action-state')).toBe(true);
		expect(readOnlyVm.help.relatedActions.some((action) => action.reason?.includes('inspect questions'))).toBe(true);
		expect(deniedVm.help.relatedActions.some((action) => action.reason?.includes('cannot access'))).toBe(true);
		expect(setupVm.help.relatedActions.some((action) => action.remediation?.includes('Create or select a team'))).toBe(true);
	});

	it('keeps dedicated question routes on Phase 1 templates without page-local CSS or raw role checks', () => {
		for (const path of [
			'packages/admin/src/pages/app/work/questions.astro',
			'packages/admin/src/pages/app/work/questions/new.astro',
			'packages/admin/src/pages/app/work/questions/[slug].astro',
			'packages/admin/src/pages/app/work/questions/[slug]/edit.astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('TreeseedAppLayout');
			expect(contents, path).toContain('PermissionBoundary');
			expect(contents, path).not.toContain('HelpDrawer');
			expect(contents, path).not.toContain('data-ts-help');
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\broles?\b|\bpermissions\s*\.includes/u);
		}
		expect(source('packages/admin/src/pages/app/work/questions.astro')).toContain('CollectionTemplate');
		expect(source('packages/admin/src/pages/app/work/questions/[slug].astro')).toContain('DetailTemplate');
		expect(source('packages/admin/src/pages/app/work/questions/new.astro')).toContain('SettingsTemplate');
		expect(source('packages/admin/src/pages/app/work/questions/[slug]/edit.astro')).toContain('SettingsTemplate');
	});

	it('keeps generic work routes from owning primary question implementation', () => {
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/work/[collection]/new.astro'))).toBe(false);
		expect(existsSync(resolve(process.cwd(), 'packages/admin/src/pages/app/work/[collection]/[slug].astro'))).toBe(false);
		expect(source('packages/admin/src/routes.ts')).not.toContain('/app/work/[collection]');
	});
});
