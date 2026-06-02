type DeploymentOperation = {
	id: string;
	status: string;
	pollUrl?: string;
	error?: { message?: string } | null;
	output?: any;
};

type DeploymentEnvelope = {
	ok?: boolean;
	deployment?: any;
	operation?: DeploymentOperation;
	job?: DeploymentOperation;
	payload?: any;
	pollUrl?: string;
	eventsUrl?: string;
	stateUrl?: string;
	error?: string | { message?: string; code?: string };
};

const TERMINAL_OPERATION_STATUSES = new Set(['succeeded', 'completed', 'failed', 'cancelled', 'timed_out']);
const ACTIVE_DEPLOYMENT_STATUSES = new Set(['queued', 'claimed', 'dispatching', 'running', 'monitoring']);

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function operationFrom(payload: DeploymentEnvelope | null): DeploymentOperation | null {
	return payload?.operation ?? payload?.job ?? payload?.payload?.operation ?? null;
}

function jobFrom(payload: DeploymentEnvelope | null): DeploymentOperation | null {
	return payload?.job ?? payload?.payload?.job ?? payload?.payload ?? null;
}

function deploymentEventsFrom(payload: any): any[] {
	if (Array.isArray(payload?.payload)) return payload.payload;
	if (Array.isArray(payload?.events)) return payload.events;
	if (Array.isArray(payload)) return payload;
	return [];
}

function errorMessage(payload: DeploymentEnvelope | null, fallback: string) {
	const error = payload?.error;
	if (typeof error === 'string') return error;
	if (error?.message) return error.message;
	return fallback;
}

function latestEventMessage(events: any[]) {
	const event = events.at(-1);
	if (event?.message) return String(event.message);
	if (event?.kind) return String(event.kind).replace(/[._-]+/gu, ' ');
	return null;
}

function operationMessage(operation: DeploymentOperation | null, events: any[], fallback: string) {
	const eventMessage = latestEventMessage(events);
	if (eventMessage) return eventMessage;
	if (!operation) return fallback;
	if (operation.status === 'succeeded') return 'Deployment operation completed. Refreshing...';
	if (operation.status === 'failed') return operation.error?.message ?? 'Deployment operation failed. Refreshing...';
	if (operation.status === 'cancelled') return 'Deployment operation was cancelled. Refreshing...';
	return `Deployment operation ${String(operation.status).replaceAll('_', ' ')}...`;
}

async function readJson(response: Response) {
	return await response.json().catch(() => null);
}

