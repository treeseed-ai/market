import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	const sourcePath = path.replace(/^@treeseed\/ui\/components\/astro\//u, 'packages/ui/src/astro/');
	return readFileSync(resolve(process.cwd(), sourcePath), 'utf8');
}

describe('app and public shell conversion', () => {
	it('adapts market app layout through core shell primitives', () => {
		const contents = source('packages/admin/src/layouts/TreeseedAppLayout.astro');

		expect(contents).toContain('AppShell');
		expect(contents).toContain('SensitiveDataUnlock');
		expect(contents).toContain('slot="railContext"');
		expect(contents).toContain('slot="headerAction"');
		expect(contents).toContain('slot="sensitiveModal"');
		expect(contents).toContain('showSensitiveUnlock');
		expect(contents).toContain('Astro.url.pathname');
		expect(contents).toContain('/app/hosts');
		expect(contents).toContain('/app/projects/new');
		expect(contents).toContain('resolveAuthenticatedThemePreference');
		expect(contents).toContain('Start');
		expect(contents).not.toContain(`label: 'Team'`);
		expect(contents).toContain('Manage teams');
		expect(contents).toContain('Hosts');
		expect(contents).toContain('Projects');
		expect(contents).toContain('Capacity');
		expect(contents).toContain('Work');
		expect(contents).toContain('Knowledge');
		expect(contents).toContain('reload: true');
		expect(contents).not.toContain('Mission Control');
		expect(contents).not.toContain('Workdays');
		expect(contents).not.toContain('Infrastructure');
		expect(contents).not.toContain('ProjectHeader');
		expect(contents).not.toContain('projectTabs');
	});

	it('adapts market public layout through the core public shell', () => {
		const contents = source('packages/admin/src/layouts/TreeseedPublicLayout.astro');

		expect(contents).toContain('PublicShell');
		expect(contents).toContain('resolveAnonymousThemePreference');
		expect(contents).toContain('navItems={navItems}');
		expect(contents).toContain('actions={actions}');
	});

	it('installs the dev reload client through shared core shells', () => {
		for (const path of [
			'@treeseed/ui/components/astro/shell/AppShell.astro',
			'@treeseed/ui/components/astro/shell/PublicShell.astro',
		]) {
			const contents = source(path);
			expect(contents, path).toContain('ClientRouter');
		}

		const mainLayout = source('@treeseed/ui/components/astro/layouts/MainLayout.astro');
		expect(mainLayout).not.toContain('DevWatchReload');
		expect(source('@treeseed/ui/components/astro/auth/AuthShell.astro')).toContain('DevWatchReload');
		expect(source('@treeseed/ui/components/astro/docs/Footer.astro')).toContain('DevWatchReload');
	});

	it('keeps sensitive unlock behavior in the market component', () => {
		const contents = source('@treeseed/ui/components/astro/app/sensitive/SensitiveDataUnlock.astro');

		expect(contents).toContain('window.treeseedSensitiveUnlock');
		expect(contents).toContain('data-sensitive-unlock-button');
		expect(contents).toContain('data-sensitive-unlock-label');
		expect(contents).toContain('data-sensitive-modal');
		expect(contents).toContain('data-sensitive-modal-close');
		expect(contents).toContain('data-sensitive-modal-mode-button');
		expect(contents).toContain('data-sensitive-mode');
		expect(contents).toContain('data-sensitive-lock-now');
		expect(contents).toContain('data-astro-rerun');
		expect(contents).toContain('__treeseedSensitiveUnlockState');
		expect(contents).toContain('requestPassphrase()');
		expect(contents).toContain('promptPassphrase()');
		expect(contents).toContain('action="javascript:void(0)"');
		expect(contents).toContain('submitUnlock: handleUnlockSubmit');
		expect(contents).toContain("bindSensitiveEvent(currentUnlockForm(), 'submit', handleUnlockSubmit)");
		expect(contents).toContain('pendingPassphraseRequests');
		expect(contents).toContain('clearPagePassphrase');
		expect(contents).toContain("'astro:before-swap'");
		expect(contents).toContain("'pagehide'");
		expect(contents).toContain('destroy()');
	});

	it('removes inline styling and retired tokens from converted layouts', () => {
		for (const path of ['packages/admin/src/layouts/TreeseedAppLayout.astro', 'packages/admin/src/layouts/TreeseedPublicLayout.astro']) {
			const contents = source(path);
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\sstyle=/u);
			expect(contents, path).not.toMatch(/--(?:site|kc)-/u);
		}
	});
});
