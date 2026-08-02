import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(path, 'utf8');

describe('shell-level feedback architecture', () => {
	it('owns one shared trigger, panel, and delegated controller in the UI package', () => {
		const controls = source('packages/ui/src/astro/shell/chrome/SiteUserControls.astro');
		const frame = source('packages/ui/src/astro/shell/layout/ShellFrame.astro');
		const panel = source('packages/ui/src/astro/feedback/FeedbackPanel.astro');
		expect(controls).toContain('FeedbackTrigger');
		expect(frame).toContain('FeedbackPanel');
		expect(panel).toContain('initializeFeedbackPanels');
		expect([controls, frame, panel].join('\n')).not.toMatch(/<style(?:\s|>)/u);
	});

	it('keeps full-page screenshot capture lazy and redaction-scoped', () => {
		const controller = source('packages/ui/src/lib/feedback/panel.ts');
		const capture = source('packages/ui/src/lib/feedback/dom-capture.ts');
		const overlays = source('packages/ui/src/lib/feedback/capture-overlays.ts');
		expect(controller).toContain("await import('./dom-capture.ts')");
		expect(capture).toContain('data-ts-feedback-redact');
		expect(capture).toContain('captureDocumentBounds');
		expect(overlays).toContain('data-ts-feedback-panel');
		expect([capture, overlays].join('\n')).not.toMatch(/R2|objectKey|privateUrl|authorization/iu);
	});

	it('uses the canonical Starlight book routes instead of the removed runtime reader', () => {
		for (const path of [
			'packages/core/src/pages/t/[teamSlug]/books/[bookSlug]/index.astro',
			'packages/core/src/pages/t/[teamSlug]/books/[bookSlug]/[...pageSlug].astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('StarlightPage');
			expect(contents, path).not.toMatch(/ReaderTemplate|docs-runtime/iu);
		}
	});

	it('persists feedback through the durable authenticated API without audit-as-storage', () => {
		const submission = source('packages/api/src/api/routes/feedback/submission.ts');
		expect(submission).toContain("app.post('/v1/feedback'");
		expect(submission).toContain('feedback.submitted');
		expect(submission).toContain('INSERT INTO feedback_submissions');
		expect(submission).not.toMatch(/upsertTeamInboxItem|input\.email|input\.userId/iu);
	});
});
