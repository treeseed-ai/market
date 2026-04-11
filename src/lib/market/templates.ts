import { getCollection, type CollectionEntry } from 'astro:content';
import { buildMarketRuntime } from './runtime.js';

export type TemplateProductEntry = CollectionEntry<'templates'>;

export async function getTemplateMarketRuntime() {
	const entries = await getCollection('templates');
	return buildMarketRuntime(entries);
}

export async function getLiveTemplateProducts(): Promise<TemplateProductEntry[]> {
	return (await getTemplateMarketRuntime()).products as TemplateProductEntry[];
}

export async function getTemplateProductBySlug(slug: string) {
	return (await getLiveTemplateProducts()).find((entry) => entry.data.slug === slug) ?? null;
}
