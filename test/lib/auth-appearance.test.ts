import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	anonymousThemeCookieOptions,
	loadUserThemePreference,
	resolveAnonymousThemePreference,
	resolveUserThemePreference,
	saveUserThemePreference,
	setAnonymousThemeCookies,
	setUserThemeCookies,
	TREESEED_COLOR_SCHEME_COOKIE,
	TREESEED_THEME_MODE_COOKIE,
} from '../../src/lib/auth/appearance';
import { POST as saveAppearanceRoute } from '../../src/pages/auth/appearance';

class FakePreferenceDb {
	rows = new Map<string, { color_scheme: string; theme_mode: string; created_at: string; updated_at: string }>();

	prepare(sql: string) {
		const db = this;
		return {
			bind(...params: unknown[]) {
				return {
					async run() {
						if (/INSERT INTO user_preferences/u.test(sql)) {
							const [userId, colorScheme, themeMode, createdAt, updatedAt] = params as string[];
							const existing = db.rows.get(userId);
							db.rows.set(userId, {
								color_scheme: colorScheme,
								theme_mode: themeMode,
								created_at: existing?.created_at ?? createdAt,
								updated_at: updatedAt,
							});
						}
						return { success: true };
					},
					async first() {
						if (/FROM user_preferences/u.test(sql)) {
							return db.rows.get(String(params[0])) ?? null;
						}
						return null;
					},
				};
			},
			async run() {
				return { success: true };
			},
		};
	}
}

function createContext(url = 'https://example.com/auth/register', db?: FakePreferenceDb) {
	const values = new Map<string, string>();
	const set = vi.fn((name: string, value: string) => {
		values.set(name, value);
	});
	return {
		url: new URL(url),
		locals: {
			runtime: {
				env: db ? { SITE_DATA_DB: db } : {},
			},
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

	it('keeps the register page free of the appearance selector', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/pages/auth/register.astro'), 'utf8');
		expect(source).toContain('showAppearance={false}');
		expect(source).not.toContain('Default appearance');
		expect(source).not.toContain('includeHiddenFields={true}');
	});

	it('returns anonymous defaults when no preference database is available', async () => {
		await expect(resolveUserThemePreference(createContext() as any, 'user-1')).resolves.toEqual({
			scheme: 'fern',
			mode: 'system',
		});
	});

	it('normalizes invalid saved appearance values', async () => {
		const db = new FakePreferenceDb();
		const context = createContext('https://example.com/app/account', db);
		const preference = await saveUserThemePreference(context as any, 'user-1', {
			colorScheme: 'Fern Canopy',
			themeMode: 'sepia',
		});

		expect(preference).toEqual({ scheme: 'fern', mode: 'system' });
		await expect(loadUserThemePreference(context as any, 'user-1')).resolves.toEqual({
			scheme: 'fern',
			mode: 'system',
		});
	});

	it('upserts saved user appearance preferences', async () => {
		const db = new FakePreferenceDb();
		const context = createContext('https://example.com/app/account', db);
		await saveUserThemePreference(context as any, 'user-1', { colorScheme: 'cedar', themeMode: 'dark' });
		await saveUserThemePreference(context as any, 'user-1', { colorScheme: 'tidepool', themeMode: 'light' });

		await expect(loadUserThemePreference(context as any, 'user-1')).resolves.toEqual({
			scheme: 'tidepool',
			mode: 'light',
		});
		expect(db.rows).toHaveLength(1);
	});

	it('seeds missing authenticated preferences from anonymous cookies', async () => {
		const db = new FakePreferenceDb();
		const context = createContext('https://example.com/app/account', db);
		context.values.set(TREESEED_COLOR_SCHEME_COOKIE, 'lichen');
		context.values.set(TREESEED_THEME_MODE_COOKIE, 'dark');

		await expect(resolveUserThemePreference(context as any, 'user-1')).resolves.toEqual({
			scheme: 'lichen',
			mode: 'dark',
		});
		await expect(loadUserThemePreference(context as any, 'user-1')).resolves.toEqual({
			scheme: 'lichen',
			mode: 'dark',
		});
	});

	it('mirrors authenticated preferences into universal appearance cookies', async () => {
		const db = new FakePreferenceDb();
		const context = createContext('https://example.com/app/account', db);
		await saveUserThemePreference(context as any, 'user-1', { colorScheme: 'tidepool', themeMode: 'dark' });

		await expect(setUserThemeCookies(context as any, 'user-1')).resolves.toEqual({
			scheme: 'tidepool',
			mode: 'dark',
		});
		expect(context.set).toHaveBeenCalledWith(TREESEED_COLOR_SCHEME_COOKIE, 'tidepool', expect.any(Object));
		expect(context.set).toHaveBeenCalledWith(TREESEED_THEME_MODE_COOKIE, 'dark', expect.any(Object));
	});

	it('renders the account appearance panel wiring', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/pages/app/account.astro'), 'utf8');
		expect(source).toContain('Choose the color scheme and light/dark behavior used across TreeSeed.');
		expect(source).toContain('action="/auth/appearance"');
		expect(source).toContain('includeHiddenFields={true}');
		expect(source).toContain('schemeFieldName="colorScheme"');
		expect(source).toContain('modeFieldName="themeMode"');
	});

	it('rejects anonymous appearance saves', async () => {
		const context = {
			...createContext('https://example.com/auth/appearance'),
			redirect: (path: string, status = 302) => new Response(null, {
				status,
				headers: { location: path },
			}),
		};
		const response = await saveAppearanceRoute(context as any);

		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/sign-in?returnTo=%2Fapp%2Faccount');
	});

	it('wires successful appearance saves to redirect and cookie sync', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/pages/auth/appearance.ts'), 'utf8');
		expect(source).toContain("accountAppearanceRedirect('updated')");
		expect(source).toContain('setAnonymousThemeCookies(context, preference)');
		expect(source).toContain("response.headers.append('set-cookie', cookie)");
	});
});
