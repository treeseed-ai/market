import { hostTypeFor } from '../lib/market/control-ui.js';
import { loadAccessibleTeams, resolveApiStore, resolveMarketPrincipal } from '../lib/market/store.js';
import { compact, safeArray, type OperationalContext } from './shared.js';

export type AppAccessStatus = 'found' | 'not_found' | 'forbidden';

export interface AppResolution<T = any> {
	resource: T | null;
	details: any | null;
	team: any | null;
	status: AppAccessStatus;
	error?: unknown;
}

function astroFrom(input: any, fallback?: any) {
	return input?.locals ? input : fallback;
}

function localsFrom(input: any) {
	return input?.locals ?? input;
}

function errorStatus(error: unknown): number | null {
	const status = Number((error as any)?.status ?? (error as any)?.details?.status ?? 0);
	return Number.isFinite(status) && status > 0 ? status : null;
}

function teamMatches(team: any, value: string) {
	return team?.id === value || team?.slug === value || team?.name === value || team?.displayName === value;
}

function projectFromDetails(details: any) {
	return details?.project ?? details?.summary?.project ?? details ?? null;
}

function resolution<T>(status: AppAccessStatus, resource: T | null = null, team: any | null = null, details: any | null = null, error?: unknown): AppResolution<T> {
	return { resource, team, details, status, ...(error ? { error } : {}) };
}

export async function loadAppContext(input: any, fallbackAstro?: any): Promise<OperationalContext> {
	const astro = astroFrom(input, fallbackAstro);
	const locals = localsFrom(input);
	const marketContext = astro ?? locals;
	const store = resolveApiStore(marketContext);
	const principal = resolveMarketPrincipal(locals);
	const teams = safeArray(await loadAccessibleTeams(marketContext).catch(() => []));
	const cookieTeamId = compact(astro?.cookies?.get?.('treeseed_active_team')?.value, '');
	const activeTeam = teams.find((team: any) => teamMatches(team, cookieTeamId)) ?? teams[0] ?? null;
	const projects = activeTeam && store ? await store.listTeamProjects(activeTeam.id).catch(() => []) : [];

	return {
		store,
		principal,
		teams,
		activeTeam,
		projects: safeArray(projects),
	};
}

export function persistActiveTeamSelection(astro: any, team: any | null) {
	if (!team?.id || !astro?.cookies?.set) return;
	astro.cookies.set('treeseed_active_team', team.id, {
		path: '/app',
		httpOnly: false,
		sameSite: 'lax',
		secure: astro.url?.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 365,
	});
}

export function resolveAppTeam(context: OperationalContext, teamParam: unknown): AppResolution {
	const param = compact(teamParam, '');
	if (!param) return resolution('not_found');
	const team = safeArray(context.teams).find((entry: any) => teamMatches(entry, param)) ?? null;
	return team ? resolution('found', team, team, null) : resolution('not_found');
}

export async function resolveAppProject(context: OperationalContext, projectParam: unknown): Promise<AppResolution> {
	const param = compact(projectParam, '');
	if (!param || !context.store) return resolution('not_found');

	let directError: unknown = null;
	if (typeof context.store.getProjectDetails === 'function') {
		try {
			const details = await context.store.getProjectDetails(param);
			const project = projectFromDetails(details);
			const team = safeArray(context.teams).find((entry: any) => entry.id === project?.teamId || entry.id === project?.team_id) ?? null;
			if (project && team) return resolution('found', project, team, details);
			if (project && !team) return resolution('forbidden', null, null, null);
		} catch (error) {
			directError = error;
		}
	}

	if (typeof context.store.getProjectByTeamAndSlug === 'function') {
		for (const team of safeArray(context.teams)) {
			const projectBySlug = await context.store.getProjectByTeamAndSlug(team.id, param).catch(() => null);
			if (!projectBySlug) continue;
			const details = typeof context.store.getProjectDetails === 'function'
				? await context.store.getProjectDetails(projectBySlug.id).catch(() => null)
				: null;
			return resolution('found', projectFromDetails(details) ?? projectBySlug, team, details);
		}
	}

	if (errorStatus(directError) === 403) return resolution('forbidden', null, null, null, directError);
	return resolution('not_found', null, null, null, directError ?? undefined);
}

function hostMatchesRequestedType(host: any, requestedType: string) {
	const inferred = hostTypeFor(host);
	if (requestedType === 'capacity-provider') return inferred === 'capacity-provider' || inferred === 'processing' || host?.provider === 'railway';
	return inferred === requestedType;
}

export async function resolveAppHost(context: OperationalContext, hostType: unknown, hostId: unknown): Promise<AppResolution> {
	const requestedType = compact(hostType, '');
	const id = compact(hostId, '');
	if (!id || !requestedType || !context.store) return resolution('not_found');

	let forbidden = false;
	for (const team of safeArray(context.teams)) {
		try {
			const host = requestedType === 'repository'
				? await context.store.getRepositoryHost(team.id, id)
				: await context.store.getTeamWebHost(team.id, id);
			if (host && hostMatchesRequestedType(host, requestedType)) return resolution('found', host, team, host);
		} catch (error) {
			if (errorStatus(error) === 403) forbidden = true;
		}
	}

	return resolution(forbidden ? 'forbidden' : 'not_found');
}

export async function resolveAppCapacityProvider(context: OperationalContext, providerId: unknown): Promise<AppResolution> {
	const id = compact(providerId, '');
	if (!id || !context.store) return resolution('not_found');

	if (typeof context.store.getCapacityProviderById === 'function') {
		try {
			const provider = await context.store.getCapacityProviderById(id);
			const teamId = provider?.teamId ?? provider?.ownerTeamId;
			const team = safeArray(context.teams).find((entry: any) => entry.id === teamId) ?? null;
			if (provider && team) return resolution('found', provider, team, provider);
			if (provider && !team) return resolution('forbidden');
		} catch (error) {
			if (errorStatus(error) === 403) return resolution('forbidden', null, null, null, error);
		}
	}

	let forbidden = false;
	for (const team of safeArray(context.teams)) {
		try {
			const provider = typeof context.store.getCapacityProvider === 'function'
				? await context.store.getCapacityProvider(team.id, id)
				: safeArray(await context.store.listTeamCapacityProviders(team.id)).find((entry: any) => entry?.id === id) ?? null;
			if (provider) return resolution('found', provider, team, provider);
		} catch (error) {
			if (errorStatus(error) === 403) forbidden = true;
		}
	}

	return resolution(forbidden ? 'forbidden' : 'not_found');
}

export async function resolveAppDeployment(context: OperationalContext, deploymentId: unknown): Promise<AppResolution> {
	const id = compact(deploymentId, '');
	if (!id || !context.store || typeof context.store.getProjectDeployment !== 'function') return resolution('not_found');
	try {
		const details = await context.store.getProjectDeployment(id);
		const deployment = details?.deployment ?? details ?? null;
		const project = details?.project?.project ?? details?.projectDetails?.project ?? details?.project ?? null;
		const teamId = deployment?.teamId ?? project?.teamId ?? project?.team_id;
		const team = safeArray(context.teams).find((entry: any) => entry.id === teamId) ?? null;
		if (deployment && team) return resolution('found', deployment, team, details);
		if (deployment && !team) return resolution('forbidden');
		return resolution('not_found');
	} catch (error) {
		return resolution(errorStatus(error) === 403 ? 'forbidden' : 'not_found', null, null, null, error);
	}
}
