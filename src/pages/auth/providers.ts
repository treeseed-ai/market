import type { APIRoute } from 'astro';
import { authProviderCapabilities } from '../../lib/auth/flow';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	return new Response(JSON.stringify({
		ok: true,
		payload: authProviderCapabilities(context),
	}), {
		headers: { 'content-type': 'application/json' },
	});
};
