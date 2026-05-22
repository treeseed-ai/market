import type { APIRoute } from 'astro';
import { buildInfrastructureProjection } from '../../lib/market/infrastructure-projection';
import { loadInfrastructureSeedState } from '../../lib/market/infrastructure-seeds';
import { loadAccessibleTeams, resolveMarketApi } from '../../lib/market/store';

export const prerender = false;

function json(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

export const GET: APIRoute = async (context) => {
	const session = context.locals.auth;
	if (!session) return json({ ok: false, error: 'Authentication required.' }, 401);

	const store = resolveMarketApi(context);
	if (!store) return json({ ok: false, error: 'Market API facade is unavailable.' }, 503);
	const teams = await loadAccessibleTeams(context);
	const activeTeam = teams[0] ?? null;
	const projects = activeTeam ? await store.listTeamProjects(activeTeam.id).catch(() => []) : [];
	const seedState = await loadInfrastructureSeedState({
		store,
		team: activeTeam,
		principal: session.principal,
		locals: context.locals,
		url: context.url,
	}).catch(() => null);
	const projection = await buildInfrastructureProjection({
		store,
		principal: session.principal,
		team: activeTeam,
		projects,
		seedState,
	});

	return json({ ok: true, payload: projection });
};
