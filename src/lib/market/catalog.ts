import { MarketControlPlaneStore } from '../../api/store.js';
import type { TemplateCatalogProvider } from '@treeseed/core/templates';

function resolveStore(locals: App.Locals | Record<string, unknown> | null | undefined) {
	const runtime = (locals as App.Locals | undefined)?.runtime;
	const db = runtime?.env?.SITE_DATA_DB;
	if (!db) {
		return null;
	}
	return new MarketControlPlaneStore({
		authSecret: String(runtime.env.TREESEED_EDITORIAL_PREVIEW_SECRET ?? runtime.env.TREESEED_FORM_TOKEN_SECRET ?? 'market-catalog'),
	}, db as never);
}

export function createMarketTemplateCatalogProvider(
	locals: App.Locals | Record<string, unknown> | null | undefined,
): TemplateCatalogProvider {
	return {
		async listItems() {
			const store = resolveStore(locals);
			if (!store) {
				return [];
			}
			return store.listCatalogItems((locals as App.Locals | undefined)?.auth?.principal ?? null, { kind: 'template' });
		},
		async getItemBySlug(slug: string) {
			const store = resolveStore(locals);
			if (!store) {
				return null;
			}
			const item = await store.getCatalogItemBySlug('template', slug);
			if (!item) {
				return null;
			}
			const canAccess = await store.principalCanAccessCatalogItem((locals as App.Locals | undefined)?.auth?.principal ?? null, item);
			return canAccess ? item : null;
		},
	};
}
