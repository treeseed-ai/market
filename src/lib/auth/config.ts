import type { APIContext } from 'astro';
import type { CloudflareRuntime } from '@treeseed/core/types/cloudflare';

export const WEB_SESSION_COOKIE = '__Host-ts_session';
export const WEB_CSRF_COOKIE = '__Host-ts_csrf';
const DEFAULT_WEB_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type RuntimeEnv = CloudflareRuntime['env'];

function runtimeEnv(context?: Pick<APIContext, 'locals'>) {
	return ((context?.locals as App.Locals | undefined)?.runtime as CloudflareRuntime | undefined)?.env;
}

function envValue(name: string, env?: RuntimeEnv) {
	const runtime = env as Record<string, unknown> | undefined;
	const runtimeValue = runtime?.[name];
	if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
		return runtimeValue.trim();
	}
	const processValue = process.env[name];
	return typeof processValue === 'string' && processValue.trim() ? processValue.trim() : '';
}

function parseIntEnv(name: string, fallback: number, env?: RuntimeEnv) {
	const value = envValue(name, env);
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function getSiteAuthConfig(context?: Pick<APIContext, 'locals'>) {
	const env = runtimeEnv(context);
	return {
		betterAuthSecret: envValue('TREESEED_BETTER_AUTH_SECRET', env) || 'treeseed-better-auth-dev-secret',
		betterAuthBaseUrl: envValue('BETTER_AUTH_URL', env) || envValue('TREESEED_SITE_URL', env) || 'http://127.0.0.1:4321',
		apiBaseUrl: envValue('TREESEED_API_BASE_URL', env) || 'http://127.0.0.1:3000',
		apiServiceId: envValue('TREESEED_WEB_SERVICE_ID', env) || 'web',
		apiServiceSecret: envValue('TREESEED_WEB_SERVICE_SECRET', env) || 'treeseed-web-service-dev-secret',
		apiAssertionSecret: envValue('TREESEED_WEB_ASSERTION_SECRET', env) || envValue('TREESEED_API_WEB_ASSERTION_SECRET', env) || 'treeseed-web-assertion-dev-secret',
		csrfSecret: envValue('TREESEED_WEB_CSRF_SECRET', env) || 'treeseed-web-csrf-dev-secret',
		sessionTtlSeconds: parseIntEnv('TREESEED_WEB_SESSION_TTL', DEFAULT_WEB_SESSION_TTL_SECONDS, env),
		providers: {
			github: {
				clientId: envValue('TREESEED_AUTH_GITHUB_CLIENT_ID', env),
				clientSecret: envValue('TREESEED_AUTH_GITHUB_CLIENT_SECRET', env),
			},
			google: {
				clientId: envValue('TREESEED_AUTH_GOOGLE_CLIENT_ID', env),
				clientSecret: envValue('TREESEED_AUTH_GOOGLE_CLIENT_SECRET', env),
			},
			microsoft: {
				clientId: envValue('TREESEED_AUTH_MICROSOFT_CLIENT_ID', env),
				clientSecret: envValue('TREESEED_AUTH_MICROSOFT_CLIENT_SECRET', env),
			},
			apple: {
				clientId: envValue('TREESEED_AUTH_APPLE_CLIENT_ID', env),
				clientSecret: envValue('TREESEED_AUTH_APPLE_CLIENT_SECRET', env),
			},
		},
	};
}

export function webCookieOptions(requestUrl: URL, maxAge: number) {
	return {
		httpOnly: true,
		path: '/',
		sameSite: 'lax' as const,
		secure: requestUrl.protocol === 'https:',
		maxAge,
	};
}

export function csrfCookieOptions(requestUrl: URL, maxAge: number) {
	return {
		httpOnly: false,
		path: '/',
		sameSite: 'lax' as const,
		secure: requestUrl.protocol === 'https:',
		maxAge,
	};
}
