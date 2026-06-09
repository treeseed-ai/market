import { safeArray } from './shared.ts';

type Tone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const ACTIVE_DEPLOYMENT_STATUSES = new Set(['queued', 'claimed', 'dispatching', 'running', 'monitoring']);
const TERMINAL_DEPLOYMENT_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'timed_out']);

const ACTION_LABELS: Record<string, string> = {
	deploy_web: 'Deploy web',
	publish_content: 'Publish content',
	monitor: 'Monitor',
};

const ENVIRONMENT_LABELS: Record<string, string> = {
	staging: 'Staging',
	prod: 'Production',
};

export interface DeploymentViewModel {
	project: {
		id: string;
		name: string;
		slug: string;
	};
	summary: Array<{
		label: string;
		value: string;
		description: string;
		tone: Tone;
		href?: string | null;
	}>;
	launch: {
		status: string;
		label: string;
		description: string;
		tone: Tone;
		deployHref: string | null;
		actions: Array<{ action: string; label: string; url: string; method: string; description: string }>;
		inspect: { summary: string; command: string | null } | null;
		events: Array<{ id: string; label: string; description: string; timestamp: string | null; tone: Tone }>;
	};
	nextAction: {
		code: string;
		label: string;
		description: string;
		action: string | null;
		environment: string | null;
		tone: Tone;
	};
	readiness: {
		ready: boolean;
		label: string;
		checks: Array<{ code: string; label: string; message: string; help: string; ready: boolean; tone: Tone; href?: string }>;
		blockers: Array<{ code: string; message: string; href?: string }>;
	};
	environments: DeploymentEnvironmentCard[];
	timeline: DeploymentTimelineItem[];
	historyRows: DeploymentHistoryRow[];
	runner: {
		status: string;
		tone: Tone;
		label: string;
		lastHeartbeatAt: string | null;
		activeJobCount: string;
		capabilities: string[];
	};
	troubleshooting: Array<{ title: string; description: string; tone: Tone; href?: string }>;
	activeDeployment: any | null;
	activeStateUrl: string | null;
	showSensitiveUnlock: boolean;
}

export interface DeploymentEnvironmentCard {
	environment: 'staging' | 'prod';
	label: string;
	status: string;
	tone: Tone;
	url: string | null;
	latestSummary: string;
	latestCompletedAt: string | null;
	workflowUrl: string | null;
	monitorSummary: string;
	monitor: {
		status: string;
		label: string;
		tone: Tone;
		checkedAt: string | null;
		counts: { passed: number; warnings: number; failed: number; skipped: number };
		checks: Array<{ key: string; label: string; status: string; summary: string; tone: Tone; url: string | null; inspectCommand: string | null }>;
	};
	actions: DeploymentActionForm[];
}

export interface DeploymentActionForm {
	action: string;
	label: string;
	environment: 'staging' | 'prod';
	disabled: boolean;
	blockers: Array<{ code: string; message: string; href?: string }>;
	requiresProductionConfirmation: boolean;
	description: string;
}

export interface DeploymentTimelineItem {
	id: string;
	phase: string;
	title: string;
	description: string;
	status: string;
	tone: Tone;
	createdAt: string | null;
	meta: string;
}

export interface DeploymentHistoryRow {
	id: string;
	environment: string;
	action: string;
	status: string;
	statusTone: Tone;
	startedAt: string;
	completedAt: string;
	workflowUrl: string | null;
	url: string | null;
	requestedBy: string;
}

