import type { APIRoute } from 'astro';
import { getSiteAuthConfig } from '../../lib/auth/config';

export const prerender = false;

const supportedProviders = new Set(['github', 'google', 'microsoft', 'apple']);

export const GET: APIRoute = async (context) => {
	const provider = context.url.searchParams.get('provider') ?? 'github';
	const returnTo = context.url.searchParams.get('returnTo') ?? '/';
	if (!supportedProviders.has(provider)) {
		return new Response(JSON.stringify({ ok: false, error: 'Unsupported provider.' }), {
			status: 400,
			headers: { 'content-type': 'application/json' },
		});
	}
	const config = getSiteAuthConfig(context);
	const callbackURL = `${config.betterAuthBaseUrl}/auth/callback/${provider}?returnTo=${encodeURIComponent(returnTo)}`;
	return context.redirect(`/api/auth/sign-in/social?provider=${encodeURIComponent(provider)}&callbackURL=${encodeURIComponent(callbackURL)}`, 302);
};
