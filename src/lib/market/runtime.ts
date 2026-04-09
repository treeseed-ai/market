import { sortFeaturedFirst } from './catalog.js';

export function buildMarketRuntime<T extends { data: { status: string; featured?: boolean; title: string } }>(entries: T[]) {
	const liveEntries = entries.filter((entry) => entry.data.status === 'live');
	return {
		products: sortFeaturedFirst(liveEntries),
		featuredProducts: sortFeaturedFirst(liveEntries.filter((entry) => entry.data.featured)),
	};
}
