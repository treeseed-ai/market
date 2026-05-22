import type { TemplateCatalogProvider } from '@treeseed/core/templates';
import { resolveMarketApi } from './store.js';

export function createMarketTemplateCatalogProvider(
	locals: App.Locals | Record<string, unknown> | null | undefined,
): TemplateCatalogProvider {
	return {
		async listItems() {
			return resolveMarketApi(locals).listCatalogItems((locals as App.Locals | undefined)?.auth?.principal ?? null, { kind: 'template' }).catch(() => []);
		},
		async getItemBySlug(slug: string) {
			return resolveMarketApi(locals).getCatalogItemBySlug('template', slug).catch(() => null);
		},
	};
}
