import { getCollection } from 'astro:content';
import { buildMarketRuntime } from './runtime.js';

export async function getTemplateMarketRuntime() {
	const entries = await getCollection('templates');
	return buildMarketRuntime(entries);
}

export async function getLiveTemplateProducts() {
	return (await getTemplateMarketRuntime()).products;
}

export async function getTemplateProductBySlug(slug: string) {
	return (await getLiveTemplateProducts()).find((entry) => entry.data.slug === slug) ?? null;
}
