const workContentCollections = ['questions', 'objectives', 'notes', 'proposals', 'decisions'] as const;

export type WorkContentCollection = typeof workContentCollections[number];

export interface WorkContentEntry {
	id: string;
	collection: WorkContentCollection;
	title: string;
	description: string;
	summary: string;
	status: string;
	date: string;
	type: string;
	primaryContributor: string;
	relations: string[];
	href: string;
}

export async function loadWorkContentEntries(): Promise<WorkContentEntry[]> {
	const content = await import(/* @vite-ignore */ 'astro:content').catch(() => null);
	if (!content?.getCollection) return [];
	const loader = content.getCollection as (collection: string, filter?: (entry: any) => boolean) => Promise<any[]>;
	const groups = await Promise.all(workContentCollections.map(async (collection) => {
		try {
			const entries = await loader(collection, ({ data }) => !data?.draft);
			return entries.map((entry) => normalizeWorkContentEntry(collection, entry));
		} catch {
			return [];
		}
	}));
	return groups.flat().sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

export function workContentEntriesFor(entries: WorkContentEntry[], collection: WorkContentCollection): WorkContentEntry[] {
	return entries.filter((entry) => entry.collection === collection);
}

export function workContentRelationSummary(entry: WorkContentEntry): string {
	return entry.relations.length > 0 ? entry.relations.join(', ') : 'No linked records';
}

function normalizeWorkContentEntry(collection: WorkContentCollection, entry: any): WorkContentEntry {
	const data = entry?.data && typeof entry.data === 'object' ? entry.data : {};
	const id = String(entry?.id ?? entry?.slug ?? data.id ?? 'content');
	return {
		id,
		collection,
		title: stringValue(data.title, titleFromId(id)),
		description: stringValue(data.description, ''),
		summary: stringValue(data.summary, ''),
		status: stringValue(data.status, 'recorded'),
		date: dateValue(data.date),
		type: typeFor(collection, data),
		primaryContributor: stringValue(data.primaryContributor ?? data.primary_contributor, ''),
		relations: relationsFor(collection, data),
		href: `/app/work/${collection}/${encodeURIComponent(id)}`,
	};
}

function typeFor(collection: WorkContentCollection, data: Record<string, any>): string {
	if (collection === 'questions') return stringValue(data.questionType ?? data.question_type, 'question');
	if (collection === 'objectives') return stringValue(data.timeHorizon ?? data.time_horizon, 'objective');
	if (collection === 'proposals') return stringValue(data.proposalType ?? data.proposal_type, 'proposal');
	if (collection === 'decisions') return stringValue(data.decisionType ?? data.decision_type, 'decision');
	return 'note';
}

function relationsFor(collection: WorkContentCollection, data: Record<string, any>): string[] {
	const relations = [
		...relationValues(data.relatedObjectives ?? data.related_objectives, 'objective'),
		...relationValues(data.relatedQuestions ?? data.related_questions, 'question'),
		...relationValues(data.relatedNotes ?? data.related_notes, 'note'),
		...relationValues(data.relatedProposals ?? data.related_proposals, 'proposal'),
		...relationValues(data.relatedBooks ?? data.related_books, 'book'),
	];
	if (collection === 'proposals') {
		relations.push(...relationValues(data.decision ? [data.decision] : [], 'decision'));
	}
	return relations.slice(0, 6);
}

function relationValues(value: unknown, prefix: string): string[] {
	if (!Array.isArray(value)) return [];
	return value.map((item) => `${prefix}:${relationId(item)}`).filter((item) => item !== `${prefix}:`);
}

function relationId(value: unknown): string {
	if (typeof value === 'string') return value;
	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return String(record.id ?? record.slug ?? record.collection ?? '');
	}
	return '';
}

function stringValue(value: unknown, fallback: string): string {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function dateValue(value: unknown): string {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 10);
	return '';
}

function titleFromId(id: string): string {
	return id.replace(/[-_]+/gu, ' ').replace(/\b\w/gu, (match) => match.toUpperCase());
}
