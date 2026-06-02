import {
	artifactTitle,
	compareDatesDesc,
	describeState,
	knowledgeHref,
	loadProjectBundle,
	normalizeWorkdayEntry,
	operationEventFromApproval,
	projectHref,
	safeArray,
	teamLabel,
	toneForState,
	type OperationalContext,
	type OperationalEvent,
	type OperationalMetric,
} from './shared.js';
import { loadAppContext } from './app-access.js';

export interface MissionControlViewModel {
	context: OperationalContext;
	teamName: string;
	currentObjective: string;
	summary: string;
	metrics: OperationalMetric[];
	activeWorkdays: any[];
	queuedWork: OperationalEvent[];
	pendingApprovals: OperationalEvent[];
	repositoryHealth: OperationalEvent[];
	recentKnowledge: any[];
	recentDecisions: OperationalEvent[];
	recentReleases: OperationalEvent[];
}

export async function loadMissionControlViewModel(input: any): Promise<MissionControlViewModel> {
	const context = await loadAppContext(input);
	const bundles = await Promise.all(context.projects.map((project: any) => loadProjectBundle(context, project)));
	const workdays = bundles
		.flatMap((bundle: any) => [
			...bundle.workdays.map((entry: any) => normalizeWorkdayEntry(bundle.project, entry)),
			...(bundle.agents?.currentWorkday ? [normalizeWorkdayEntry(bundle.project, bundle.agents.currentWorkday, 'runtime')] : []),
		])
		.filter((entry: any, index: number, all: any[]) => all.findIndex((candidate: any) => candidate.id === entry.id) === index)
		.sort((left: any, right: any) => compareDatesDesc(left.updatedAt, right.updatedAt));
	const activeWorkdays = workdays.filter((entry: any) => !['completed', 'rejected', 'failed'].includes(String(entry.state).toLowerCase())).slice(0, 6);
	const approvals = bundles.flatMap((bundle: any) => bundle.approvals.map((approval: any) => ({
		...approval,
		projectName: bundle.project?.name,
	})));
	const pendingApprovals = approvals
		.filter((approval: any) => ['pending', 'waiting_for_approval', 'under_review'].includes(String(approval.state ?? '').toLowerCase()))
		.map(operationEventFromApproval)
		.slice(0, 8);
	const queuedWork = bundles.flatMap((bundle: any) => safeArray(bundle.agents?.taskHealth?.activeTasks).map((task: any) => ({
		id: `task-${task.id}`,
		title: `${bundle.project?.name ?? 'Project'}: ${describeState(task.type, 'task')}`,
		description: describeState(task.state, 'queued'),
		category: 'execution' as const,
		state: task.state,
		tone: toneForState(task.state),
		timestamp: task.updatedAt ?? task.createdAt ?? null,
		href: workdays.find((entry: any) => entry.id === task.workDayId)?.href ?? '/app/projects',
		meta: describeState(task.priority, 'task'),
	}))).slice(0, 6);
	const repositoryHealth = bundles.flatMap((bundle: any) => safeArray(bundle.summary?.repositories).map((repository: any) => ({
		id: `repository-${repository.id ?? repository.name ?? repository.role}`,
		title: `${repository.owner ? `${repository.owner}/` : ''}${repository.name ?? repository.role ?? 'Repository'}`,
		description: `${bundle.project?.name ?? 'Project'} - ${describeState(repository.status, 'connected')}`,
		category: 'infrastructure' as const,
		state: repository.status,
		tone: toneForState(repository.status),
		href: projectHref(bundle.project?.id),
		meta: repository.role ?? 'repository',
	}))).slice(0, 8);
	const recentKnowledge = bundles.flatMap((bundle: any) => [
		...safeArray(bundle.agents?.knowledgeDrafts).map((entry: any) => entry.knowledgeDraft ?? entry),
		...safeArray(bundle.agents?.generatedArtifacts).filter((entry: any) => String(entry.artifactKind ?? '').includes('knowledge')),
	]).map((artifact: any) => ({
		id: artifact.id ?? artifact.draftId ?? artifact.taskId ?? artifactTitle(artifact),
		title: artifactTitle(artifact),
		description: describeState(artifact.state ?? artifact.reviewState ?? artifact.artifactKind, 'Generated from operational work'),
		href: knowledgeHref(artifact.id ?? artifact.draftId),
		tone: toneForState(artifact.state ?? artifact.reviewState),
	})).slice(0, 6);
	const recentDecisions = approvals
		.filter((approval: any) => approval.decidedAt || approval.decided_at || ['approved', 'rejected'].includes(String(approval.state ?? '').toLowerCase()))
		.map(operationEventFromApproval)
		.slice(0, 5);
	const recentReleases = bundles.flatMap((bundle: any) => safeArray(bundle.releases?.history).map((release: any) => ({
		id: `release-${release.id ?? release.releaseTag ?? release.environment}`,
		title: `${bundle.project?.name ?? 'Project'} ${release.releaseTag ?? release.environment ?? 'release'}`,
		description: describeState(release.status, 'release recorded'),
		category: 'governance' as const,
		state: release.status,
		tone: toneForState(release.status),
		timestamp: release.finishedAt ?? release.startedAt ?? release.createdAt ?? null,
		href: '/app/work/decisions',
		meta: release.environment ?? 'release',
	}))).slice(0, 5);

	return {
		context,
		teamName: teamLabel(context.activeTeam),
		currentObjective: activeWorkdays[0]?.objective ?? 'Coordinate durable organizational work',
		summary: activeWorkdays.length
			? `${activeWorkdays.length} active workday${activeWorkdays.length === 1 ? '' : 's'} with ${pendingApprovals.length} governance item${pendingApprovals.length === 1 ? '' : 's'} waiting.`
			: 'No active workdays are currently running. Mission Control is ready for the next objective.',
		metrics: [
			{ label: 'Active workdays', value: activeWorkdays.length, tone: activeWorkdays.length ? 'info' : 'muted' },
			{ label: 'Pending approvals', value: pendingApprovals.length, tone: pendingApprovals.length ? 'warning' : 'success' },
			{ label: 'Projects in context', value: context.projects.length },
			{ label: 'Knowledge outputs', value: recentKnowledge.length, tone: recentKnowledge.length ? 'accent' : 'muted' },
		],
		activeWorkdays,
		queuedWork,
		pendingApprovals,
		repositoryHealth,
		recentKnowledge,
		recentDecisions,
		recentReleases,
	};
}
