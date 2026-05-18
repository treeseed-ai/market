import {
	compareDatesDesc,
	loadOperationalContext,
	loadProjectBundle,
	normalizeWorkdayEntry,
	type OperationalContext,
	type OperationalMetric,
} from './shared.js';
import { buildWorkdayProjection, type OperationalPhase, type OperationalTimelineEvent } from '../lib/market/workday-projection.js';

export interface WorkdayListViewModel {
	context: OperationalContext;
	metrics: OperationalMetric[];
	workdays: any[];
}

export interface WorkdayDetailViewModel extends WorkdayListViewModel {
	workday: any | null;
	phases: OperationalPhase[];
	timeline: OperationalTimelineEvent[];
	artifacts: any[];
	repositoryContext: any[];
	governance: OperationalTimelineEvent[];
	capacity: any;
	knowledgeOutputs: any[];
	agentActivity: any[];
}

export async function loadWorkdayListViewModel(locals: App.Locals): Promise<WorkdayListViewModel> {
	const context = await loadOperationalContext(locals);
	const bundles = await Promise.all(context.projects.map((project: any) => loadProjectBundle(context, project)));
	const workdays = bundles
		.flatMap((bundle: any) => [
			...bundle.workdays.map((entry: any) => normalizeWorkdayEntry(bundle.project, entry)),
			...(bundle.agents?.currentWorkday ? [normalizeWorkdayEntry(bundle.project, bundle.agents.currentWorkday, 'runtime')] : []),
		])
		.filter((entry: any, index: number, all: any[]) => all.findIndex((candidate: any) => candidate.id === entry.id) === index)
		.sort((left: any, right: any) => compareDatesDesc(left.updatedAt, right.updatedAt));
	const activeCount = workdays.filter((entry: any) => !['completed', 'failed', 'rejected'].includes(String(entry.state).toLowerCase())).length;
	const completedCount = workdays.filter((entry: any) => String(entry.state).toLowerCase() === 'completed').length;

	return {
		context,
		workdays,
		metrics: [
			{ label: 'Tracked workdays', value: workdays.length },
			{ label: 'Active', value: activeCount, tone: activeCount ? 'info' : 'muted' },
			{ label: 'Completed', value: completedCount, tone: completedCount ? 'success' : 'muted' },
			{ label: 'Projects represented', value: new Set(workdays.map((entry: any) => entry.projectId)).size },
		],
	};
}

export async function loadWorkdayDetailViewModel(locals: App.Locals, workdayId: string): Promise<WorkdayDetailViewModel> {
	const list = await loadWorkdayListViewModel(locals);
	const workday = list.workdays.find((entry: any) => entry.id === workdayId || entry.recordId === workdayId) ?? null;
	if (!workday || !list.context.store) {
		return {
			...list,
			workday,
			phases: [],
			timeline: [],
			artifacts: [],
			repositoryContext: [],
			governance: [],
			capacity: null,
			knowledgeOutputs: [],
			agentActivity: [],
		};
	}

	const projection = await buildWorkdayProjection({
		store: list.context.store,
		principal: list.context.principal,
		projects: list.context.projects,
		workdayId,
	});

	return {
		...list,
		workday: projection?.workday ?? workday,
		phases: projection?.phases ?? [],
		timeline: projection?.timeline ?? [],
		artifacts: projection?.artifacts ?? [],
		repositoryContext: projection?.repositoryContext ?? [],
		governance: projection?.governance ?? [],
		capacity: projection?.capacity ?? null,
		knowledgeOutputs: projection?.knowledgeOutputs ?? [],
		agentActivity: projection?.agentActivity ?? [],
	};
}
