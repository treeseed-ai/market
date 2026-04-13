import type { APIRoute } from 'astro';
import { createSiteBetterAuth } from '../../../lib/auth/better-auth';

export const prerender = false;

export const ALL: APIRoute = async (context) => {
	const auth = createSiteBetterAuth(context);
	return auth.handler(context.request);
};
