import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('retained Admin shells', () => {
	it('composes account, team, and active-team domain navigation', () => {
		const source = readFileSync('packages/admin/src/layouts/AppLayout.astro', 'utf8');
		const activeTeamAction = readFileSync('packages/admin/src/pages/app/teams/active.ts', 'utf8');
		expect(source).toContain('ProductShell');
		expect(activeTeamAction).toContain("cookies.set('treeseed_active_team'");
		expect(activeTeamAction).toContain("path: '/app'");
		for (const target of ['/app/', '/app/account', '/app/teams', '/app/teams/new']) expect(source).toContain(target);
		for (const target of ['/app/projects', '/app/services', '/app/capacity', '/app/work', '/app/knowledge']) expect(source).toContain(target);
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
		expect(source).toContain('showFooter={!profilePage}');
		for (const target of ['/p/', '/knowledge-packs', '/templates']) expect(source).not.toContain(target);
	});
});
