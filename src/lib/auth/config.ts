import type { APIContext } from 'astro';
import type { CloudflareRuntime } from '@treeseed/core/types/cloudflare';

export const WEB_SESSION_COOKIE = 'ts_session';
export const WEB_CSRF_COOKIE = 'ts_csrf';
const DEFAULT_WEB_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_EMAIL_TOKEN_TTL_SECONDS = 60 * 60;
const AUTH_MODES = new Set(['internal-first', 'internal-only', 'providers-only']);
const INTERNAL_SIGNUP_MODES = new Set(['open', 'invite', 'admin']);

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

function firstEnvValue(env: RuntimeEnv | undefined, ...names: string[]) {
	for (const name of names) {
		const value = envValue(name, env);
		if (value) return value;
	}
	return '';
}

function parseIntEnv(name: string, fallback: number, env?: RuntimeEnv) {
	const value = envValue(name, env);
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBooleanEnv(name: string, fallback: boolean, env?: RuntimeEnv) {
	const value = envValue(name, env).toLowerCase();
	if (!value) return fallback;
	return ['1', 'true', 'yes', 'on'].includes(value)
		? true
		: ['0', 'false', 'no', 'off'].includes(value)
			? false
			: fallback;
}

function parseEnumEnv<T extends string>(name: string, allowed: Set<T>, fallback: T, env?: RuntimeEnv) {
	const value = envValue(name, env) as T;
	return allowed.has(value) ? value : fallback;
}

export function getSiteAuthConfig(context?: Pick<APIContext, 'locals'>) {
	const env = runtimeEnv(context);
	const authMode = parseEnumEnv('TREESEED_AUTH_MODE', AUTH_MODES, 'internal-first', env);
	const internalSignup = parseEnumEnv('TREESEED_AUTH_INTERNAL_SIGNUP', INTERNAL_SIGNUP_MODES, 'open', env);
	const explicitAuthSmtpHost = firstEnvValue(env, 'TREESEED_AUTH_SMTP_HOST', 'TREESEED_SMTP_HOST');
	const mailpitHost = envValue('TREESEED_MAILPIT_SMTP_HOST', env);
	const useMailpit = parseBooleanEnv(
		'TREESEED_AUTH_LOCAL_USE_MAILPIT',
		parseBooleanEnv('TREESEED_FORMS_LOCAL_USE_MAILPIT', Boolean(mailpitHost && !explicitAuthSmtpHost), env),
		env,
	);
	return {
		authMode,
		internalAuthEnabled: authMode !== 'providers-only',
		internalSignup,
		internalSignupEnabled: authMode !== 'providers-only' && internalSignup === 'open',
		providersEnabled: authMode !== 'internal-only',
		emailLinkingEnabled: parseBooleanEnv('TREESEED_AUTH_EMAIL_LINKING', true, env),
		allowMemoryAuthDb: parseBooleanEnv('TREESEED_AUTH_ALLOW_MEMORY_DB', false, env),
		betterAuthSecret: envValue('TREESEED_BETTER_AUTH_SECRET', env) || 'treeseed-local-better-auth-secret-minimum-32-characters',
		betterAuthBaseUrl: envValue('BETTER_AUTH_URL', env) || envValue('TREESEED_SITE_URL', env) || 'http://127.0.0.1:4321',
		apiServiceId: envValue('TREESEED_WEB_SERVICE_ID', env) || 'web',
		apiServiceSecret: envValue('TREESEED_WEB_SERVICE_SECRET', env) || 'treeseed-web-service-dev-secret',
		apiAssertionSecret: envValue('TREESEED_WEB_ASSERTION_SECRET', env) || envValue('TREESEED_API_WEB_ASSERTION_SECRET', env) || 'treeseed-web-assertion-dev-secret',
		csrfSecret: envValue('TREESEED_WEB_CSRF_SECRET', env) || 'treeseed-web-csrf-dev-secret',
		sessionTtlSeconds: parseIntEnv('TREESEED_WEB_SESSION_TTL', DEFAULT_WEB_SESSION_TTL_SECONDS, env),
		passwordResetTtlSeconds: parseIntEnv('TREESEED_AUTH_PASSWORD_RESET_TTL', DEFAULT_EMAIL_TOKEN_TTL_SECONDS, env),
		emailVerificationTtlSeconds: parseIntEnv('TREESEED_AUTH_EMAIL_VERIFICATION_TTL', DEFAULT_EMAIL_TOKEN_TTL_SECONDS, env),
		authEmail: {
			useMailpit,
			host: useMailpit
				? (mailpitHost || explicitAuthSmtpHost || '127.0.0.1')
				: explicitAuthSmtpHost,
			port: useMailpit
				? parseIntEnv('TREESEED_MAILPIT_SMTP_PORT', parseIntEnv('TREESEED_AUTH_SMTP_PORT', parseIntEnv('TREESEED_SMTP_PORT', 1025, env), env), env)
				: parseIntEnv('TREESEED_AUTH_SMTP_PORT', parseIntEnv('TREESEED_SMTP_PORT', 465, env), env),
			username: useMailpit ? '' : firstEnvValue(env, 'TREESEED_AUTH_SMTP_USERNAME', 'TREESEED_SMTP_USERNAME'),
			password: useMailpit ? '' : firstEnvValue(env, 'TREESEED_AUTH_SMTP_PASSWORD', 'TREESEED_SMTP_PASSWORD'),
			from: firstEnvValue(env, 'TREESEED_AUTH_EMAIL_FROM', 'TREESEED_SMTP_FROM') || (useMailpit ? 'Treeseed Market <auth@treeseed.local>' : ''),
			replyTo: firstEnvValue(env, 'TREESEED_AUTH_EMAIL_REPLY_TO', 'TREESEED_SMTP_REPLY_TO'),
		},
		providers: {
			github: {
				clientId: firstEnvValue(env, 'TREESEED_AUTH_GITHUB_CLIENT_ID', 'TREESEED_GITHUB_CLIENT_ID'),
				clientSecret: firstEnvValue(env, 'TREESEED_AUTH_GITHUB_CLIENT_SECRET', 'TREESEED_GITHUB_CLIENT_SECRET'),
			},
			google: {
				clientId: firstEnvValue(env, 'TREESEED_AUTH_GOOGLE_CLIENT_ID', 'TREESEED_GOOGLE_CLIENT_ID'),
				clientSecret: firstEnvValue(env, 'TREESEED_AUTH_GOOGLE_CLIENT_SECRET', 'TREESEED_GOOGLE_CLIENT_SECRET'),
			},
			microsoft: {
				clientId: firstEnvValue(env, 'TREESEED_AUTH_MICROSOFT_CLIENT_ID', 'TREESEED_MICROSOFT_CLIENT_ID'),
				clientSecret: firstEnvValue(env, 'TREESEED_AUTH_MICROSOFT_CLIENT_SECRET', 'TREESEED_MICROSOFT_CLIENT_SECRET'),
			},
			apple: {
				clientId: firstEnvValue(env, 'TREESEED_AUTH_APPLE_CLIENT_ID', 'TREESEED_APPLE_CLIENT_ID'),
				clientSecret: firstEnvValue(env, 'TREESEED_AUTH_APPLE_CLIENT_SECRET', 'TREESEED_APPLE_CLIENT_SECRET'),
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
