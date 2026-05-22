import type { APIRoute } from 'astro';
import { loadAccessibleTeams, resolveMarketApi } from '../../../../lib/market/store';
import { buildGovernanceApprovalProjection } from '../../../../lib/market/governance-projection';

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

async function readDecision(request: Request) {
	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		return {
			body: await request.json().catch(() => ({})),
			wantsJson: true,
		};
	}
	const form = await request.formData().catch(() => new FormData());
	return {
		body: Object.fromEntries(form.entries()),
		wantsJson: false,
	};
}

export const POST: APIRoute = async (context) => {
	const session = context.locals.auth;
	if (!session) return json({ ok: false, error: 'Authentication required.' }, 401);

	const store = resolveMarketApi(context);
	const teams = await loadAccessibleTeams(context);
	const activeTeam = teams[0] ?? null;
	const projects = activeTeam ? await store.listTeamProjects(activeTeam.id).catch(() => []) : [];
	const approvalId = decodeApprovalId(context.params.approvalId);
	const detail = await buildGovernanceApprovalProjection({
		store,
		principal: session.principal,
		teams,
		projects,
		approvalId,
	});
	if (!detail) return json({ ok: false, error: 'Unknown approval request.' }, 404);
	if (!['pending', 'waiting_for_approval', 'under_review', 'approval_required'].includes(String(detail.approval.state ?? '').toLowerCase())) {
		return json({ ok: false, error: 'This approval request is not pending.', state: detail.approval.state }, 409);
	}

	const { body, wantsJson } = await readDecision(context.request);
	const optionId = typeof body.optionId === 'string' ? body.optionId : typeof body.decision === 'string' ? body.decision : '';
	const option = detail.decisionOptions.find((entry) => entry.id === optionId) ?? detail.decisionOptions[0];
	const state = body.state === 'rejected' || option?.state === 'rejected' ? 'rejected' : 'approved';
	const decided = await store.decideApprovalRequest(detail.approval.approvalId, {
		state,
		decidedByType: 'user',
		decidedById: session.principal.id,
		decision: {
			optionId: option?.id ?? (optionId || null),
			note: typeof body.note === 'string' ? body.note : null,
		},
	});
	if (activeTeam && typeof store.deleteTeamInboxItemsByItemKey === 'function') {
		await store.deleteTeamInboxItemsByItemKey(activeTeam.id, detail.approval.approvalId).catch(() => {});
	}

	if (wantsJson) {
		return json({ ok: true, payload: decided });
	}
	return context.redirect(`/app/work/decisions/${encodeURIComponent(detail.approval.approvalId)}`, 303);
};
