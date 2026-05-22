import type { APIRoute } from 'astro';
import { loadAccessibleTeams, resolveMarketApi } from '../../../lib/market/store';
import { buildGovernanceApprovalProjection } from '../../../lib/market/governance-projection';

export const prerender = false;

function json(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

function decodeApprovalId(value: unknown) {
	let decoded = String(value ?? '');
	for (let index = 0; index < 2; index += 1) {
		try {
			const next = decodeURIComponent(decoded);
			if (next === decoded) break;
			decoded = next;
		} catch {
			break;
		}
	}
	return decoded;
}

export const GET: APIRoute = async (context) => {
	const session = context.locals.auth;
	if (!session) return json({ ok: false, error: 'Authentication required.' }, 401);

	const store = resolveMarketApi(context);
	const teams = await loadAccessibleTeams(context);
	const activeTeam = teams[0] ?? null;
	const projects = activeTeam ? await store.listTeamProjects(activeTeam.id).catch(() => []) : [];
	const detail = await buildGovernanceApprovalProjection({
		store,
		principal: session.principal,
		teams,
		projects,
		approvalId: decodeApprovalId(context.params.approvalId),
	});

	if (!detail) return json({ ok: false, error: 'Unknown approval request.' }, 404);
	return json({ ok: true, payload: detail });
};
