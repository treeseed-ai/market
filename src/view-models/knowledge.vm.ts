import {
	buildKnowledgeArtifactProjection,
	buildKnowledgeProjection,
	type KnowledgeArtifactProjection,
	type KnowledgeProjection,
} from '../lib/market/knowledge-projection.js';
import {
	type OperationalContext,
	type OperationalMetric,
} from './shared.js';
import { loadAppContext } from './app-access.js';
import { loadKnowledgeContentEntries } from './knowledge-content.js';

export interface KnowledgeViewModel extends KnowledgeProjection {
	context: OperationalContext;
	metrics: OperationalMetric[];
}

export interface KnowledgeArtifactViewModel {
	context: OperationalContext;
	artifact: KnowledgeArtifactProjection | null;
}

export async function loadKnowledgeViewModel(input: any): Promise<KnowledgeViewModel> {
	const context = await loadAppContext(input);
	const contentEntries = await loadKnowledgeContentEntries().catch(() => []);
	const projection = context.store
		? await buildKnowledgeProjection({
			store: context.store,
			principal: context.principal,
			teams: context.teams,
			projects: context.projects,
			contentEntries,
		})
		: emptyKnowledgeProjection();

	return {
		context,
		...projection,
	};
}

export async function loadKnowledgeArtifactViewModel(input: any, artifactId: string): Promise<KnowledgeArtifactViewModel> {
	const context = await loadAppContext(input);
	const contentEntries = await loadKnowledgeContentEntries().catch(() => []);
	const artifact = context.store
		? await buildKnowledgeArtifactProjection({
			store: context.store,
			principal: context.principal,
			teams: context.teams,
			projects: context.projects,
			contentEntries,
			artifactId,
		})
		: null;

	return { context, artifact };
}

function emptyKnowledgeProjection(): KnowledgeProjection {
	return {
		metrics: [
			{ label: 'Knowledge artifacts', value: 0, tone: 'muted' },
			{ label: 'Operational imports', value: 0 },
			{ label: 'Referenced repositories', value: 0 },
			{ label: 'Linked approvals', value: 0 },
			{ label: 'Releases', value: 0 },
		],
		categories: ['Architecture', 'Operations', 'Research', 'Implementation', 'Decisions', 'Reports', 'Releases', 'Imports'],
		artifacts: [],
		imports: [],
		reports: [],
		releases: [],
		relationshipSummary: {
			workdays: 0,
			repositories: 0,
			approvals: 0,
			releases: 0,
			decisions: 0,
		},
	};
}
