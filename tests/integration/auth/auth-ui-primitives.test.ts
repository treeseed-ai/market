import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const convertedFiles = [
	'packages/admin/src/pages/app/account/index.astro',
	'packages/admin/src/pages/app/account/sessions.astro',
	'packages/admin/src/pages/app/account/notifications.astro',
	'packages/admin/src/pages/app/account/appearance.astro',
	'packages/admin/src/pages/app/account/delete.astro',
	'packages/admin/src/pages/auth/register.astro',
	'packages/admin/src/pages/auth/sign-in.astro',
	'packages/admin/src/pages/auth/forgot-password.astro',
	'packages/admin/src/pages/auth/reset-password.astro',
	'packages/admin/src/pages/auth/check-email.astro',
	'packages/admin/src/pages/auth/confirm-email.astro',
	'packages/admin/src/pages/auth/username.astro',
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
		expect(shell).toContain('ShellFrame');
		expect(shell).toContain('SiteUserControls');
		expect(shell).toContain('helpContext');
		expect(shell).toContain('feedbackContext');
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
		expect(card).toContain('SITE_SLOGAN');
		expect(card).not.toContain('Simple controls');
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
			'packages/admin/src/pages/auth/register.astro',
			'packages/admin/src/pages/auth/sign-in.astro',
			'packages/admin/src/pages/auth/confirm-email.astro',
			'packages/admin/src/pages/auth/forgot-password.astro',
			'packages/admin/src/pages/auth/reset-password.astro',
			'packages/admin/src/pages/auth/check-email.astro',
		]) {
			expect(source(path), path).toContain('AuthCard');
			expect(source(path), path).toContain('slot="sidebarLinks"');
		}
	});

	it('keeps registration appearance wiring and removes the account-local appearance tab', () => {
		const register = source('packages/admin/src/pages/auth/register.astro');
		const registrationForm = source('packages/ui/src/astro/auth/RegistrationForm.astro');
		const passwordSetup = source('packages/ui/src/astro/forms/fields/PasswordSetupFields.astro');
		expect(register).toContain('showAppearance={false}');
		expect(register).not.toContain('Default appearance');
		expect(register).not.toContain('Create an internal login for the market control plane.');
		expect(registrationForm).toContain('name="colorScheme"');
		expect(registrationForm).toContain('name="themeMode"');
		const availabilityIsland = readFileSync(resolve(process.cwd(), 'packages/ui/src/react/progressive/AvailabilityIsland.tsx'), 'utf8');
		expect(availabilityIsland).toContain('treeseed:theme-change');
		expect(register).toContain('submittedFirstName');
		expect(registrationForm).toContain('data-availability-status="username"');
		expect(registrationForm).toContain('data-availability-status="email"');
		expect(registrationForm).toContain('cannot be changed after registration');
		expect(registrationForm).toContain('AvailabilityIsland');
		expect(availabilityIsland).toContain("form.addEventListener('submit', validateSubmit)");
		expect(registrationForm).toContain('<PasswordSetupFields');
		expect(passwordSetup).toContain('data-ts-password-match-status');
		expect(passwordSetup).toContain("confirm.dataset.matchState = matches ? 'match' : 'mismatch'");
		expect(passwordSetup).toContain("status.textContent = matches ? 'Passwords match.' : 'Passwords do not match.'");
		expect(registrationForm).not.toContain('Enter a username to check availability.');
		expect(registrationForm).not.toContain('Enter an email to check availability.');
		expect(registrationForm).not.toContain('Username is available.');
		expect(registrationForm).not.toContain('Email is available.');
		expect(availabilityIsland).toContain('isn’t available for registration.');
		const passwordMeter = source('packages/ui/src/astro/forms/fields/PasswordMeter.astro');
		expect(passwordMeter).toContain('data-astro-rerun');
		expect(passwordMeter).toContain("Symbol.for('ui.password-meter-controller')");
		expect(passwordMeter).toContain("document.addEventListener('astro:page-load', initialize)");
		expect(passwordMeter).toContain("document.addEventListener('input', handlePasswordChange)");
		expect(passwordMeter).toContain('previousController?.destroy?.()');
		expect(passwordMeter).toContain("? 'Not started'");
		expect(passwordMeter).toContain("? 'Strong'");
		expect(passwordMeter).toContain("? 'Almost there'");
		expect(passwordMeter).toContain("? 'Weak'");
		expect(passwordMeter).toContain(": 'Too weak'");
		expect(passwordMeter).toContain('role="status"');

		const account = source('packages/admin/src/pages/app/account/index.astro');
		expect(account).not.toContain('account-tab-appearance');
		expect(account).not.toContain('account-panel-appearance');
		expect(account).not.toContain('data-account-api-form="appearance"');
		expect(account).not.toContain('Choose the color scheme and light/dark behavior used across TreeSeed.');
		expect(account).toContain('AccountIdentitySettings');
		const identity = source('packages/ui/src/astro/account/AccountIdentitySettings.astro');
		expect(identity).toContain('title="Email addresses"');
		expect(identity).toContain('value="add-email"');
		expect(identity).toContain('value="resend-email"');
		expect(identity).toContain('value="primary-email"');
		expect(identity).toContain('value="delete-email"');

		const appLayout = source('packages/admin/src/layouts/AppLayout.astro');
		expect(appLayout).toContain('AppearancePersistenceIsland');
		expect(appLayout).toContain('/v1/auth/web/appearance');
		const appearanceIsland = source('packages/ui/src/react/progressive/AppearancePersistenceIsland.tsx');
		expect(appearanceIsland).toContain('colorScheme: detail.scheme');
		expect(appearanceIsland).toContain('themeMode: detail.mode');
	});

	it('keeps the sign-in form focused on authentication controls', () => {
		const signIn = source('packages/admin/src/pages/auth/sign-in.astro');

		expect(signIn).toContain('title="Sign in"');
		expect(signIn).not.toContain(
			'Use your account email or username and password, or continue with a configured provider.',
		);
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
