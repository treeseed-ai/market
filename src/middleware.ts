import { defineMiddleware } from 'astro:middleware';
import { resolveEditorialPreview } from '@treeseed/core/middleware/editorial-preview';
import { getSiteAuthConfig, localAuthCanonicalRedirectUrl } from './lib/auth/config';
import { loadSiteWebSession } from './lib/auth/session-store';
import { ensureLocalCloudflareRuntime } from './lib/runtime/local-cloudflare';

export const onRequest = defineMiddleware(async (context, next) => {
	await ensureLocalCloudflareRuntime(context.locals);
	const config = getSiteAuthConfig(context);
	const canonicalLocalUrl = localAuthCanonicalRedirectUrl(context.url, config.siteBaseUrl);
	if (canonicalLocalUrl && ['GET', 'HEAD'].includes(context.request.method.toUpperCase())) {
		return context.redirect(canonicalLocalUrl.toString(), 308);
	}
	const webSession = await loadSiteWebSession(context);
	context.locals.auth = webSession
		? {
			session: webSession,
			principal: webSession.principal,
		}
		: null;
	resolveEditorialPreview(context);
	return next();
});
