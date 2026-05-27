import {
	normalizeThemePreference,
	type ThemePreference,
} from '../../../packages/core/src/utils/theme.ts';
import type { APIContext } from 'astro';

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

function appearanceFromPrincipal(context: Pick<AppearanceContext, 'locals'>): ThemePreference | null {
	const principal = context.locals.auth?.principal;
	const appearance = principal?.metadata?.appearance;
	if (!appearance || typeof appearance !== 'object') return null;
	return normalizeThemePreference(appearance);
}

export function themePreferenceFromPrincipal(principal: { metadata?: Record<string, unknown> | null } | null | undefined): ThemePreference | null {
	const appearance = principal?.metadata?.appearance;
	if (!appearance || typeof appearance !== 'object') return null;
	return normalizeThemePreference(appearance);
}

export function setPrincipalThemeCookies(
	context: AnonymousAppearanceContext,
	principal: { metadata?: Record<string, unknown> | null } | null | undefined,
): ThemePreference | null {
	const preference = themePreferenceFromPrincipal(principal);
	if (!preference) return null;
	setAnonymousThemeCookies(context, preference);
	return preference;
}

export async function resolveAuthenticatedThemePreference(context: AppearanceContext): Promise<ThemePreference> {
	return appearanceFromPrincipal(context) ?? resolveAnonymousThemePreference(context);
}

export async function resolveUserThemePreference(
	context: AppearanceContext,
	userId: string,
): Promise<ThemePreference> {
	const principal = context.locals.auth?.principal;
	if (principal?.id === userId) {
		return appearanceFromPrincipal(context) ?? resolveAnonymousThemePreference(context);
	}
	return resolveAnonymousThemePreference(context);
}

export async function setUserThemeCookies(
	context: AppearanceContext,
	userId: string,
): Promise<ThemePreference> {
	const preference = await resolveUserThemePreference(context, userId);
	setAnonymousThemeCookies(context, preference);
	return preference;
}
