import { listTreeseedManagedHostsFromConfig } from './managed-hosts.js';

export const teamSectionTitles = {
	home: 'Team Home',
	inbox: 'Inbox',
	members: 'Team Members',
	products: 'Team Products',
	hosts: 'Hosts',
	capacity: 'Processing Capacity',
	settings: 'Team Settings',
};

export function hostTypeFor(host: any) {
	if (host?.metadata?.hostType === 'email' || host?.provider === 'smtp') return 'email';
	return host?.metadata?.hostType === 'processing' || host?.metadata?.hostType === 'agent' || host?.provider === 'railway' ? 'processing' : 'web';
}

export async function loadTeamSectionData(context: any, locals: App.Locals) {
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
