import { existsSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { planSeedWithStore } from './seeds/apply.js';
import { listTreeseedManagedHostsFromConfig } from './managed-hosts.js';

export const teamSectionTitles = {
	home: 'Team Home',
	inbox: 'Inbox',
	members: 'Team Members',
	products: 'Team Products',
	hosts: 'Hosts',
	capacity: 'Processing Capacity',
	seeds: 'Environment Seeds',
	settings: 'Team Settings',
};

export function hostTypeFor(host: any) {
	if (host?.metadata?.hostType === 'email' || host?.provider === 'smtp') return 'email';
	return host?.metadata?.hostType === 'processing' || host?.metadata?.hostType === 'agent' || host?.provider === 'railway' ? 'processing' : 'web';
}

function runtimeEnvValue(locals: App.Locals, name: string) {
	const runtimeValue = (locals as any)?.runtime?.env?.[name];
	if (typeof runtimeValue === 'string' && runtimeValue.trim()) return runtimeValue.trim();
	const processValue = typeof process !== 'undefined' ? process.env?.[name] : undefined;
	return typeof processValue === 'string' && processValue.trim() ? processValue.trim() : '';
}

function isLocalRuntime(locals: App.Locals) {
	return runtimeEnvValue(locals, 'TREESEED_ENVIRONMENT') === 'local'
		|| runtimeEnvValue(locals, 'TREESEED_LOCAL_DEV_MODE') === 'cloudflare';
}

function projectRootFor(locals: App.Locals) {
	const repoRoot = (locals as any)?.runtime?.resolved?.config?.repoRoot;
	return typeof repoRoot === 'string' && repoRoot.trim() ? repoRoot : process.cwd();
}

function discoverSeedNames(projectRoot: string) {
	const seedsDir = resolve(projectRoot, 'seeds');
	if (!existsSync(seedsDir)) return ['treeseed'];
	const names = readdirSync(seedsDir)
		.filter((entry) => entry.endsWith('.yaml') || entry.endsWith('.yml'))
		.map((entry) => basename(entry).replace(/\.ya?ml$/u, ''))
		.filter((entry) => /^[a-zA-Z0-9_-]+$/u.test(entry));
	return [...new Set(names.length ? names : ['treeseed'])].sort((left, right) => {
		if (left === 'treeseed') return -1;
		if (right === 'treeseed') return 1;
		return left.localeCompare(right);
	});
}

function selectedSeedEnvironment(url: URL | undefined, locals: App.Locals) {
	const requested = url?.searchParams.get('environments') ?? url?.searchParams.get('environment') ?? '';
	if (requested.trim()) return requested;
	return isLocalRuntime(locals) ? 'local' : 'staging';
}

function selectedSeedName(url: URL | undefined, seedNames: string[]) {
	const requested = url?.searchParams.get('seed') ?? '';
	return seedNames.includes(requested) ? requested : seedNames.includes('treeseed') ? 'treeseed' : seedNames[0] ?? 'treeseed';
}

function seedRunTouchesTeam(run: any, team: any) {
	const actions = Array.isArray(run?.plan?.actions) ? run.plan.actions : [];
	const handles = new Set([team?.id, team?.name, team?.slug].filter(Boolean).map(String));
	return actions.some((action: any) => (
		action.kind === 'team'
		&& (
			handles.has(String(action.existing?.id ?? ''))
			|| handles.has(String(action.payload?.slug ?? ''))
			|| handles.has(String(action.payload?.name ?? ''))
		)
	));
}

async function loadSeedSectionData(context: any, locals: App.Locals, url?: URL) {
	if (!context.team || !context.store) {
		return {
			seedPage: {
				teamId: context.team?.id ?? null,
				seedNames: ['treeseed'],
				selectedSeed: 'treeseed',
				selectedEnvironments: 'local',
				plan: null,
				diagnostics: [],
				runs: [],
				approvals: [],
				error: 'Team store is unavailable.',
			},
		};
	}
	const projectRoot = projectRootFor(locals);
	const seedNames = discoverSeedNames(projectRoot);
	const selectedSeed = selectedSeedName(url, seedNames);
	const selectedEnvironments = selectedSeedEnvironment(url, locals);
	const planned: any = await planSeedWithStore({
		projectRoot,
		seedName: selectedSeed,
		environments: selectedEnvironments,
		mode: 'plan',
		store: context.store,
		actor: {
			actorType: 'user',
			principal: context.principal,
		},
	}).catch((error: unknown) => ({
		plan: null,
		diagnostics: [{
			severity: 'error',
			code: 'seed.plan_failed',
			message: error instanceof Error ? error.message : String(error),
			path: 'seed',
		}],
		manifestHash: null,
	}));
	const [runs, approvals] = await Promise.all([
		typeof context.store.listSeedRuns === 'function' ? context.store.listSeedRuns(100) : [],
		typeof context.store.listApprovalRequestsForTeam === 'function'
			? context.store.listApprovalRequestsForTeam(context.team.id, { kind: 'seed_production_apply', limit: 50 })
			: [],
	]);
	return {
		seedPage: {
			teamId: context.team.id,
			seedNames,
			selectedSeed,
			selectedEnvironments,
			plan: planned.plan,
			diagnostics: planned.plan?.diagnostics ?? planned.diagnostics ?? [],
			manifestHash: planned.manifestHash ?? null,
			runs: runs.filter((run: any) => seedRunTouchesTeam(run, context.team)).slice(0, 20),
			approvals,
			error: null,
		},
	};
}

export async function loadTeamSectionData(context: any, locals: App.Locals, options: { section?: string; url?: URL } = {}) {
	if (options.section === 'seeds') {
		return loadSeedSectionData(context, locals, options.url);
	}

	const [teamHome, inbox, members, products, webHosts, repositoryHosts, teamProjects, capacityProviders, capacityGrants] = context.team && context.store
		? await Promise.all([
			context.store.getTeamHomeSummary(context.team.id, context.principal),
			context.store.listTeamInboxItems(context.team.id, context.principal),
			context.store.listTeamMembers(context.team.id),
			context.store.listTeamProducts(context.team.id, context.principal),
			context.store.listTeamWebHosts(context.team.id),
			context.store.listRepositoryHosts(context.team.id),
			context.store.listTeamProjects(context.team.id),
			context.store.listTeamCapacityProviders(context.team.id),
			context.store.listCapacityGrants(context.team.id),
		])
		: [null, [], [], [], [], [], [], [], []];

	const webHostUsageById = new Map<string, any[]>();
	for (const project of teamProjects) {
		for (const host of [project.metadata?.cloudflareHost, project.metadata?.processingHost, project.metadata?.emailHost]) {
			if (host?.mode === 'team_owned' && typeof host.hostId === 'string' && host.hostId) {
				const usage = webHostUsageById.get(host.hostId) ?? [];
				usage.push(project);
				webHostUsageById.set(host.hostId, usage);
			}
		}
	}

	const projectsUsingWebHost = (hostId: string) => webHostUsageById.get(hostId) ?? [];
	const treeseedManagedHosts = context.team
		? await listTreeseedManagedHostsFromConfig(context.team.id, (locals as any).runtime ?? locals)
		: [];
	const managedWebHosts = treeseedManagedHosts.filter((host: any) => hostTypeFor(host) === 'web');
	const managedProcessingHosts = treeseedManagedHosts.filter((host: any) => hostTypeFor(host) === 'processing');
	const managedEmailHosts = treeseedManagedHosts.filter((host: any) => hostTypeFor(host) === 'email');
	const configuredManagedRepositoryHosts = repositoryHosts.filter((host: any) => host.ownership === 'treeseed_managed');
	const managedRepositoryHosts = configuredManagedRepositoryHosts.length > 0
		? configuredManagedRepositoryHosts
		: [{
			id: 'platform:github:hosted-hubs',
			teamId: context.team?.id ?? null,
			provider: 'github',
			ownership: 'treeseed_managed',
			name: 'TreeSeed Repository Host',
			accountLabel: 'TreeSeed repository organization',
			organizationOrOwner: 'TreeSeed hosted hubs',
			defaultVisibility: 'public or private',
			status: 'active',
			metadata: { managed: true, pricing: 'Free for public projects or $0.01/build minute' },
		}];
	const teamRepositoryHosts = repositoryHosts.filter((host: any) => host.ownership !== 'treeseed_managed');
	const teamWebHosts = webHosts.filter((host: any) => hostTypeFor(host) === 'web');
	const teamProcessingHosts = webHosts.filter((host: any) => hostTypeFor(host) === 'processing');
	const teamEmailHosts = webHosts.filter((host: any) => hostTypeFor(host) === 'email');
	const capacityDetails = await Promise.all((capacityProviders as any[]).map(async (provider: any) => ({
		...provider,
		hosts: context.store ? await context.store.listCapacityProviderHosts(context.team?.id ?? '', provider.id) : [],
		lanes: context.store ? await context.store.listCapacityProviderLanes(context.team?.id ?? '', provider.id) : [],
		grants: (capacityGrants as any[]).filter((grant) => grant.capacityProviderId === provider.id),
		apiKeys: context.store ? await context.store.listCapacityProviderApiKeys(context.team?.id ?? '', provider.id) : [],
	})));
	const capacitySummary = context.team && context.store
		? await context.store.getTeamCapacitySummary(context.team.id)
		: null;
	const activeTeamProcessingHosts = teamProcessingHosts.filter((host: any) => host.status === 'active');
	const processingHostsById = new Map([...managedProcessingHosts, ...teamProcessingHosts].map((host: any) => [host.id, host]));
	const capacityProvidersByProcessingHostId = new Map<string, any[]>();
	for (const provider of capacityDetails as any[]) {
		for (const hostBinding of provider.hosts ?? []) {
			if (hostBinding.role !== 'processing') continue;
			const entries = capacityProvidersByProcessingHostId.get(hostBinding.hostId) ?? [];
			entries.push(provider);
			capacityProvidersByProcessingHostId.set(hostBinding.hostId, entries);
		}
	}

	return {
		teamHome,
		inbox,
		members,
		products,
		webHosts,
		repositoryHosts,
		teamProjects,
		capacityProviders,
		capacityGrants,
		projectsUsingWebHost,
		defaultHostName: `${context.team?.displayName ?? context.team?.name ?? 'Team'} host`,
		managedRepositoryHosts,
		teamRepositoryHosts,
		managedWebHosts,
		teamWebHosts,
		managedProcessingHosts,
		teamProcessingHosts,
		managedEmailHosts,
		teamEmailHosts,
		capacityDetails,
		capacitySummary,
		activeTeamProcessingHosts,
		processingHostsById,
		capacityProvidersByProcessingHostId,
		webHostsJson: JSON.stringify({
			teamId: context.team?.id ?? null,
			hosts: webHosts,
			repositoryHosts,
		}).replace(/</gu, '\\u003c'),
		capacityPageJson: JSON.stringify({
			teamId: context.team?.id ?? null,
		}).replace(/</gu, '\\u003c'),
	};
}
