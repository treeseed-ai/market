import type { APIRoute } from 'astro';
import { loadAccessibleTeams, resolveMarketApi } from '../../../lib/market/store';
import { buildWorkdayProjection } from '../../../lib/market/workday-projection';

export const prerender = false;

function json(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

export const GET: APIRoute = async (context) => {
	const session = context.locals.auth;
	if (!session) {
		return json({ ok: false, error: 'Authentication required.' }, 401);
	}

	const store = resolveMarketApi(context);
	const teams = await loadAccessibleTeams(context);
	const activeTeam = teams[0] ?? null;
	const projects = activeTeam ? await store.listTeamProjects(activeTeam.id).catch(() => []) : [];
	const projection = await buildWorkdayProjection({
		store,
		principal: session.principal,
		projects,
		workdayId: String(context.params.workdayId ?? ''),
	});

	if (!projection) {
		return json({ ok: false, error: 'Unknown workday.' }, 404);
	}

	return json({ ok: true, payload: projection });
};
