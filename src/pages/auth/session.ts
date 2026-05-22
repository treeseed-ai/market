import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const session = context.locals.auth?.session ?? null;
	const principal = context.locals.auth?.principal ?? null;
	return new Response(JSON.stringify({
		ok: true,
		payload: session && principal
			? {
				sessionId: session.id,
				userId: session.userId,
				principal,
				email: session.email,
				displayName: session.displayName,
				expiresAt: session.expiresAt,
			}
			: null,
	}), {
		headers: { 'content-type': 'application/json' },
	});
};
