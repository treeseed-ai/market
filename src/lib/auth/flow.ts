import type { APIContext } from 'astro';
import { getSiteAuthConfig } from './config';
import { resolveMarketApiBaseUrl, setApiAccessTokenCookie } from '../market/api-client';

export const SUPPORTED_AUTH_PROVIDERS = ['github', 'google', 'microsoft', 'apple'] as const;
export type SupportedAuthProvider = (typeof SUPPORTED_AUTH_PROVIDERS)[number];

const DEFAULT_AUTH_TTL_SECONDS = 15 * 60;

export function isSupportedAuthProvider(value: string | null | undefined): value is SupportedAuthProvider {
	return Boolean(value && (SUPPORTED_AUTH_PROVIDERS as readonly string[]).includes(value));
}

export function normalizeReturnTo(context: Pick<APIContext, 'url'>) {
	const value = context.url.searchParams.get('returnTo') ?? context.url.searchParams.get('next') ?? '/app/';
	return value.startsWith('/') && !value.startsWith('//') ? value : '/app/';
}

type RedirectStatus = 300 | 301 | 302 | 303 | 304 | 307 | 308;

export function redirectAuthenticatedToApp(context: Pick<APIContext, 'locals'> & { redirect: (path: string, status?: RedirectStatus) => Response }) {
	return context.locals.auth?.principal ? context.redirect('/app/', 302) : null;
}

export function authProviderCapabilities(context: Pick<APIContext, 'locals'>) {
	const config = getSiteAuthConfig(context);
	const providerConfig = config.providers;
	return {
		mode: config.authMode,
		internal: {
			enabled: config.internalAuthEnabled,
			signup: config.internalSignup,
			signupEnabled: config.internalSignupEnabled,
		},
		providers: SUPPORTED_AUTH_PROVIDERS.map((id) => ({
			id,
			enabled: config.providersEnabled && Boolean(providerConfig[id].clientId && providerConfig[id].clientSecret),
		})),
	};
}

export function providerSignInPath(context: Pick<APIContext, 'locals' | 'url'>, provider: SupportedAuthProvider, returnTo = normalizeReturnTo(context)) {
	const target = new URL(`/v1/auth/oauth/${provider}/start`, resolveMarketApiBaseUrl(context.locals));
	target.searchParams.set('returnTo', returnTo);
	target.searchParams.set('callbackUrl', `${context.url.origin}/auth/callback/${provider}?returnTo=${encodeURIComponent(returnTo)}`);
	return target.toString();
}

export async function submitMarketEmailAuthFlow(
	context: Pick<APIContext, 'locals' | 'url' | 'cookies' | 'request'>,
	path: 'sign-in/email' | 'sign-up/email',
	body: Record<string, unknown>,
	options: { finalize?: boolean } = {},
) {
	const endpoint = path === 'sign-up/email' ? '/v1/auth/web/sign-up' : '/v1/auth/web/sign-in';
	const headers = new Headers({ accept: 'application/json', 'content-type': 'application/json' });
	try {
		const response = await fetch(`${resolveMarketApiBaseUrl(context.locals)}${endpoint}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});
		const envelope = await response.json().catch(() => null);
		if (!response.ok || envelope?.ok === false || !envelope?.payload?.accessToken) {
			return {
				ok: false as const,
				status: response.status,
				error: envelope?.error ?? 'Authentication failed.',
				setCookies: [],
			};
		}
		if (options.finalize !== false) {
			setApiAccessTokenCookie(context, envelope.payload.accessToken, Number(envelope.payload.expiresInSeconds ?? DEFAULT_AUTH_TTL_SECONDS));
		}
		return {
			ok: true as const,
			setCookies: [],
			user: {
				id: envelope.payload.principal?.id,
				email: envelope.payload.principal?.metadata?.email ?? body.email ?? null,
				username: envelope.payload.principal?.metadata?.username ?? body.username ?? null,
				name: envelope.payload.principal?.displayName ?? body.name ?? body.email ?? null,
			},
			session: envelope.payload,
		};
	} catch (error: any) {
		const errorBody = error?.body as { message?: string; code?: string } | undefined;
		return {
			ok: false as const,
			status: typeof error?.statusCode === 'number' ? error.statusCode : 500,
			error: errorBody?.message ?? error?.message ?? errorBody?.code ?? 'Authentication failed.',
			setCookies: [],
		};
	}
}
