import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const session = context.locals.auth?.session ?? null;
	const principal = context.locals.auth?.principal ?? null;
	if (!session || !principal) {
		return new Response(JSON.stringify({ ok: false, error: 'Authentication required.' }), {
			status: 401,
			headers: { 'content-type': 'application/json' },
		});
	}
	return new Response(JSON.stringify({
		ok: true,
		payload: {
			sessionId: session.id,
			userId: session.userId,
			principal,
			expiresAt: session.expiresAt,
		},
	}), {
		headers: { 'content-type': 'application/json' },
	});
};
