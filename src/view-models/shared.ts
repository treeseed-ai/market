export type OperationalTone = 'default' | 'muted' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export interface OperationalMetric {
	label: string;
	value: string | number;
	description?: string;
	tone?: OperationalTone;
}

export interface OperationalLink {
	label: string;
	href: string;
}

export interface OperationalContext {
	store: any | null;
	principal: any | null;
	teams: any[];
	activeTeam: any | null;
	projects: any[];
}

export interface OperationalEvent {
	id: string;
	title: string;
	description?: string;
	category: 'objective' | 'research' | 'execution' | 'governance' | 'knowledge' | 'infrastructure';
	state?: string;
	tone?: OperationalTone;
	timestamp?: string | null;
	href?: string;
	meta?: string;
}

export function safeArray<T = any>(value: unknown): T[] {
	return Array.isArray(value) ? value as T[] : [];
}

export function compact(value: unknown, fallback = ''): string {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function numberValue(value: unknown, fallback = 0): number {
	const next = Number(value);
	return Number.isFinite(next) ? next : fallback;
}

export function teamLabel(team: any | null): string {
	return compact(team?.displayName, compact(team?.name, compact(team?.slug, 'Organization')));
}

export function projectHref(projectId: unknown): string {
	return projectId ? `/app/projects/${encodeURIComponent(compact(projectId, 'project'))}` : '/app/projects';
}

export function workdayHref(workdayId: unknown): string {
	return `/app/work/objectives#work-${anchorPart(workdayId)}`;
}

export function approvalHref(approvalId: unknown): string {
	return approvalId ? `/app/work/decisions/${encodeURIComponent(compact(approvalId, 'decision'))}` : '/app/work/decisions';
}

export function knowledgeHref(artifactId: unknown): string {
	return artifactId ? `/app/knowledge/operations/${anchorPart(artifactId).toLowerCase()}` : '/app/knowledge/artifacts';
}

export function anchorPart(value: unknown): string {
	return compact(value, 'item').replace(/[^a-zA-Z0-9_-]+/gu, '-');
}

export function latestDate(...values: unknown[]): string | null {
	return values.map((value) => compact(value, '')).find(Boolean) ?? null;
}

export function compareDatesDesc(left?: string | null, right?: string | null): number {
	return Date.parse(right ?? '') - Date.parse(left ?? '');
}

export function toneForState(state: unknown): OperationalTone {
	const value = compact(state, '').toLowerCase();
	if (['completed', 'approved', 'published', 'succeeded', 'success', 'active', 'ready'].includes(value)) return 'success';
	if (['pending', 'queued', 'waiting_for_approval', 'under_review', 'approval_required'].includes(value)) return 'warning';
	if (['failed', 'rejected', 'blocked', 'critical', 'expired'].includes(value)) return 'danger';
	if (['paused', 'escalated', 'running', 'executing', 'verifying'].includes(value)) return 'info';
	return 'default';
}

export function describeState(state: unknown, fallback = 'not recorded'): string {
	return compact(state, fallback).replaceAll('_', ' ');
}

export async function loadProjectBundle(context: OperationalContext, project: any): Promise<any> {
	const store = context.store;
	if (!store || !project) {
		return {
			project,
			summary: null,
			agents: null,
			workdays: [],
			approvals: [],
			capacity: null,
			releases: null,
		};
	}

	const [summary, agents, workdays, approvals, capacity, releases] = await Promise.all([
		typeof store.getProjectSummary === 'function' ? store.getProjectSummary(project.id, context.principal).catch(() => null) : null,
		typeof store.getProjectAgentsSummary === 'function' ? store.getProjectAgentsSummary(project.id, context.principal).catch(() => null) : null,
		typeof store.listProjectWorkdaySummaries === 'function' ? store.listProjectWorkdaySummaries(project.id, null).catch(() => []) : [],
		typeof store.listApprovalRequestsForProject === 'function' ? store.listApprovalRequestsForProject(project.id, 50).catch(() => []) : [],
		typeof store.getProjectCapacitySummary === 'function' ? store.getProjectCapacitySummary(project.id, 'staging').catch(() => null) : null,
		typeof store.getProjectReleasesSummary === 'function' ? store.getProjectReleasesSummary(project.id, context.principal).catch(() => null) : null,
	]);

	return {
		project,
		summary,
		agents,
		workdays: safeArray(workdays),
		approvals: safeArray(approvals),
		capacity,
		releases,
	};
}

export function normalizeWorkdayEntry(project: any, entry: any, source = 'summary'): any {
	const workdayId = compact(entry?.workDayId, compact(entry?.work_day_id, compact(entry?.id, 'workday')));
	const summary = entry?.summary && typeof entry.summary === 'object' ? entry.summary : {};
	const docsAutomation = summary?.docsAutomation && typeof summary.docsAutomation === 'object' ? summary.docsAutomation : {};
	const contentSnapshot = summary?.contentSnapshot && typeof summary.contentSnapshot === 'object' ? summary.contentSnapshot : {};
	return {
		id: workdayId,
		recordId: compact(entry?.id, workdayId),
		projectId: compact(entry?.projectId, compact(project?.id, '')),
		projectName: compact(project?.name, compact(project?.slug, 'Project')),
		projectSlug: compact(project?.slug, ''),
		environment: compact(entry?.environment, 'staging'),
		kind: compact(entry?.kind, source),
		state: compact(entry?.state, compact(entry?.status, 'active')),
		objective: compact(summary?.objective, compact(summary?.title, compact(contentSnapshot?.title, `Operational workday ${workdayId}`))),
		startedAt: latestDate(entry?.startedAt, entry?.started_at, summary?.startedAt),
		endedAt: latestDate(entry?.endedAt, entry?.ended_at, summary?.endedAt),
		updatedAt: latestDate(entry?.updatedAt, entry?.updated_at, entry?.createdAt, entry?.created_at),
		summary,
		docsAutomation,
		contentSnapshot,
		href: workdayHref(workdayId),
		tone: toneForState(entry?.state ?? entry?.status),
	};
}

export function operationEventFromApproval(approval: any): OperationalEvent {
	const id = compact(approval?.id, 'approval');
	return {
		id: `approval-${id}`,
		title: compact(approval?.title, 'Approval requested'),
		description: compact(approval?.summary, describeState(approval?.kind, 'Operational review')),
		category: 'governance',
		state: compact(approval?.state, 'pending'),
		tone: toneForState(approval?.state ?? approval?.severity),
		timestamp: latestDate(approval?.createdAt, approval?.created_at, approval?.decidedAt, approval?.decided_at),
		href: approvalHref(id),
		meta: describeState(approval?.severity, 'review'),
	};
}

export function artifactTitle(artifact: any): string {
	return compact(
		artifact?.title,
		compact(artifact?.name, compact(artifact?.draftId, compact(artifact?.reportId, compact(artifact?.id, 'Operational artifact')))),
	);
}
