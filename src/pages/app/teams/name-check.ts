import type { APIRoute } from 'astro';
import { resolveMarketStore } from '../../../lib/market/store.js';
import { normalizeTeamName, validateTeamName } from '../../../api/store.js';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	if (!context.locals.auth?.principal) {
		return Response.json({
			ok: true,
			name: '',
			available: false,
			status: 'error',
			message: 'Authentication is required.',
		}, { status: 401 });
	}
	const store = resolveMarketStore(context.locals);
	if (!store) {
		return Response.json({
			ok: true,
			name: '',
			available: false,
			status: 'error',
			message: 'Market storage is unavailable.',
		}, { status: 503 });
	}
	const name = normalizeTeamName(context.url.searchParams.get('name') ?? '');
	const excludeTeamId = context.url.searchParams.get('teamId') ?? null;
	if (!name) {
		return Response.json({
			ok: true,
			name,
			available: false,
			status: 'empty',
			message: 'Team name is public and used in URLs.',
		});
	}
	const validation = validateTeamName(name);
	if (!validation.ok) {
		return Response.json({
			ok: true,
			name,
			available: false,
			status: validation.code === 'reserved' ? 'reserved' : 'invalid',
			message: validation.message,
		});
	}
	const available = await (store as any).isTeamNameAvailable(validation.name, excludeTeamId);
	return Response.json({
		ok: true,
		name: validation.name,
		available,
		status: available ? 'available' : 'taken',
		message: available ? 'Team name is available.' : 'Team name is taken.',
	});
};
