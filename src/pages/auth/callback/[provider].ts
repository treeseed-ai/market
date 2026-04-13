import type { APIRoute } from 'astro';
import { createSiteBetterAuth } from '../../../lib/auth/better-auth';
import { callRailwayApi } from '../../../lib/auth/api';
import { createSiteWebSession } from '../../../lib/auth/session-store';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const auth = createSiteBetterAuth(context);
	const sessionData = await auth.api.getSession({
		headers: context.request.headers,
	});
	if (!sessionData?.user || !sessionData?.session) {
		return context.redirect('/auth/sign-in?error=session_missing', 302);
	}
	const provider = context.params.provider ?? 'unknown';
	const syncedResponse = await callRailwayApi(context, '/internal/auth/web/sync-user', {
		method: 'POST',
		json: {
			provider,
			providerSubject: sessionData.user.id,
			email: sessionData.user.email ?? null,
			emailVerified: Boolean(sessionData.user.emailVerified),
			displayName: sessionData.user.name ?? sessionData.user.email ?? sessionData.user.id,
			profile: {
				image: sessionData.user.image ?? null,
				betterAuthSessionId: sessionData.session.id,
			},
		},
	});
	if (!syncedResponse.ok) {
		return context.redirect('/auth/sign-in?error=sync_failed', 302);
	}
	const synced = await syncedResponse.json() as {
		ok: true;
		payload: {
			principal: {
				id: string;
				displayName?: string;
				scopes: string[];
				roles: string[];
				permissions: string[];
				metadata?: Record<string, unknown>;
			};
			identityId: string | null;
		};
	};
	await createSiteWebSession(context, {
		userId: synced.payload.principal.id,
		identityId: synced.payload.identityId,
		provider,
		providerSubject: sessionData.user.id,
		email: sessionData.user.email ?? null,
		displayName: sessionData.user.name ?? sessionData.user.email ?? sessionData.user.id,
		principal: synced.payload.principal,
	});
	return context.redirect(context.url.searchParams.get('returnTo') ?? '/', 302);
};
