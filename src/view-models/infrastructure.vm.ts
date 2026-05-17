import {
	buildInfrastructureProjection,
	type InfrastructureProjection,
} from '../lib/market/infrastructure-projection.js';
import { loadInfrastructureSeedState } from '../lib/market/infrastructure-seeds.js';
import {
	loadOperationalContext,
	type OperationalContext,
	type OperationalMetric,
} from './shared.js';

export interface InfrastructureViewModel extends InfrastructureProjection {
	context: OperationalContext;
	metrics: OperationalMetric[];
}

export async function loadInfrastructureViewModel(locals: App.Locals, url?: URL): Promise<InfrastructureViewModel> {
	const context = await loadOperationalContext(locals);
	const seedState = context.store
		? await loadInfrastructureSeedState({
			store: context.store,
			team: context.activeTeam,
			principal: context.principal,
			locals,
			url,
		}).catch(() => null)
		: null;
	const projection = context.store
		? await buildInfrastructureProjection({
			store: context.store,
			principal: context.principal,
			team: context.activeTeam,
			projects: context.projects,
			seedState,
		})
		: emptyInfrastructureProjection();

	return {
		context,
		...projection,
	};
}

function emptyInfrastructureProjection(): InfrastructureProjection {
	return {
		metrics: [],
		projects: [],
		repositories: [],
		deployments: [],
		capacity: [],
		workers: [],
		hosts: [],
		integrations: [],
		resources: [],
		seeds: [],
		policies: [],
		diagnostics: [],
	};
}