export async function submitDeploymentActionForm(options: {
	form: HTMLFormElement;
	statusElement?: HTMLElement | null;
	fallbackHref?: string;
	timeoutMs?: number;
}) {
	const form = options.form;
	const status = options.statusElement;
	const formData = new FormData(form);
	const environment = String(formData.get('environment') ?? '').trim();
	const action = String(formData.get('action') ?? '').trim();
	const confirmProduction = formData.get('confirmProduction') === 'on';
	const body: Record<string, unknown> = {
		environment,
		action,
		source: 'market_ui',
		reason: 'Requested from Deploy page',
		idempotencyKey: `market-ui:${environment}:${action}:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
	};
	if (confirmProduction) body.confirmProduction = true;
	if (status) status.textContent = 'Queuing deployment operation...';
	const response = await fetch(form.action, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	const payload = await readJson(response) as DeploymentEnvelope | null;
	if (!response.ok || payload?.ok === false) {
		throw new Error(errorMessage(payload, 'Deployment operation could not be queued.'));
	}
	let operation = operationFrom(payload);
	const pollUrl = payload?.pollUrl ?? operation?.pollUrl ?? (operation?.id ? `/v1/platform/operations/${encodeURIComponent(operation.id)}` : null);
	const eventsUrl = payload?.eventsUrl ?? null;
	const stateUrl = payload?.stateUrl ?? form.dataset.stateUrl ?? null;
	if (!operation || !pollUrl) {
		window.location.href = options.fallbackHref ?? `${window.location.pathname}?deployment=${Date.now()}`;
		return;
	}
	const started = Date.now();
	const timeoutMs = options.timeoutMs ?? 180_000;
	let events: any[] = [];
	while (!TERMINAL_OPERATION_STATUSES.has(operation.status) && Date.now() - started <= timeoutMs) {
		await delay(1000);
		const requests = [
			fetch(pollUrl).then(readJson).catch(() => null),
			eventsUrl ? fetch(eventsUrl).then(readJson).catch(() => null) : Promise.resolve(null),
		];
		const [operationPayload, eventsPayload] = await Promise.all(requests);
		operation = operationFrom(operationPayload as DeploymentEnvelope | null) ?? operation;
		const nextEvents = deploymentEventsFrom(eventsPayload);
		if (nextEvents.length > 0) events = nextEvents;
		if (status) status.textContent = operationMessage(operation, events, 'Deployment operation is running...');
	}
	if (stateUrl) {
		await fetch(stateUrl).catch(() => null);
	}
	if (status) status.textContent = operationMessage(operation, events, 'Deployment operation finished. Refreshing...');
	window.location.href = options.fallbackHref ?? `${window.location.pathname}?deployment=${Date.now()}`;
}

export async function submitLaunchRecoveryForm(options: {
	form: HTMLFormElement;
	statusElement?: HTMLElement | null;
	fallbackHref?: string;
	timeoutMs?: number;
}) {
	const status = options.statusElement;
	if (status) status.textContent = 'Queuing launch recovery...';
	const formData = new FormData(options.form);
	const sensitivePassphrase = String(formData.get('sensitivePassphrase') ?? '').trim();
	const body: Record<string, unknown> = {
		source: 'market_ui',
	};
	if (sensitivePassphrase) body.sensitivePassphrase = sensitivePassphrase;
	const response = await fetch(options.form.action, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	const payload = await readJson(response) as DeploymentEnvelope | null;
	if (!response.ok || payload?.ok === false) {
		throw new Error(errorMessage(payload, 'Launch recovery could not be queued.'));
	}
	let job = jobFrom(payload);
	const pollUrl = job?.id ? `/v1/jobs/${encodeURIComponent(job.id)}` : null;
	if (!job || !pollUrl) {
		window.location.href = options.fallbackHref ?? `${window.location.pathname}?launch=${Date.now()}`;
		return;
	}
	const started = Date.now();
	const timeoutMs = options.timeoutMs ?? 120_000;
	while (!TERMINAL_OPERATION_STATUSES.has(job.status) && Date.now() - started <= timeoutMs) {
		await delay(1000);
		const jobPayload = await fetch(pollUrl).then(readJson).catch(() => null);
		job = jobFrom(jobPayload as DeploymentEnvelope | null) ?? job;
		if (status) status.textContent = `Launch job ${String(job.status).replaceAll('_', ' ')}...`;
	}
	if (status) status.textContent = 'Launch state refreshed.';
	window.location.href = options.fallbackHref ?? `${window.location.pathname}?launch=${Date.now()}`;
}

export function watchDeploymentState(options: {
	stateUrl: string;
	statusElement?: HTMLElement | null;
	initialActive?: boolean;
	intervalMs?: number;
}) {
	if (!options.stateUrl || !options.initialActive) return;
	const intervalMs = options.intervalMs ?? 12_000;
	const status = options.statusElement;
	let stopped = false;
	async function poll() {
		if (stopped) return;
		const response = await fetch(options.stateUrl).catch(() => null);
		const payload = response ? await readJson(response).catch(() => null) : null;
		if (!response?.ok || payload?.ok === false) {
			if (status) status.textContent = errorMessage(payload, 'Deployment state could not be refreshed.');
			return;
		}
		const active = Array.isArray(payload?.activeOperations) ? payload.activeOperations : [];
		const current = active[0] ?? null;
		if (!current || !ACTIVE_DEPLOYMENT_STATUSES.has(String(current.status))) {
			stopped = true;
			window.location.href = `${window.location.pathname}?deployment=${Date.now()}`;
			return;
		}
		if (status) status.textContent = current.summary ?? `Deployment operation ${String(current.status).replaceAll('_', ' ')}...`;
		window.setTimeout(poll, intervalMs);
	}
	window.setTimeout(poll, intervalMs);
}
