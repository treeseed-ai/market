import {
	normalizeThemePreference,
	type ThemePreference,
} from '../../../packages/core/src/utils/theme.ts';
import type { APIContext } from 'astro';
import type { D1DatabaseLike } from '@treeseed/core/types/cloudflare';
import { createSiteBetterAuth, ensureBetterAuthD1Schema } from './better-auth';

export const TREESEED_COLOR_SCHEME_COOKIE = 'treeseed_color_scheme';
export const TREESEED_THEME_MODE_COOKIE = 'treeseed_theme_mode';

export type AnonymousAppearanceContext = {
	url: URL;
	cookies: {
		get(name: string): { value?: string } | undefined;
		set(name: string, value: string, options: Record<string, unknown>): void;
		headers?(): Iterable<string>;
	};
};

export type AppearanceContext = AnonymousAppearanceContext & Pick<APIContext, 'locals' | 'request'>;

declare global {
	var __treeseedUserPreferencesSchemaReady: WeakMap<D1DatabaseLike, Promise<void>> | undefined;
}

const USER_PREFERENCES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  color_scheme TEXT NOT NULL DEFAULT 'fern',
  theme_mode TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES better_auth_user(id) ON DELETE CASCADE
);
`;

function runtimeDb(context: Pick<APIContext, 'locals'>) {
	return context.locals.runtime?.env?.SITE_DATA_DB ?? null;
}

function splitSqlStatements(sql: string) {
	return sql
		.split(';')
		.map((statement) => statement.trim())
		.filter(Boolean);
}

async function runD1Schema(db: D1DatabaseLike, sql: string) {
	for (const statement of splitSqlStatements(sql)) {
		await db.prepare(statement).run();
	}
}

function hasAnonymousThemeCookie(context: AnonymousAppearanceContext) {
	return Boolean(
		context.cookies.get(TREESEED_COLOR_SCHEME_COOKIE)?.value
		|| context.cookies.get(TREESEED_THEME_MODE_COOKIE)?.value,
	);
}

export function resolveAnonymousThemePreference(
	context: AnonymousAppearanceContext,
	form?: FormData,
): ThemePreference {
	return normalizeThemePreference({
		scheme: form?.get('colorScheme')
			?? context.url.searchParams.get('colorScheme')
			?? context.cookies.get(TREESEED_COLOR_SCHEME_COOKIE)?.value,
		mode: form?.get('themeMode')
			?? context.url.searchParams.get('themeMode')
			?? context.cookies.get(TREESEED_THEME_MODE_COOKIE)?.value,
	});
}

export function anonymousThemeCookieOptions(context: Pick<AnonymousAppearanceContext, 'url'>) {
	return {
		path: '/',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365,
		secure: context.url.protocol === 'https:',
	};
}

export function setAnonymousThemeCookies(
	context: AnonymousAppearanceContext,
	preference: ThemePreference,
) {
	const options = anonymousThemeCookieOptions(context);
	context.cookies.set(TREESEED_COLOR_SCHEME_COOKIE, preference.scheme, options);
	context.cookies.set(TREESEED_THEME_MODE_COOKIE, preference.mode, options);
}

export async function ensureUserPreferencesSchema(context: Pick<APIContext, 'locals'>) {
	const db = runtimeDb(context);
	if (!db?.prepare) return null;
	const schemaReady = globalThis.__treeseedUserPreferencesSchemaReady ??= new WeakMap();
	let ready = schemaReady.get(db);
	if (!ready) {
		ready = runD1Schema(db, USER_PREFERENCES_TABLE_SQL);
		schemaReady.set(db, ready);
	}
	await ready;
	return db;
}

export async function loadUserThemePreference(
	context: Pick<APIContext, 'locals'>,
	userId: string | null | undefined,
): Promise<ThemePreference | null> {
	if (!userId) return null;
	const db = await ensureUserPreferencesSchema(context);
	if (!db) return null;
	const row = await db.prepare(`
		SELECT color_scheme, theme_mode
		FROM user_preferences
		WHERE user_id = ?
		LIMIT 1
	`).bind(userId).first<{ color_scheme: string; theme_mode: string }>();
	if (!row) return null;
	return normalizeThemePreference({
		colorScheme: row.color_scheme,
		themeMode: row.theme_mode,
	});
}

export async function saveUserThemePreference(
	context: Pick<APIContext, 'locals'>,
	userId: string,
	input: unknown,
) {
	const preference = normalizeThemePreference(input);
	const db = await ensureUserPreferencesSchema(context);
	if (!db) {
		throw new Error('SITE_DATA_DB is required to persist user appearance preferences.');
	}
	const now = new Date().toISOString();
	await db.prepare(`
		INSERT INTO user_preferences (user_id, color_scheme, theme_mode, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET
			color_scheme = excluded.color_scheme,
			theme_mode = excluded.theme_mode,
			updated_at = excluded.updated_at
	`).bind(userId, preference.scheme, preference.mode, now, now).run();
	return preference;
}

async function currentBetterAuthUserId(context: AppearanceContext) {
	await ensureBetterAuthD1Schema(context);
	const auth = createSiteBetterAuth(context);
	const sessionData = await auth.api.getSession({ headers: context.request.headers });
	return typeof sessionData?.user?.id === 'string' ? sessionData.user.id : null;
}

export async function resolveAuthenticatedThemePreference(context: AppearanceContext): Promise<ThemePreference> {
	if (!context.locals.auth?.principal) {
		return resolveAnonymousThemePreference(context);
	}
	const userId = await currentBetterAuthUserId(context).catch(() => null);
	if (!userId) {
		return resolveAnonymousThemePreference(context);
	}
	return resolveUserThemePreference(context, userId);
}

export async function resolveUserThemePreference(
	context: AppearanceContext,
	userId: string,
): Promise<ThemePreference> {
	const stored = await loadUserThemePreference(context, userId);
	if (stored) return stored;
	const anonymousPreference = resolveAnonymousThemePreference(context);
	if (hasAnonymousThemeCookie(context)) {
		await saveUserThemePreference(context, userId, anonymousPreference).catch(() => null);
	}
	return anonymousPreference;
}

export async function setUserThemeCookies(
	context: AppearanceContext,
	userId: string,
): Promise<ThemePreference> {
	const preference = await resolveUserThemePreference(context, userId);
	setAnonymousThemeCookies(context, preference);
	return preference;
}

export async function setCurrentUserThemeCookies(
	context: AppearanceContext,
): Promise<ThemePreference | null> {
	const userId = await currentBetterAuthUserId(context).catch(() => null);
	if (!userId) return null;
	return setUserThemeCookies(context, userId);
}

export async function saveCurrentUserThemePreference(context: AppearanceContext, input: unknown) {
	const userId = await currentBetterAuthUserId(context);
	if (!userId) return null;
	return saveUserThemePreference(context, userId, input);
}
