import { loadAccessibleTeams, resolveMarketApi, resolveMarketPrincipal } from './store.js';

export async function loadTeamAppContext(locals: App.Locals, teamName: string) {
	const store = resolveMarketApi(locals);
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
	const requested = teamName.trim().toLowerCase();
	const team = teams.find((entry: any) => entry.name === requested || entry.slug === requested) ?? null;
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

export async function loadProjectAppContext(locals: App.Locals, teamName: string, projectSlug: string) {
	const base = await loadTeamAppContext(locals, teamName);
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
