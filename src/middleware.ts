import { defineMiddleware } from 'astro:middleware';
import { resolveEditorialPreview } from '@treeseed/core/middleware/editorial-preview';
import { getSiteAuthConfig, localAuthCanonicalRedirectUrl } from './lib/auth/config';
import { apiAccessTokenFromCookies, clearApiAccessTokenCookie, resolveApiBaseUrl } from './lib/market/api-client';
import { ensureLocalCloudflareRuntime } from './lib/runtime/local-cloudflare';

const DEV_RESET_COOKIE = 'ts_market_dev_reset';

function runtimeEnv(context: any) {
	return context.locals?.runtime?.env as Record<string, unknown> | undefined;
}

function envValue(context: any, name: string) {
	const runtimeValue = runtimeEnv(context)?.[name];
	if (typeof runtimeValue === 'string' && runtimeValue.trim()) return runtimeValue.trim();
	const processValue = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
	return typeof processValue === 'string' && processValue.trim() ? processValue.trim() : '';
}

function applyLocalDevResetCookieBoundary(context: any) {
	const resetId = envValue(context, 'TREESEED_DEV_RESET_ID');
	if (!resetId) return false;
	if (context.cookies.get(DEV_RESET_COOKIE)?.value === resetId) return false;
	clearApiAccessTokenCookie(context);
	context.cookies.set(DEV_RESET_COOKIE, resetId, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: context.url.protocol === 'https:',
		maxAge: 30 * 24 * 60 * 60,
	});
	return true;
}

async function loadApiBackedWebSession(context: any) {
	const token = apiAccessTokenFromCookies(context);
	if (!token) return null;
	const response = await fetch(`${resolveApiBaseUrl(context.locals)}/v1/me`, {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${token}`,
		},
	}).catch(() => null);
	if (!response?.ok) return null;
	const envelope = await response.json().catch(() => null);
	const payload = envelope?.payload;
	if (!payload?.principal) return null;
	return {
		id: payload.sessionId ?? payload.principal?.metadata?.sessionId ?? 'api-session',
		userId: payload.userId ?? payload.principal.id,
		email: payload.email ?? payload.principal.email ?? null,
		displayName: payload.displayName ?? payload.principal.displayName ?? null,
		expiresAt: payload.expiresAt ?? null,
		principal: payload.principal,
	};
}

export const onRequest = defineMiddleware(async (context, next) => {
	await ensureLocalCloudflareRuntime(context.locals);
	const config = getSiteAuthConfig(context);
	const resetClearedAuthCookie = applyLocalDevResetCookieBoundary(context);
	const canonicalLocalUrl = localAuthCanonicalRedirectUrl(context.url, config.siteBaseUrl);
	if (canonicalLocalUrl && ['GET', 'HEAD'].includes(context.request.method.toUpperCase())) {
		const response = context.redirect(canonicalLocalUrl.toString(), 308);
		if (resetClearedAuthCookie) {
			for (const cookie of context.cookies.headers()) {
				response.headers.append('set-cookie', cookie);
			}
		}
		return response;
	}
	const webSession = resetClearedAuthCookie ? null : await loadApiBackedWebSession(context);
	context.locals.auth = webSession
		? {
			session: webSession,
			principal: webSession.principal,
		}
		: null;
	resolveEditorialPreview(context);
	const response = await next();
	if (resetClearedAuthCookie) {
		for (const cookie of context.cookies.headers()) {
			response.headers.append('set-cookie', cookie);
		}
	}
	return response;
});
