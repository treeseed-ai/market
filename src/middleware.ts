import { defineMiddleware } from 'astro:middleware';
import { resolveEditorialPreview } from '@treeseed/core/middleware/editorial-preview';
import { loadSiteWebSession } from './lib/auth/session-store';
import { ensureLocalCloudflareRuntime } from './lib/runtime/local-cloudflare';

export const onRequest = defineMiddleware(async (context, next) => {
	await ensureLocalCloudflareRuntime(context.locals);
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
