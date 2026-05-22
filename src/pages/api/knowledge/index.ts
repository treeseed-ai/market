import type { APIRoute } from 'astro';
import { buildKnowledgeProjection } from '../../../lib/market/knowledge-projection';
import { loadAccessibleTeams, resolveMarketApi } from '../../../lib/market/store';
import { loadKnowledgeContentEntries } from '../../../view-models/knowledge-content';

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
	const teams = await loadAccessibleTeams(context);
	const activeTeam = teams[0] ?? null;
	const projects = activeTeam ? await store.listTeamProjects(activeTeam.id).catch(() => []) : [];
	const contentEntries = await loadKnowledgeContentEntries().catch(() => []);
	const projection = await buildKnowledgeProjection({
		store,
		principal: session.principal,
		teams,
		projects,
		contentEntries,
	});

	return json({ ok: true, payload: projection });
};
