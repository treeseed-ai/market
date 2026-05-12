import { MarketControlPlaneStore } from '../../api/store.js';
import { getSiteAuthConfig } from '../auth/config';

function resolveRuntime(locals: App.Locals | Record<string, unknown> | null | undefined) {
	return (locals as App.Locals | undefined)?.runtime;
}

export function resolveMarketStore(locals: App.Locals | Record<string, unknown> | null | undefined) {
	const runtime = resolveRuntime(locals);
	const db = runtime?.env?.SITE_DATA_DB;
	if (!db) {
		return null;
	}
	const authConfig = getSiteAuthConfig({ locals: locals as App.Locals });
	return new MarketControlPlaneStore({
		authSecret: String(runtime.env.TREESEED_EDITORIAL_PREVIEW_SECRET ?? runtime.env.TREESEED_FORM_TOKEN_SECRET ?? 'treeseed-market'),
		assertionSecret: authConfig.apiAssertionSecret,
		serviceId: authConfig.apiServiceId,
		serviceSecret: authConfig.apiServiceSecret,
		fetchImpl: fetch,
	}, db as never);
}

export function resolveMarketPrincipal(locals: App.Locals | Record<string, unknown> | null | undefined) {
	return (locals as App.Locals | undefined)?.auth?.principal ?? null;
}

export async function loadAccessibleTeams(locals: App.Locals | Record<string, unknown> | null | undefined) {
	const store = resolveMarketStore(locals);
	if (!store) {
		return [];
	}
	return store.listTeamsForPrincipal(resolveMarketPrincipal(locals));
}