function text(value: unknown, fallback = ''): string {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function titleCase(value: unknown, fallback = 'Not recorded'): string {
	const normalized = text(value, fallback).replace(/[._-]+/gu, ' ');
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function statusTone(status: unknown): Tone {
	const value = text(status).toLowerCase();
	if (['succeeded', 'success', 'ready', 'online', 'complete', 'completed', 'active', 'healthy', 'passed'].includes(value)) return 'success';
	if (['queued', 'claimed', 'dispatching', 'running', 'monitoring', 'stale', 'unknown', 'repository_provisioning', 'content_bootstrap', 'workflow_installing', 'cloudflare_provisioning', 'initial_deploy_running', 'degraded', 'warning', 'skipped'].includes(value)) return 'warning';
	if (['failed', 'cancelled', 'timed_out', 'offline', 'blocked'].includes(value)) return 'danger';
	if (['installing', 'provisioning'].includes(value)) return 'info';
	return 'default';
}

function readinessHelp(code: unknown, label: unknown): string {
	const value = text(code);
	const fallback = `${titleCase(label, 'This check')} helps TreeSeed decide whether deployment can safely continue.`;
	const descriptions: Record<string, string> = {
		project_exists: 'Confirms the project record exists in the API. Deployment cannot run without the project identity and ownership information.',
		repository_configured: 'Confirms TreeSeed knows which GitHub repository should receive workflows, environment variables, and deployment commits.',
		workflow_installable: 'Confirms the selected repository can accept the deployment workflow that TreeSeed dispatches for staging and production work.',
		web_host_configured: 'Confirms a web hosting target exists, such as the Cloudflare host and deployment destination used to publish the site.',
		staging_environment: 'Confirms the staging environment exists. Staging is the first place TreeSeed deploys and verifies project changes.',
		production_environment: 'Confirms the production environment exists or can be initialized when production deployment is requested.',
		runner_ready: 'Checks the Market operations runner state. Deployment work can be queued even if the runner is temporarily waiting to pick it up.',
		no_active_operation: 'Prevents overlapping deployment work for the same target so one operation does not overwrite or confuse another.',
		production_confirmation: 'Requires an explicit confirmation before production-changing actions, while staging and monitor actions can proceed without it.',
	};
	return descriptions[value] ?? fallback;
}

function dateLabel(value: unknown, fallback = 'Not recorded'): string {
	const raw = text(value);
	if (!raw) return fallback;
	const date = new Date(raw);
	if (Number.isNaN(date.getTime())) return raw;
	return date.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

function externalUrl(...values: unknown[]): string | null {
	for (const value of values) {
		const raw = text(value);
		if (!raw) continue;
		try {
			const url = new URL(raw);
			if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
		} catch {
			continue;
		}
	}
	return null;
}

function workflowUrl(deployment: any): string | null {
	const workflow = deployment?.externalWorkflow ?? {};
	return externalUrl(workflow.url, workflow.htmlUrl, workflow.runUrl, workflow.workflowUrl);
}

function deploymentUrl(deployment: any, environment: any, fallbackTarget: any): string | null {
	return externalUrl(
		deployment?.target?.url,
		deployment?.target?.previewUrl,
		environment?.baseUrl,
		fallbackTarget?.url,
		fallbackTarget?.previewUrl,
	);
}

function latestForEnvironment(state: any, environment: 'staging' | 'prod') {
	return state?.latestDeployments?.[environment] ?? safeArray(state?.recentDeployments).find((deployment: any) => deployment?.environment === environment) ?? null;
}

function environmentRecord(state: any, environment: 'staging' | 'prod') {
	return safeArray(state?.environments).find((entry: any) => entry?.environment === environment) ?? null;
}

function actionForms(state: any, environment: 'staging' | 'prod'): DeploymentActionForm[] {
	return safeArray(state?.actions)
		.filter((entry: any) => entry?.environment === environment)
		.map((entry: any) => {
			const blockers = safeArray(entry?.blockedBy).filter((blocker: any) => blocker?.code !== 'production_confirmation_required');
			const requiresProductionConfirmation = environment === 'prod' && entry?.action !== 'monitor';
			return {
				action: text(entry?.action, 'deploy_web'),
				label: ACTION_LABELS[text(entry?.action)] ?? titleCase(entry?.action, 'Deploy'),
				environment,
				disabled: blockers.length > 0,
				blockers: blockers.map((blocker: any) => ({
					code: text(blocker?.code, 'blocked'),
					message: text(blocker?.message, 'This action is blocked.'),
					...(blocker?.href ? { href: String(blocker.href) } : {}),
				})),
				requiresProductionConfirmation,
				description: requiresProductionConfirmation
					? 'Requires explicit production confirmation.'
					: entry?.action === 'monitor'
						? 'Checks the latest deployment health.'
						: 'Queues a Market operation for this environment.',
			};
		});
}

function monitorCard(monitor: any): DeploymentEnvironmentCard['monitor'] {
	const checks = safeArray(monitor?.checks).map((check: any) => {
		const status = text(check?.status, 'skipped');
		return {
			key: text(check?.key, 'monitor_check'),
			label: text(check?.label, titleCase(check?.key, 'Monitor check')),
			status,
			summary: text(check?.summary, 'Monitor check recorded.'),
			tone: statusTone(status),
			url: externalUrl(check?.url),
			inspectCommand: text(check?.inspectCommand) || null,
		};
	});
	return {
		status: text(monitor?.status, checks.length > 0 ? 'unknown' : 'not_recorded'),
		label: titleCase(monitor?.status, checks.length > 0 ? 'Unknown' : 'Not recorded'),
		tone: statusTone(monitor?.status),
		checkedAt: monitor?.checkedAt ?? null,
		counts: {
			passed: checks.filter((check) => check.status === 'passed').length,
			warnings: checks.filter((check) => check.status === 'warning').length,
			failed: checks.filter((check) => check.status === 'failed').length,
			skipped: checks.filter((check) => check.status === 'skipped').length,
		},
		checks,
	};
}

function environmentCard(state: any, environment: 'staging' | 'prod'): DeploymentEnvironmentCard {
	const latest = latestForEnvironment(state, environment);
	const record = environmentRecord(state, environment);
	const url = deploymentUrl(latest, record, environment === 'staging' ? state?.target : null);
	const monitor = state?.latestMonitors?.[environment] ?? null;
	const monitorDisplay = monitorCard(monitor);
	const status = text(latest?.status, record ? 'ready' : 'not configured');
	return {
		environment,
		label: ENVIRONMENT_LABELS[environment],
		status,
		tone: statusTone(status),
		url,
		latestSummary: text(latest?.summary, latest ? `${titleCase(latest?.action, 'Deployment')} is ${titleCase(status).toLowerCase()}.` : 'No deployment recorded.'),
		latestCompletedAt: latest?.completedAt ?? latest?.finishedAt ?? null,
		workflowUrl: workflowUrl(latest),
		monitorSummary: text(monitor?.summary, monitor?.status ? `Monitor ${titleCase(monitor.status).toLowerCase()}.` : 'No monitor result recorded.'),
		monitor: monitorDisplay,
		actions: actionForms(state, environment),
	};
}

function launchStatus(launch: any): DeploymentViewModel['launch'] {
	if (!launch) {
		return {
			status: 'not_launched',
			label: 'Not launched',
			description: 'Launch records appear once project setup queues repository, workflow, or host work.',
			tone: 'warning',
			deployHref: null,
			actions: [],
			inspect: null,
			events: [],
		};
	}
	const status = text(launch.status ?? launch.state, 'queued');
	return {
		status,
		label: titleCase(status, 'Queued'),
		description: text(launch.summary ?? launch.message, 'Latest project launch activity is recorded.'),
		tone: statusTone(status),
		deployHref: text(launch.deployHref) || null,
		actions: safeArray(launch.actions).map((action: any) => ({
			action: text(action?.action, 'launch_action'),
			label: text(action?.label, titleCase(action?.action, 'Launch action')),
			url: text(action?.url),
			method: text(action?.method, 'POST'),
			description: text(action?.description, 'Queue launch recovery work.'),
		})).filter((action) => action.url),
		inspect: launch.inspect ? {
			summary: text(launch.inspect.summary, 'Inspect the launch failure details.'),
			command: text(launch.inspect.command) || null,
		} : null,
		events: safeArray(launch.events).map((event: any, index) => ({
			id: text(event?.id, `launch-event-${index}`),
			label: titleCase(event?.title ?? event?.kind ?? event?.phase ?? event?.status, 'Launch event'),
			description: text(event?.summary ?? event?.message, 'Launch event recorded.'),
			timestamp: event?.createdAt ?? event?.timestamp ?? null,
			tone: statusTone(event?.status ?? event?.severity),
		})),
	};
}

function nextAction(state: any, launch: DeploymentViewModel['launch']): DeploymentViewModel['nextAction'] {
	const raw = state?.nextAction ?? {};
	const code = text(raw.code, 'deployment_ready');
	const label = text(raw.label, code === 'deploy_staging' ? 'Deploy staging' : 'Next action');
	let tone: Tone = 'info';
	if (code === 'launch_recovery') tone = 'danger';
	if (code === 'deploy_staging' || code === 'deployment_ready') tone = 'success';
	if (code === 'launch_active' || code === 'deployment_active') tone = 'warning';
	return {
		code,
		label,
		description: text(raw.description, launch.description),
		action: text(raw.action) || null,
		environment: text(raw.environment) || null,
		tone,
	};
}

function phaseForEvent(kind: unknown): string {
	const value = text(kind).toLowerCase();
	if (value.includes('preflight')) return 'Preflight';
	if (value.includes('workflow')) return 'Workflow';
	if (value.includes('monitor')) return 'Monitor';
	if (value.includes('cancel') || value.includes('succeeded') || value.includes('failed')) return 'Completion';
	if (value.includes('operation')) return 'Operation';
	return 'Request';
}

function eventTitle(event: any): string {
	const kind = text(event?.kind, 'deployment.event').replace(/^deployment\./u, '');
	return titleCase(kind, 'Deployment event');
}

export function buildDeploymentTimeline(events: any[]): DeploymentTimelineItem[] {
	return safeArray(events)
		.slice()
		.sort((left: any, right: any) => {
			const sequence = Number(left?.sequence ?? 0) - Number(right?.sequence ?? 0);
			if (sequence !== 0) return sequence;
			return Date.parse(text(left?.createdAt)) - Date.parse(text(right?.createdAt));
		})
		.map((event: any, index) => {
			const status = text(event?.status, text(event?.severity, 'recorded'));
			return {
				id: text(event?.id, `deployment-event-${index}`),
				phase: phaseForEvent(event?.kind),
				title: eventTitle(event),
				description: text(event?.message, 'Deployment event recorded.'),
				status,
				tone: statusTone(status === 'error' ? 'failed' : status),
				createdAt: event?.createdAt ?? null,
				meta: [dateLabel(event?.createdAt, ''), titleCase(status, '')].filter(Boolean).join(' · '),
			};
		});
}

function historyRows(state: any): DeploymentHistoryRow[] {
	return safeArray(state?.recentDeployments).map((deployment: any) => {
		const environment = text(deployment?.environment, 'staging') === 'prod' ? 'prod' : 'staging';
		const record = environmentRecord(state, environment);
		return {
			id: text(deployment?.id, `deployment-${environment}`),
			environment: ENVIRONMENT_LABELS[environment],
			action: ACTION_LABELS[text(deployment?.action)] ?? titleCase(deployment?.action, 'Deployment'),
			status: titleCase(deployment?.status, 'Queued'),
			statusTone: statusTone(deployment?.status),
			startedAt: dateLabel(deployment?.startedAt ?? deployment?.createdAt),
			completedAt: dateLabel(deployment?.completedAt ?? deployment?.finishedAt),
			workflowUrl: workflowUrl(deployment),
			url: deploymentUrl(deployment, record, state?.target),
			requestedBy: text(deployment?.requestedByUserId ?? deployment?.triggeredByType, 'Market operation'),
		};
	});
}

function buildSummary(state: any, environments: DeploymentEnvironmentCard[], launch: DeploymentViewModel['launch']) {
	const latestSuccess = safeArray(state?.recentDeployments).find((deployment: any) => deployment?.status === 'succeeded') ?? null;
	const active = safeArray(state?.activeOperations)[0] ?? null;
	const staging = environments.find((environment) => environment.environment === 'staging');
	const production = environments.find((environment) => environment.environment === 'prod');
	return [
		{
			label: 'Readiness',
			value: state?.readiness?.ready ? 'Ready' : 'Blocked',
			description: state?.readiness?.ready ? 'Deployment actions can be queued.' : 'Resolve readiness blockers first.',
			tone: state?.readiness?.ready ? 'success' as Tone : 'warning' as Tone,
		},
		{
			label: 'Staging URL',
			value: staging?.url ? 'Available' : 'Not recorded',
			description: staging?.url ?? 'Staging URL appears after host setup or deploy.',
			tone: staging?.url ? 'success' as Tone : 'default' as Tone,
			href: staging?.url,
		},
		{
			label: 'Production URL',
			value: production?.url ? 'Available' : 'Not recorded',
			description: production?.url ?? 'Production URL appears after production setup.',
			tone: production?.url ? 'success' as Tone : 'default' as Tone,
			href: production?.url,
		},
		{
			label: 'Active operation',
			value: active ? titleCase(active.status, 'Active') : 'None',
			description: active ? text(active.summary, `${titleCase(active.action)} for ${ENVIRONMENT_LABELS[active.environment] ?? active.environment}.`) : 'No deployment operation is active.',
			tone: active ? statusTone(active.status) : 'default' as Tone,
		},
		{
			label: 'Last success',
			value: latestSuccess ? dateLabel(latestSuccess.completedAt ?? latestSuccess.finishedAt ?? latestSuccess.createdAt) : 'None',
			description: latestSuccess ? text(latestSuccess.summary, 'Latest successful deployment.') : 'Successful deployments appear here.',
			tone: latestSuccess ? 'success' as Tone : 'default' as Tone,
		},
		{
			label: 'Launch',
			value: launch.label,
			description: launch.description,
			tone: launch.tone,
		},
	];
}

function troubleshooting(state: any, history: DeploymentHistoryRow[]): DeploymentViewModel['troubleshooting'] {
	const hints: DeploymentViewModel['troubleshooting'] = [];
	const seen = new Set<string>();
	const pushHint = (hint: DeploymentViewModel['troubleshooting'][number]) => {
		const key = `${hint.description}:${hint.href ?? ''}`.toLowerCase().replace(/\s+/gu, ' ').trim();
		if (!key || seen.has(key)) return;
		seen.add(key);
		hints.push(hint);
	};
	const latestFailed = safeArray(state?.recentDeployments).find((deployment: any) => ['failed', 'timed_out', 'cancelled'].includes(deployment?.status));
	const inspectCommand = text(latestFailed?.error?.inspectCommand ?? latestFailed?.error?.command, '');
	if (latestFailed) {
		const environment = titleCase(latestFailed.environment, 'Deployment');
		pushHint({
			title: `${environment} deployment ${titleCase(latestFailed.status, 'stopped').toLowerCase()}`,
			description: text(latestFailed.error?.summary ?? latestFailed.error?.message, inspectCommand || 'Review the latest deployment event timeline for details.'),
			tone: statusTone(latestFailed.status),
		});
	}
	if (state?.launch?.status === 'failed' || state?.launch?.status === 'cancelled') {
		pushHint({
			title: state.launch.status === 'failed' ? 'Project launch failed' : 'Project launch cancelled',
			description: text(state.launch.error?.summary ?? state.launch.summary, 'Use launch retry or resume to continue setup.'),
			tone: statusTone(state.launch.status),
		});
	}
	for (const blocker of safeArray(state?.readiness?.blockers)) {
		pushHint({
			title: titleCase(text(blocker?.code, 'blocked').replace(/[_-]+/gu, ' '), 'Blocked'),
			description: text(blocker?.message, 'Resolve this readiness blocker before deploying.'),
			tone: 'warning',
			...(blocker?.href ? { href: String(blocker.href) } : {}),
		});
	}
	if (hints.length === 0 && history.length === 0) {
		pushHint({
			title: 'No deployment history yet',
			description: 'Queue a staging deploy when readiness checks pass.',
			tone: 'info',
		});
	}
	return hints.slice(0, 3);
}

function hasCredentialSessionBlocker(state: any): boolean {
	const blockers = [
		...safeArray(state?.readiness?.blockers),
		...safeArray(state?.readiness?.checks),
	];
	return blockers.some((entry: any) => /credential|session|sensitive/iu.test(`${entry?.code ?? ''} ${entry?.message ?? ''}`));
}

export function buildDeploymentViewModel(state: any, events: any[] = []): DeploymentViewModel {
	const project = state?.project ?? {};
	const launch = launchStatus(state?.launch);
	const environments = [
		environmentCard(state, 'staging'),
		environmentCard(state, 'prod'),
	];
	const history = historyRows(state);
	const activeDeployment = safeArray(state?.activeOperations)[0] ?? null;
	const runnerStatus = text(state?.runner?.status, 'unknown');
	return {
		project: {
			id: text(project.id, 'project'),
			name: text(project.name, text(project.slug, 'Project')),
			slug: text(project.slug, text(project.handle, text(project.id, 'project'))),
		},
		summary: buildSummary(state, environments, launch),
		launch,
		nextAction: nextAction(state, launch),
		readiness: {
			ready: Boolean(state?.readiness?.ready),
			label: state?.readiness?.ready ? 'Ready' : 'Blocked',
			checks: safeArray(state?.readiness?.checks).map((check: any) => ({
				code: text(check?.code, 'check'),
				label: text(check?.label, titleCase(check?.code, 'Readiness check')),
				message: text(check?.message, 'Readiness check recorded.'),
				help: text(check?.help, readinessHelp(check?.code, check?.label ?? check?.code)),
				ready: Boolean(check?.ready),
				tone: check?.ready ? 'success' : 'warning',
				...(check?.href ? { href: String(check.href) } : {}),
			})),
			blockers: safeArray(state?.readiness?.blockers).map((blocker: any) => ({
				code: text(blocker?.code, 'blocked'),
				message: text(blocker?.message, 'Deployment is blocked.'),
				...(blocker?.href ? { href: String(blocker.href) } : {}),
			})),
		},
		environments,
		timeline: buildDeploymentTimeline(events),
		historyRows: history,
		runner: {
			status: runnerStatus,
			tone: statusTone(runnerStatus),
			label: titleCase(runnerStatus, 'Unknown'),
			lastHeartbeatAt: state?.runner?.lastHeartbeatAt ?? null,
			activeJobCount: state?.runner?.activeJobCount == null ? 'Not reported' : String(state.runner.activeJobCount),
			capabilities: safeArray(state?.runner?.capabilities).map((capability) => String(capability)).filter(Boolean),
		},
		troubleshooting: troubleshooting(state, history),
		activeDeployment,
		activeStateUrl: state?.project?.id ? `/v1/projects/${encodeURIComponent(state.project.id)}/deployment-state` : null,
		showSensitiveUnlock: hasCredentialSessionBlocker(state),
	};
}

export function isDeploymentTerminal(status: unknown): boolean {
	return TERMINAL_DEPLOYMENT_STATUSES.has(text(status));
}

export function isDeploymentActive(status: unknown): boolean {
	return ACTIVE_DEPLOYMENT_STATUSES.has(text(status));
}
