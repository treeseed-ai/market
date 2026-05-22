import { defineMiddleware } from 'astro:middleware';
import { resolveEditorialPreview } from '@treeseed/core/middleware/editorial-preview';
import { getSiteAuthConfig, localAuthCanonicalRedirectUrl } from './lib/auth/config';
import { apiAccessTokenFromCookies, resolveMarketApiBaseUrl } from './lib/market/api-client';
import { ensureLocalCloudflareRuntime } from './lib/runtime/local-cloudflare';

async function loadApiBackedWebSession(context: any) {
	const token = apiAccessTokenFromCookies(context);
	if (!token) return null;
	const response = await fetch(`${resolveMarketApiBaseUrl(context.locals)}/v1/me`, {
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
	const canonicalLocalUrl = localAuthCanonicalRedirectUrl(context.url, config.siteBaseUrl);
	if (canonicalLocalUrl && ['GET', 'HEAD'].includes(context.request.method.toUpperCase())) {
		return context.redirect(canonicalLocalUrl.toString(), 308);
	}
	const webSession = await loadApiBackedWebSession(context);
	context.locals.auth = webSession
		? {
			session: webSession,
			principal: webSession.principal,
		}
		: null;
	resolveEditorialPreview(context);
	return next();
});
