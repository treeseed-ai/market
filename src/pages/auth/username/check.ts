import type { APIRoute } from 'astro';
import { usernameAvailabilityResult } from '../../../lib/auth/account';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const result = await usernameAvailabilityResult(context, context.url.searchParams.get('username') ?? '');
	return Response.json(result);
};
