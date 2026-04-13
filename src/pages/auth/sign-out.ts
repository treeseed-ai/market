import type { APIRoute } from 'astro';
import { deleteSiteWebSession } from '../../lib/auth/session-store';

export const prerender = false;

export const POST: APIRoute = async (context) => {
	await deleteSiteWebSession(context);
	return context.redirect('/', 303);
};
