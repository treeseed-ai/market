const operationalCollections = ['books', 'decisions', 'notes', 'objectives', 'proposals', 'questions', 'docs', 'knowledge_packs'] as const;

export async function loadKnowledgeContentEntries(): Promise<any[]> {
	const content = await import(/* @vite-ignore */ 'astro:content').catch(() => null);
	if (!content?.getCollection) return [];
	const { getCollection } = content as { getCollection: unknown };
	const loader = getCollection as unknown as (collection: string, filter?: (entry: any) => boolean) => Promise<any[]>;
	const groups = await Promise.all(operationalCollections.map(async (collection) => {
		try {
			const entries = await loader(collection, ({ data }) => !data?.draft);
			return entries.map((entry) => ({
				...entry,
				collection,
				sourceCollection: collection,
				slug: entry.slug ?? slugFromId(entry.id),
			}));
		} catch {
			return [];
		}
	}));
	return groups.flat();
}

function slugFromId(id: unknown): string {
	return String(id ?? 'entry').replace(/^.*\//u, '').replace(/[^a-zA-Z0-9_-]+/gu, '-').toLowerCase();
}
