import type { APIContext } from 'astro';
import { D1AuthProvider } from '@treeseed/agent/api/auth/d1-provider';
import {
	betterAuthCookieFromSetCookie,
	createSiteBetterAuth,
	ensureBetterAuthD1Schema,
} from './better-auth';
import { getSiteAuthConfig } from './config';
import { createSiteWebSession } from './session-store';

export const SUPPORTED_AUTH_PROVIDERS = ['github', 'google', 'microsoft', 'apple'] as const;
export type SupportedAuthProvider = (typeof SUPPORTED_AUTH_PROVIDERS)[number];

const LOCAL_DEV_AUTH_TTL_SECONDS = 365 * 24 * 60 * 60;
const DEFAULT_AUTH_TTL_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

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
	const config = getSiteAuthConfig(context);
	const callbackURL = `${config.siteBaseUrl}/auth/callback/${provider}?returnTo=${encodeURIComponent(returnTo)}`;
	return `/api/auth/sign-in/social?provider=${encodeURIComponent(provider)}&callbackURL=${encodeURIComponent(callbackURL)}`;
}

export function createCoreAuthProvider(context: Pick<APIContext, 'locals' | 'url'>) {
	const db = context.locals.runtime?.env?.SITE_DATA_DB;
	if (!db) {
		throw new Error('SITE_DATA_DB is required to finalize authentication in the web runtime.');
	}
	const siteConfig = getSiteAuthConfig(context);
	const env = (context.locals.runtime?.env ?? {}) as Record<string, unknown>;
	const localDevAuth = env.TREESEED_LOCAL_DEV_MODE === 'cloudflare'
		|| context.url.hostname === '127.0.0.1'
		|| context.url.hostname === 'localhost';
	const defaultAccessTokenTtl = localDevAuth ? LOCAL_DEV_AUTH_TTL_SECONDS : DEFAULT_AUTH_TTL_SECONDS;
	const defaultRefreshTokenTtl = localDevAuth ? LOCAL_DEV_AUTH_TTL_SECONDS : DEFAULT_REFRESH_TTL_SECONDS;
	return new D1AuthProvider({
		name: '@treeseed/market/web',
		host: '127.0.0.1',
		port: 0,
		baseUrl: context.url.origin,
		issuer: String(env.TREESEED_API_ISSUER ?? context.url.origin).replace(/\/+$/u, ''),
		repoRoot: '.',
		projectId: String(env.TREESEED_PROJECT_ID ?? 'treeseed-market'),
		authSecret: String(env.TREESEED_API_AUTH_SECRET ?? siteConfig.betterAuthSecret),
		projectApiLabel: 'Project API Key',
		projectApiPermissions: ['sdk:execute:global', 'agent:execute:global', 'operations:execute:global'],
		webServiceId: siteConfig.apiServiceId,
		webServiceSecret: siteConfig.apiServiceSecret,
		webAssertionSecret: siteConfig.apiAssertionSecret,
		webExchangeTtlSeconds: Number(env.TREESEED_API_WEB_EXCHANGE_TTL ?? 300),
		bootstrapAdminAllowlist: String(env.TREESEED_API_BOOTSTRAP_ADMIN_ALLOWLIST ?? '')
			.split(',')
			.map((entry) => entry.trim().toLowerCase())
			.filter(Boolean),
		accessTokenTtlSeconds: Number(env.TREESEED_API_ACCESS_TOKEN_TTL ?? defaultAccessTokenTtl),
		refreshTokenTtlSeconds: Number(env.TREESEED_API_REFRESH_TOKEN_TTL ?? defaultRefreshTokenTtl),
		deviceCodeTtlSeconds: Number(env.TREESEED_API_DEVICE_CODE_TTL ?? 10 * 60),
		deviceCodePollIntervalSeconds: Number(env.TREESEED_API_DEVICE_CODE_POLL_INTERVAL ?? 5),
		providers: {
			auth: 'd1',
			agents: {
				execution: 'stub',
				queue: 'memory',
				notification: 'stub',
				repository: 'stub',
				verification: 'stub',
			},
		},
	}, { db });
}

