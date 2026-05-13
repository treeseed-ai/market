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

		expect(source('src/components/app/auth/AuthShell.astro')).toContain('DevWatchReload');
	});

	it('keeps register and account appearance wiring intact', () => {
		const register = source('src/pages/auth/register.astro');
		expect(register).toContain('Default appearance');
		expect(register).toContain('includeHiddenFields={true}');
		expect(register).toContain('schemeFieldName="colorScheme"');
		expect(register).toContain('modeFieldName="themeMode"');

		const account = source('src/pages/app/account.astro');
		expect(account).toContain('action="/auth/appearance"');
		expect(account).toContain('Choose the color scheme and light/dark behavior used across TreeSeed.');
		expect(account).toContain('schemeFieldName="colorScheme"');
		expect(account).toContain('modeFieldName="themeMode"');
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
		const css = source('src/styles/auth.css');
		expect(css).not.toMatch(/--(?:site|kc)-/u);
		expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/iu);
	});
});
