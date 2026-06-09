type PlatformOperation = {
	id: string;
	status: string;
	pollUrl?: string;
	streamUrl?: string;
	branch?: string | null;
	commitSha?: string | null;
	changedPaths?: string[];
	output?: any;
	error?: any;
};

type JobEnvelope = {
	job?: PlatformOperation;
	operation?: PlatformOperation;
};

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function operationFromEnvelope(payload: JobEnvelope | null) {
	return payload?.job ?? payload?.operation ?? null;
}

function firstHref(...values: any[]) {
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) return value.trim();
	}
	return null;
}

export function platformOperationHref(operation: PlatformOperation | null, fallback: string) {
	const output = operation?.output ?? {};
	const nested = output.output ?? {};
	return firstHref(
		output.href,
		nested.href,
		output.record?.href,
		nested.record?.href,
		output.child?.href,
		nested.child?.href,
		output.decision?.href,
		nested.decision?.href,
	) ?? fallback;
}

function operationMessage(operation: PlatformOperation, events: any[]) {
	const output = operation.output ?? {};
	const branch = operation.branch ?? output.operationBranch ?? output.branch;
	const commitSha = operation.commitSha ?? output.commitSha;
	const changedPaths = Array.isArray(operation.changedPaths) ? operation.changedPaths : Array.isArray(output.changedPaths) ? output.changedPaths : [];
	const suffix = [
		branch ? `branch ${branch}` : null,
		commitSha ? `commit ${String(commitSha).slice(0, 12)}` : null,
		changedPaths.length ? `${changedPaths.length} changed path${changedPaths.length === 1 ? '' : 's'}` : null,
	].filter(Boolean).join(', ');
	if (operation.status === 'succeeded') return suffix ? `Completed: ${suffix}.` : 'Completed.';
	if (operation.status === 'failed') return operation.error?.message || 'Operation failed.';
	if (operation.status === 'cancelled') return 'Operation was cancelled.';
	const latest = events.at(-1);
	if (latest?.kind) return `Working: ${String(latest.kind).replace(/[._-]+/gu, ' ')}...`;
	return `Queued: ${operation.status}...`;
}

export async function submitPlatformOperationForm(options: {
	url: string;
	body: Record<string, any>;
	statusElement?: HTMLElement | null;
	fallbackHref: string;
	initialMessage?: string;
	timeoutMs?: number;
}) {
	const status = options.statusElement;
	if (status) status.textContent = options.initialMessage ?? 'Queuing operation...';
	const response = await fetch(options.url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(options.body),
	});
	const payload = await response.json().catch(() => null);
	if (!response.ok || payload?.ok === false) {
		throw new Error(payload?.error ?? 'Operation could not be queued.');
	}
	const queued = operationFromEnvelope(payload);
	if (!queued?.id) {
		const href = payload?.payload?.href ?? options.fallbackHref;
		window.location.href = href;
		return;
	}
	if (status) status.textContent = 'Queued. Waiting for the Treeseed operations runner...';
	const started = Date.now();
	const timeoutMs = options.timeoutMs ?? 120_000;
	let operation = queued;
	let events: any[] = [];
	while (!TERMINAL_STATUSES.has(operation.status) && Date.now() - started <= timeoutMs) {
		await delay(1000);
		const [operationResponse, eventsResponse] = await Promise.all([
			fetch(operation.pollUrl ?? `/v1/platform/operations/${encodeURIComponent(operation.id)}`),
			fetch(operation.streamUrl ?? `/v1/platform/operations/${encodeURIComponent(operation.id)}/events`),
		]);
		const operationPayload = await operationResponse.json().catch(() => null);
		const eventsPayload = await eventsResponse.json().catch(() => null);
		if (!operationResponse.ok || operationPayload?.ok === false) {
			throw new Error(operationPayload?.error ?? 'Operation status could not be loaded.');
		}
		operation = operationFromEnvelope(operationPayload) ?? operation;
		events = Array.isArray(eventsPayload?.events) ? eventsPayload.events : events;
		if (status) status.textContent = operationMessage(operation, events);
	}
	if (!TERMINAL_STATUSES.has(operation.status)) {
		throw new Error('Operation is still running. Check the operation status and try refreshing.');
	}
	if (operation.status !== 'succeeded') {
		throw new Error(operation.error?.message || `Operation ${operation.status}.`);
	}
	if (status) status.textContent = 'Completed. Refreshing...';
	window.location.href = platformOperationHref(operation, options.fallbackHref);
}