export async function finalizeBetterAuthSession(
	context: Pick<APIContext, 'locals' | 'url' | 'cookies' | 'request'>,
	input: {
		provider: string;
		user: {
			id: string;
			email?: string | null;
			emailVerified?: boolean;
			username?: string | null;
			firstName?: string | null;
			lastName?: string | null;
			name?: string | null;
			image?: string | null;
		};
		session?: {
			id?: string;
		} | null;
		providerSubject?: string | null;
	},
) {
	const providerSubject = input.providerSubject ?? input.user.id;
	const synced = await createCoreAuthProvider(context).syncUserIdentity({
		provider: input.provider,
		providerSubject,
		email: input.user.email ?? null,
		emailVerified: Boolean(input.user.emailVerified),
		username: input.user.username ?? null,
		displayName: input.user.name ?? input.user.email ?? input.user.id,
		profile: {
			image: input.user.image ?? null,
			firstName: input.user.firstName ?? null,
			lastName: input.user.lastName ?? null,
			betterAuthSessionId: input.session?.id ?? null,
		},
	});
	const principal = {
		...synced.principal,
		metadata: {
			...(synced.principal.metadata ?? {}),
			email: input.user.email ?? null,
			username: input.user.username ?? synced.principal.metadata?.username ?? null,
			firstName: input.user.firstName ?? synced.principal.metadata?.firstName ?? null,
			lastName: input.user.lastName ?? synced.principal.metadata?.lastName ?? null,
		},
	};
	await createSiteWebSession(context, {
		userId: principal.id,
		identityId: synced.identityId,
		betterAuthSessionId: input.session?.id ?? null,
		provider: input.provider,
		providerSubject,
		email: input.user.email ?? null,
		displayName: input.user.name ?? input.user.email ?? input.user.id,
		principal,
	});
	return principal;
}

export async function finalizeCurrentBetterAuthSession(
	context: Pick<APIContext, 'locals' | 'url' | 'cookies' | 'request'>,
	provider = 'credential',
) {
	await ensureBetterAuthD1Schema(context);
	const auth = createSiteBetterAuth(context);
	const sessionData = await auth.api.getSession({
		headers: context.request.headers,
	});
	if (!sessionData?.user || !sessionData?.session) {
		return null;
	}
	const accounts = await auth.api.listUserAccounts({ headers: context.request.headers }).catch(() => []);
	const account = accounts.find((entry: any) => entry.providerId === provider);
	return finalizeBetterAuthSession(context, {
		provider,
		user: sessionData.user,
		session: sessionData.session,
		providerSubject: account?.accountId ?? sessionData.user.id,
	});
}

export async function submitBetterAuthEmailFlow(
	context: Pick<APIContext, 'locals' | 'url' | 'cookies' | 'request'>,
	path: 'sign-in/email' | 'sign-up/email',
	body: Record<string, unknown>,
	options: { finalize?: boolean } = {},
) {
	await ensureBetterAuthD1Schema(context);
	const auth = createSiteBetterAuth(context);
	const headers = new Headers(context.request.headers);
	headers.delete('content-length');
	headers.set('content-type', 'application/json');
	headers.set('accept', 'application/json');
	const invokeEmailFlow = path === 'sign-up/email' ? auth.api.signUpEmail : auth.api.signInEmail;
	let result: {
		response: unknown;
		headers?: Headers | null;
		status?: number;
	};
	try {
		if (path === 'sign-in/email') {
			const config = getSiteAuthConfig(context);
			const response = await auth.handler(new Request(`${config.betterAuthBaseUrl}/${path}`, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
			}));
			result = {
				response: await response.json().catch(() => null),
				headers: response.headers,
				status: response.status,
			};
		} else {
			result = await invokeEmailFlow({
				body,
				headers,
				returnHeaders: true,
				returnStatus: true,
			} as any) as unknown as typeof result;
		}
	} catch (error: any) {
		const errorBody = error?.body as { message?: string; code?: string } | undefined;
		return {
			ok: false as const,
			status: typeof error?.statusCode === 'number' ? error.statusCode : 500,
			error: errorBody?.message ?? error?.message ?? errorBody?.code ?? 'Authentication failed.',
			setCookies: getSetCookiesFromHeaders(error?.headers),
		};
	}
	const payload = result.response as {
		user?: {
			id: string;
			email?: string | null;
			emailVerified?: boolean;
			username?: string | null;
			firstName?: string | null;
			lastName?: string | null;
			name?: string | null;
			image?: string | null;
		};
		error?: string;
		message?: string;
	} | null;
	if ((result.status && result.status >= 400) || !payload?.user) {
		return {
			ok: false as const,
			status: result.status ?? 500,
			error: payload?.message ?? payload?.error ?? 'Authentication failed.',
			setCookies: getSetCookiesFromHeaders(result.headers),
		};
	}
	const setCookies = getSetCookiesFromHeaders(result.headers);
	if (options.finalize === false) {
		return {
			ok: true as const,
			setCookies,
			user: payload.user,
		};
	}
	const cookieHeader = setCookies.map(betterAuthCookieFromSetCookie).filter(Boolean).join('; ');
	const sessionData = await auth.api.getSession({
		headers: new Headers(cookieHeader ? { cookie: cookieHeader } : undefined),
	});
	if (!sessionData?.session) {
		return {
			ok: false as const,
			status: 401,
			error: 'Authentication requires a verified email before sign-in can finish.',
			setCookies,
		};
	}
	await finalizeBetterAuthSession(context, {
		provider: 'credential',
		user: payload.user,
		session: sessionData?.session ?? null,
	});
	return {
		ok: true as const,
		setCookies,
		user: payload.user,
	};
}

function getSetCookiesFromHeaders(headers: Headers | null | undefined) {
	return headers?.getSetCookie?.() ?? (headers?.get('set-cookie') ? [headers.get('set-cookie')!] : []);
}
