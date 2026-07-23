import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	anonymousThemeCookieOptions,
	resolveAnonymousThemePreference,
	resolveUserThemePreference,
	setAnonymousThemeCookies,
	setUserThemeCookies,
	TREESEED_COLOR_SCHEME_COOKIE,
	TREESEED_THEME_MODE_COOKIE,
} from '../../../packages/admin/src/lib/auth/appearance';

function createContext(url = 'https://example.com/auth/register') {
	const values = new Map<string, string>();
	const set = vi.fn((name: string, value: string) => {
		values.set(name, value);
	});
	return {
		url: new URL(url),
		locals: {
			runtime: { env: {} },
			auth: null,
		},
		request: new Request(url),
		cookies: {
			get: (name: string) => {
				const value = values.get(name);
				return value ? { value } : undefined;
			},
			set,
		},
		values,
		set,
	};
}

function withPrincipal(context: ReturnType<typeof createContext>, metadata: Record<string, unknown> = {}) {
	context.locals.auth = {
		principal: {
			id: 'user-1',
			displayName: 'User One',
			metadata,
		},
	} as any;
	return context;
}

describe('anonymous auth appearance', () => {
	it('prefers submitted register appearance over cookies', () => {
		const context = createContext();
		context.values.set(TREESEED_COLOR_SCHEME_COOKIE, 'fern');
		context.values.set(TREESEED_THEME_MODE_COOKIE, 'system');
		const form = new FormData();
		form.set('colorScheme', 'cedar');
		form.set('themeMode', 'dark');

		expect(resolveAnonymousThemePreference(context, form)).toEqual({
			scheme: 'cedar',
			mode: 'dark',
		});
	});

	it('uses query appearance before cookies for validation retries', () => {
		const context = createContext('https://example.com/auth/register?colorScheme=lichen&themeMode=light');
		context.values.set(TREESEED_COLOR_SCHEME_COOKIE, 'fern');
		context.values.set(TREESEED_THEME_MODE_COOKIE, 'system');

		expect(resolveAnonymousThemePreference(context)).toEqual({
			scheme: 'lichen',
			mode: 'light',
		});
	});

	it('sets long lived lax cookies for the selected appearance', () => {
		const context = createContext();
		setAnonymousThemeCookies(context, { scheme: 'tidepool', mode: 'system' });

		expect(context.set).toHaveBeenCalledWith(TREESEED_COLOR_SCHEME_COOKIE, 'tidepool', {
			path: '/',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365,
			secure: true,
		});
		expect(context.set).toHaveBeenCalledWith(TREESEED_THEME_MODE_COOKIE, 'system', {
			path: '/',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365,
			secure: true,
		});
	});

	it('only marks anonymous appearance cookies secure over https', () => {
		expect(anonymousThemeCookieOptions(createContext('http://localhost:4321/auth/register'))).toMatchObject({
			secure: false,
		});
	});

	it('locks the selected auth appearance into registration payload fields', () => {
		const route = readFileSync(resolve(process.cwd(), 'packages/admin/src/pages/auth/register.astro'), 'utf8');
		const form = readFileSync(resolve(process.cwd(), 'packages/ui/src/astro/auth/RegistrationForm.astro'), 'utf8');
		expect(route).not.toContain('Default appearance');
		expect(route).toContain('appearance,');
		expect(form).toContain('name="colorScheme"');
		expect(form).toContain('name="themeMode"');
		expect(form).toContain('data-auth-theme-scheme-field');
		expect(form).toContain('treeseed:theme-change');
	});

	it('returns anonymous defaults when no market user preference is available', async () => {
		await expect(resolveUserThemePreference(createContext() as any, 'user-1')).resolves.toEqual({
			scheme: 'fern',
			mode: 'system',
		});
	});

	it('resolves market user appearance from principal metadata', async () => {
		const context = withPrincipal(createContext('https://example.com/app/account'), {
			appearance: { scheme: 'tidepool', mode: 'dark' },
		});

		await expect(resolveUserThemePreference(context as any, 'user-1')).resolves.toEqual({
			scheme: 'tidepool',
			mode: 'dark',
		});
	});

	it('mirrors authenticated market metadata preferences into universal appearance cookies', async () => {
		const context = withPrincipal(createContext('https://example.com/app/account'), {
			appearance: { scheme: 'tidepool', mode: 'dark' },
		});

		await expect(setUserThemeCookies(context as any, 'user-1')).resolves.toEqual({
			scheme: 'tidepool',
			mode: 'dark',
		});
		expect(context.set).toHaveBeenCalledWith(TREESEED_COLOR_SCHEME_COOKIE, 'tidepool', expect.any(Object));
		expect(context.set).toHaveBeenCalledWith(TREESEED_THEME_MODE_COOKIE, 'dark', expect.any(Object));
	});

	it('keeps authenticated appearance changes on the shell control instead of an account tab', () => {
		const source = readFileSync(resolve(process.cwd(), 'packages/admin/src/pages/app/account/appearance.astro'), 'utf8');
		expect(source).not.toContain('account-panel-appearance');
		expect(source).not.toContain('data-account-api-form="appearance"');
		expect(source).not.toContain('Choose the color scheme and light/dark behavior used across TreeSeed.');
		expect(source).toContain('PersonalThemeManager');

		const layout = readFileSync(resolve(process.cwd(), 'packages/admin/src/layouts/TreeseedAppLayout.astro'), 'utf8');
		expect(layout).toContain('treeseed:theme-change');
		expect(layout).toContain('/v1/auth/web/appearance');
	});

	it('only persists explicit theme changes to the authenticated appearance API', () => {
		const selector = readFileSync(resolve(process.cwd(), 'packages/ui/src/astro/theme/ThemeSelector.astro'), 'utf8');
		expect(selector).toContain('persist }');

		const layout = readFileSync(resolve(process.cwd(), 'packages/admin/src/layouts/TreeseedAppLayout.astro'), 'utf8');
		expect(layout).toContain('detail.persist !== true');
		expect(layout).toContain('colorScheme: detail.scheme');
		expect(layout).toContain('themeMode: detail.mode');
	});
});
