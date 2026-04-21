import { loadAccessibleTeams, resolveMarketPrincipal, resolveMarketStore } from './store.js';

export async function loadTeamAppContext(locals: App.Locals, teamSlug: string) {
	const store = resolveMarketStore(locals);
	const principal = resolveMarketPrincipal(locals);
	if (!store || !principal) {
		return {
			store: null,
			principal: null,
			teams: [],
			team: null,
		};
	}

	const teams = await loadAccessibleTeams(locals);
	const team = teams.find((entry: any) => entry.slug === teamSlug) ?? null;
	if (!team) {
		return {
			store,
			principal,
			teams,
			team: null,
		};
	}

	return {
		store,
		principal,
		teams,
		team,
	};
}

export async function loadProjectAppContext(locals: App.Locals, teamSlug: string, projectSlug: string) {
	const base = await loadTeamAppContext(locals, teamSlug);
	if (!base.store || !base.team) {
		return {
			...base,
			project: null,
		};
	}

	const project = await base.store.getProjectByTeamAndSlug(base.team.id, projectSlug);
	return {
		...base,
		project,
	};
}
