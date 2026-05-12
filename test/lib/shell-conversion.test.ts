import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('app and public shell conversion', () => {
	it('adapts market app layout through core shell primitives', () => {
		const contents = source('src/layouts/TreeseedAppLayout.astro');

		expect(contents).toContain('AppShell');
		expect(contents).toContain('ProjectHeader');
		expect(contents).toContain('SensitiveDataUnlock');
		expect(contents).toContain('slot="railContext"');
		expect(contents).toContain('slot="headerAction"');
		expect(contents).toContain('slot="projectContext"');
		expect(contents).toContain('slot="sensitiveModal"');
		expect(contents).toContain('resolveAuthenticatedThemePreference');
	});

	it('adapts market public layout through the core public shell', () => {
		const contents = source('src/layouts/TreeseedPublicLayout.astro');

		expect(contents).toContain('PublicShell');
		expect(contents).toContain('resolveAnonymousThemePreference');
		expect(contents).toContain('navItems={navItems}');
		expect(contents).toContain('actions={actions}');
	});

	it('keeps sensitive unlock behavior in the market component', () => {
		const contents = source('src/components/app/sensitive/SensitiveDataUnlock.astro');

		expect(contents).toContain('window.treeseedSensitiveUnlock');
		expect(contents).toContain('data-sensitive-unlock-button');
		expect(contents).toContain('data-sensitive-unlock-label');
		expect(contents).toContain('data-sensitive-modal');
		expect(contents).toContain('data-sensitive-modal-close');
		expect(contents).toContain('data-sensitive-modal-mode-button');
		expect(contents).toContain('data-sensitive-mode');
		expect(contents).toContain('data-sensitive-lock-now');
	});

	it('removes inline styling and retired tokens from converted layouts', () => {
		for (const path of ['src/layouts/TreeseedAppLayout.astro', 'src/layouts/TreeseedPublicLayout.astro']) {
			const contents = source(path);
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\sstyle=/u);
			expect(contents, path).not.toMatch(/--(?:site|kc)-/u);
		}
	});
});
