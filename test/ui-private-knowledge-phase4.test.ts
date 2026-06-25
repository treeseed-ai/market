import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Phase 4 private knowledge reader', () => {
	it('registers canonical project-scoped private knowledge routes before generic project surfaces', () => {
		const routes = source('packages/admin/src/routes.ts');
		const privateIndex = routes.indexOf("'/app/projects/[projectId]/knowledge'");
		const privateSlug = routes.indexOf("'/app/projects/[projectId]/knowledge/[...slug]'");
		const genericProject = routes.indexOf("'/app/projects/[projectId]'");

		expect(privateIndex).toBeGreaterThan(-1);
		expect(privateSlug).toBeGreaterThan(privateIndex);
		expect(privateIndex).toBeLessThan(genericProject);
	});

	it('renders private knowledge through ProductShell layout and ReaderTemplate without unsafe route code', () => {
		for (const path of [
			'packages/admin/src/pages/app/projects/[projectId]/knowledge.astro',
			'packages/admin/src/pages/app/projects/[projectId]/knowledge/[...slug].astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('TreeseedAppLayout');
			expect(contents, path).toContain('ReaderTemplate');
			expect(contents, path).toContain('PublishedContentBody');
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\bfetch\s*\(|Astro\.request|localDocuments|local_collections|getCollection\s*\(/u);
			expect(contents, path).not.toMatch(/public,\s*max-age|s-maxage|objectKey|r2:\/\//iu);
			expect(contents, path).not.toMatch(/\b(?:roles|role|permissions)\s*\??\.\s*(?:includes|some|has)\s*\(/u);
		}
	});

	it('uses the narrow Market/API access and audit contract for private knowledge outcomes', () => {
		const api = source('packages/api/src/api/app.ts');
		expect(api).toContain("app.post('/v1/projects/:projectId/private-knowledge/access'");
		expect(api).toContain('resolvePrincipalTeamContext');
		expect(api).toContain('private_knowledge.read');
		expect(api).toContain('private_knowledge.denied');
		expect(api).toContain('private_knowledge.not_found');
		expect(api).not.toContain('raw R2 URL');

		const facade = source('packages/admin/src/lib/market/api-client.ts');
		expect(facade).toContain('validatePrivateKnowledgeAccess');
		expect(facade).toContain('recordPrivateKnowledgeOutcome');
	});

	it('keeps private route redirects scoped to the current safe path', () => {
		for (const path of [
			'packages/admin/src/pages/app/projects/[projectId]/knowledge.astro',
			'packages/admin/src/pages/app/projects/[projectId]/knowledge/[...slug].astro',
		]) {
			const contents = source(path);
			expect(contents).toContain('Astro.url.pathname');
			expect(contents).toContain('Astro.url.search');
			expect(contents).not.toContain("Astro.url.searchParams.get('returnTo')");
		}
	});
});
