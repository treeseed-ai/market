import { defineMiddleware } from 'astro:middleware';
import { loadSiteWebSession } from './lib/auth/session-store';

export const onRequest = defineMiddleware(async (context, next) => {
	const webSession = await loadSiteWebSession(context);
	context.locals.auth = webSession
		? {
			session: webSession,
			principal: webSession.principal,
		}
		: null;
	return next();
});
