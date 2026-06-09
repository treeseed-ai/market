import type { APIContext } from 'astro';
import { createApiFacade } from './api-client.js';

type MarketContext = Pick<APIContext, 'locals' | 'cookies' | 'url' | 'request'>;

const emptyCookies = {
	get() {
		return undefined;
	},
	set() {},
	delete() {},
} as unknown as APIContext['cookies'];

function toMarketContext(contextOrLocals: MarketContext | App.Locals | Record<string, unknown> | null | undefined): MarketContext {
	if (contextOrLocals && 'locals' in contextOrLocals) {
		return contextOrLocals as MarketContext;
	}
	return {
		locals: (contextOrLocals ?? {}) as App.Locals,
		cookies: emptyCookies,
		url: new URL('http://localhost/'),
		request: new Request('http://localhost/'),
	};
}

export function resolveApiStore(contextOrLocals: MarketContext | App.Locals | Record<string, unknown> | null | undefined) {
	return createApiFacade(toMarketContext(contextOrLocals));
}

export function resolveMarketPrincipal(contextOrLocals: MarketContext | App.Locals | Record<string, unknown> | null | undefined) {
	const locals = contextOrLocals && 'locals' in contextOrLocals ? contextOrLocals.locals : contextOrLocals;
	return (locals as App.Locals | undefined)?.auth?.principal ?? null;
}

export async function loadAccessibleTeams(contextOrLocals: MarketContext | App.Locals | Record<string, unknown> | null | undefined) {
	const store = resolveApiStore(contextOrLocals);
	return store.listTeamsForPrincipal().catch(() => []);
}
