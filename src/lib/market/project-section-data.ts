export const projectSectionTitles = {
	overview: 'Overview',
	direct: 'Direct',
	workstreams: 'Workstreams',
	agents: 'Agents',
	releases: 'Releases',
	share: 'Share',
	settings: 'Settings',
};

const agentReadinessCopy = {
	ready: 'Ready',
	waiting_for_budget: 'Waiting for budget',
	waiting_for_provider: 'Waiting for provider',
	paused_by_policy: 'Paused by policy',
	needs_approval: 'Needs approval',
};

const agentReadinessTone = {
	ready: 'success',
	waiting_for_budget: 'warning',
	waiting_for_provider: 'warning',
	paused_by_policy: 'info',
	needs_approval: 'danger',
};

export async function loadProjectSectionData(context: any) {
	const [summary, direct, workstreams, agents, releases, share] = context.project && context.store
		? await Promise.all([
			context.store.getProjectSummary(context.project.id, context.principal),
			context.store.getProjectDirectSummary(context.project.id, context.principal),
			context.store.getProjectWorkstreamsSummary(context.project.id, context.principal),
			context.store.getProjectAgentsSummary(context.project.id, context.principal),
			context.store.getProjectReleasesSummary(context.project.id, context.principal),
			context.store.getProjectShareSummary(context.project.id, context.principal),
		])
		: [null, null, null, null, null, null];
	const capacitySummary = context.project && context.store
		? await context.store.getProjectCapacitySummary(context.project.id, 'staging')
		: null;
	const agentReadiness = capacitySummary?.readiness ?? 'waiting_for_provider';
	const agentReadinessLabel = (agentReadinessCopy as any)[agentReadiness] ?? 'Waiting for provider';
	const agentReadinessToneValue = (agentReadinessTone as any)[agentReadiness] ?? 'warning';
	const agentReadinessReasons = (capacitySummary?.reasons ?? []).map((reason: string) => reason.replaceAll('_', ' ')).join(' · ');

	return {
		summary,
		direct,
		workstreams,
		agents,
		releases,
		share,
		capacitySummary,
		agentReadinessLabel,
		agentReadinessToneValue,
		agentReadinessReasons,
	};
}
