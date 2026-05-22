import type { APIRoute } from 'astro';
import { normalizeReturnTo } from '../../lib/auth/flow';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const returnTo = normalizeReturnTo(context);
	if (context.url.searchParams.get('error')) {
		return context.redirect(`/auth/sign-in?error=${encodeURIComponent('Email verification failed or expired.')}&returnTo=${encodeURIComponent(returnTo)}`, 302);
	}
	return context.redirect(`/auth/sign-in?verified=1&returnTo=${encodeURIComponent(returnTo)}`, 302);
};
