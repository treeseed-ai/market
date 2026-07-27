import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('retained Admin shells', () => {
	it('limits the authenticated shell to account and team work', () => {
		const source = readFileSync('packages/admin/src/layouts/AppLayout.astro', 'utf8');
		expect(source).toContain('ProductShell');
		expect(source).toContain('treeseed_active_team');
		for (const target of ['/app/', '/app/account', '/app/teams', '/app/teams/new']) expect(source).toContain(target);
		for (const target of ['/app/projects', '/app/services', '/app/capacity', '/app/work', '/app/knowledge']) expect(source).not.toContain(target);
		expect(source).not.toContain('SensitiveDataUnlock');
		expect(source).not.toContain('<style');
	});

	it('keeps the public shell identity-only', () => {
		const source = readFileSync('packages/admin/src/layouts/PublicLayout.astro', 'utf8');
		const sharedShell = readFileSync('packages/ui/src/astro/public/PublicSingleColumnShell.astro', 'utf8');
		const controls = readFileSync('packages/ui/src/astro/shell/chrome/SiteUserControls.astro', 'utf8');
		expect(source).toContain('PublicShell');
		expect(source).toContain("label: 'Home'");
		expect(source).not.toContain('ShellIconLink');
		expect(sharedShell.match(/\bshowManagerLink\b/gu)).toHaveLength(1);
		expect(controls.match(/icon="manager"/gu)).toHaveLength(1);
		for (const target of ['/market', '/p/', '/knowledge-packs', '/templates']) expect(source).not.toContain(target);
	});
});
