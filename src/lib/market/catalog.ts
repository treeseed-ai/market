import type { TemplateCatalogProvider } from '@treeseed/core/templates';
import { resolveApiStore } from './store.js';

export function createMarketTemplateCatalogProvider(
	locals: App.Locals | Record<string, unknown> | null | undefined,
): TemplateCatalogProvider {
	return {
		async listItems() {
			return resolveApiStore(locals).listCatalogItems((locals as App.Locals | undefined)?.auth?.principal ?? null, { kind: 'template' }).catch(() => []);
		},
		async getItemBySlug(slug: string) {
			return resolveApiStore(locals).getCatalogItemBySlug('template', slug).catch(() => null);
		},
	};
}
