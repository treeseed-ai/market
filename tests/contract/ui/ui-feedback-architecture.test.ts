import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	return readFileSync(path, 'utf8');
}

function sources(paths: string[]) {
	return paths.map(source).join('\n');
}

describe('shell-level feedback architecture', () => {
	it('replaces shell feedback placeholders with the shared feedback components', () => {
		for (const path of [
			'packages/ui/src/astro/shell/layout/ProductShell.astro',
			'packages/ui/src/astro/shell/layout/PublicShell.astro',
			'packages/ui/src/astro/auth/AuthShell.astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('FeedbackButton');
			expect(contents, path).toContain('FeedbackDialog');
			expect(contents, path).not.toContain('>Feedback</button>');
		}
	});

	it('keeps screenshot capture lazy and redaction-scoped', () => {
		const dialog = source('packages/ui/src/lib/feedback/dialog.ts');
		const capture = source('packages/ui/src/lib/feedback/dom-capture.ts');
		const shells = [
			'packages/ui/src/astro/shell/layout/ProductShell.astro',
			'packages/ui/src/astro/shell/layout/PublicShell.astro',
			'packages/ui/src/astro/auth/AuthShell.astro',
			'packages/ui/src/astro/layouts/MainLayout.astro',
		].map(source).join('\n');

		expect(dialog).toContain("await import('./dom-capture.ts')");
		expect(shells).not.toContain('dom-capture');
		expect(capture).toContain('data-ts-feedback-redact');
		expect(capture).not.toMatch(/R2|objectKey|privateUrl|token/iu);
	});

	it('keeps Core Knowledge Hub proof routes wired through shell feedback context', () => {
		for (const path of [
			'packages/core/src/pages/docs-runtime/index.astro',
			'packages/core/src/pages/docs-runtime/[...slug].astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('feedbackContext={viewModel.feedback}');
			expect(contents, path).toContain('ReaderTemplate');
			expect(contents, path).not.toMatch(/<form[^>]+feedback|fetch\(/iu);
		}
		const helper = sources([
			'packages/core/src/utils/runtime/runtime-reader.ts',
			'packages/core/src/utils/runtime-reader/runtime-reader-nav-item.ts',
		]);
		expect(helper).toContain("submissionEndpoint: '/api/feedback/submit'");
		expect(helper).toContain("capabilityId: 'core.public-knowledge-reader'");
	});

	it('uses narrow feedback submission paths without leaking private metadata into route templates', () => {
		const api = sources([
			'packages/api/src/api/support/app.ts',
			'packages/api/src/api/routes/support/foundation-health-market-and-feedback.ts',
			'packages/api/src/api/app/support/feedback.ts',
		]);
		const coreEndpoint = source('packages/core/src/pages/api/feedback/submit.ts');
		expect(api).toContain("app.post('/v1/feedback'");
		expect(api).toContain('feedback.submitted');
		expect(api).toContain("kind: 'feedback'");
		expect(api).toContain("c.header('cache-control', 'no-store')");
		expect(coreEndpoint).toContain('/v1/feedback');
		expect(coreEndpoint).toContain("'cache-control': 'no-store'");
		expect(coreEndpoint).not.toMatch(/create.*Store|recordAuditEvent|upsertTeamInboxItem/iu);
		for (const path of [
			'packages/core/src/pages/docs-runtime/index.astro',
			'packages/core/src/pages/docs-runtime/[...slug].astro',
		]) {
			expect(source(path), path).not.toMatch(/private.*object|objectKey|R2.*url|raw.*role|data-ts-feedback-form/iu);
		}
	});
});
