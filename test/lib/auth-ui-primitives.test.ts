import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const convertedFiles = [
	'src/pages/app/account.astro',
	'src/pages/auth/register.astro',
	'src/pages/auth/sign-in.astro',
	'src/pages/auth/forgot-password.astro',
	'src/pages/auth/reset-password.astro',
	'src/pages/auth/check-email.astro',
	'src/pages/auth/confirm-email.astro',
	'src/pages/auth/username.astro',
];

function source(path: string) {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('auth and account UI primitive conversion', () => {
	it('uses shared auth wrappers on standalone auth pages', () => {
		for (const path of convertedFiles.filter((entry) => entry.includes('/auth/'))) {
			const contents = source(path);
			expect(contents, path).toContain('AuthShell');
			expect(contents, path).toContain('AuthCard');
		}

		const shell = source('packages/ui/src/astro/auth/AuthShell.astro');
		expect(shell).toContain('ClientRouter');
		expect(shell).toContain('ThemeMenu');
		expect(shell).toContain('auth-shell__appearance');
		expect(shell).toContain('DevWatchReload');
		expect(shell).toContain('treeseed:auth-form:');
		expect(shell).toContain("document.querySelectorAll('form.auth-form')");
	});

	it('shows the app header brand on primary auth forms', () => {
		const card = source('packages/ui/src/astro/auth/AuthCard.astro');
		const css = source('packages/ui/src/styles/auth.css');
		expect(card).toContain('class="auth-card__brand"');
		expect(card).toContain('class="auth-brand"');
		expect(card).toContain('slot name="sidebarLinks"');
		expect(card).toContain('src="/logo.svg"');
		expect(card).toContain('TreeSeed Platform');
		expect(card).toContain('Simple controls');
		expect(css).toContain('.auth-card > .ts-panel__body');
		expect(css).toContain('grid-template-columns: minmax(10rem, 12rem) minmax(28rem, 1fr)');
		expect(css).toContain('.auth-card__brand');
		expect(css).toContain('.auth-card__links');
		expect(css).toContain('.auth-brand__mark');
		expect(css).toContain('.auth-shell__appearance');
		expect(css).toContain('position: fixed');
		expect(css).toContain('.auth-card select.ts-control');
		expect(css).toContain('padding-inline: 0.75rem 2.5rem');
		for (const path of [
			'src/pages/auth/register.astro',
			'src/pages/auth/sign-in.astro',
			'src/pages/auth/confirm-email.astro',
			'src/pages/auth/forgot-password.astro',
			'src/pages/auth/reset-password.astro',
			'src/pages/auth/check-email.astro',
		]) {
			expect(source(path), path).toContain('AuthCard');
			expect(source(path), path).toContain('slot="sidebarLinks"');
		}
	});

	it('keeps registration appearance wiring and removes the account-local appearance tab', () => {
		const register = source('src/pages/auth/register.astro');
		expect(register).toContain('showAppearance={false}');
		expect(register).not.toContain('Default appearance');
		expect(register).toContain('name="colorScheme"');
		expect(register).toContain('name="themeMode"');
		expect(register).toContain('treeseed:theme-change');
		expect(register).toContain('submittedFirstName');
		expect(register).toContain('data-username-status');
		expect(register).toContain('payload = result?.payload || result');
		expect(register).toContain("submitButton.disabled = status === 'taken'");

		const account = source('src/pages/app/account.astro');
		expect(account).not.toContain('account-tab-appearance');
		expect(account).not.toContain('account-panel-appearance');
		expect(account).not.toContain('data-account-api-form="appearance"');
		expect(account).not.toContain('Choose the color scheme and light/dark behavior used across TreeSeed.');
		expect(account).toContain('Attached email addresses');
		expect(account).toContain('data-email-action="add"');
		expect(account).toContain('data-email-action="verify"');
		expect(account).toContain('data-email-action="primary"');
		expect(account).toContain('data-email-action="delete"');

		const appLayout = source('src/layouts/TreeseedAppLayout.astro');
		expect(appLayout).toContain('treeseed:theme-change');
		expect(appLayout).toContain('/v1/auth/web/appearance');
		expect(appLayout).toContain('colorScheme: detail.scheme');
		expect(appLayout).toContain('themeMode: detail.mode');
	});

	it('removes page-local auth and account styling implementations', () => {
		for (const path of convertedFiles) {
			const contents = source(path);
			expect(contents, path).not.toContain('<style');
			expect(contents, path).not.toMatch(/\sstyle=/u);
			expect(contents, path).not.toMatch(/--(?:site|kc)-/u);
			expect(contents, path).not.toMatch(/(?:^|[\\s"'])ts-(?:panel|list|badge|button|password)/u);
			expect(contents, path).not.toMatch(/(?:^|[\\s"'])password-meter/u);
		}
	});

	it('keeps auth composition CSS on TreeSeed tokens', () => {
		const css = source('packages/ui/src/styles/auth.css');
		expect(css).not.toMatch(/--(?:site|kc)-/u);
		expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/iu);
	});
});
