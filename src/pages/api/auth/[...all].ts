import type { APIRoute } from 'astro';

export const prerender = false;

export const ALL: APIRoute = async () => {
	return Response.json({
		ok: false,
		error: 'Web-local auth API routes have moved to the Market API. Use /auth pages or /v1/auth/* contracts.',
	}, { status: 404 });
};
