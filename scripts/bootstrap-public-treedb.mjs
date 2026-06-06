#!/usr/bin/env node

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function env(name, fallback = '') {
	const value = process.env[name];
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function required(name) {
	const value = env(name);
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

async function requestJson(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			accept: 'application/json',
			'content-type': 'application/json',
			...(options.headers ?? {}),
		},
	});
	const text = await response.text();
	let payload = null;
	try {
		payload = text ? JSON.parse(text) : null;
	} catch {
		payload = { raw: text };
	}
	if (!response.ok) {
		const message = payload?.error || payload?.message || text || `HTTP ${response.status}`;
		throw new Error(`${options.method ?? 'GET'} ${url} failed: ${message}`);
	}
	return payload;
}

function latestDeployment(payload) {
	const deployments = Array.isArray(payload?.payload?.deployments) ? payload.payload.deployments : [];
	return deployments[0] ?? null;
}

async function main() {
	const baseUrl = required('TREESEED_MARKET_API_BASE_URL').replace(/\/+$/u, '');
	const serviceId = required('TREESEED_API_WEB_SERVICE_ID');
	const serviceSecret = required('TREESEED_API_WEB_SERVICE_SECRET');
	const teamId = env('TREESEED_PUBLIC_TREEDB_TEAM_ID');
	const teamSlug = env('TREESEED_PUBLIC_TREEDB_TEAM_SLUG', 'treeseed-public');
	const environment = env('TREESEED_WORKFLOW_ENVIRONMENT', 'staging');
	const imageRef = env('TREESEED_PUBLIC_TREEDB_IMAGE_REF', 'treeseed/treedb:0.1.0');
	const idempotencyKey = env('TREESEED_PUBLIC_TREEDB_IDEMPOTENCY_KEY', `system:${environment}:public-treedb-federation`);
	const waitMs = Number(env('TREESEED_PUBLIC_TREEDB_WAIT_MS', '900000'));
	const pollMs = Number(env('TREESEED_PUBLIC_TREEDB_POLL_MS', '10000'));
	const deadline = Date.now() + (Number.isFinite(waitMs) && waitMs > 0 ? waitMs : 900000);
	const headers = {
		'x-treeseed-service-id': serviceId,
		'x-treeseed-service-secret': serviceSecret,
	};

	console.log(`Ensuring TreeSeed public TreeDB federation for ${teamId || teamSlug} in ${environment}.`);
	const provisioned = await requestJson(`${baseUrl}/v1/internal/treedb/public-federation/provision`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			...(teamId ? { teamId } : { teamSlug }),
			publicRead: true,
			imageRef,
			idempotencyKey,
		}),
	});
	const operation = provisioned?.payload?.operation ?? null;
	const initialDeployment = latestDeployment(provisioned);
	console.log(`Provision request accepted: operation=${operation?.id ?? 'none'} deployment=${initialDeployment?.id ?? 'none'} status=${initialDeployment?.status ?? 'unknown'}.`);
	if (!operation && initialDeployment?.status === 'succeeded') {
		console.log('TreeSeed public TreeDB federation is already provisioned.');
		return;
	}

	let lastStatus = initialDeployment?.status ?? 'queued';
	let lastOperationStatus = operation?.status ?? null;
	while (Date.now() < deadline) {
		await sleep(Number.isFinite(pollMs) && pollMs > 0 ? pollMs : 10000);
		const query = teamId
			? `teamId=${encodeURIComponent(teamId)}`
			: `teamSlug=${encodeURIComponent(teamSlug)}`;
		const status = await requestJson(`${baseUrl}/v1/internal/treedb/public-federation/status?${query}`, { headers });
		const deployment = latestDeployment(status);
		const deploymentStatus = deployment?.status ?? 'unknown';
		const operationStatus = deployment?.result?.operationStatus ?? deployment?.result?.phase ?? lastOperationStatus;
		if (deploymentStatus !== lastStatus || operationStatus !== lastOperationStatus) {
			console.log(`TreeDB deployment status: deployment=${deployment?.id ?? 'none'} status=${deploymentStatus} operation=${operationStatus ?? 'unknown'}.`);
			lastStatus = deploymentStatus;
			lastOperationStatus = operationStatus ?? null;
		}
		if (deploymentStatus === 'succeeded') {
			const base = status?.payload?.instance?.baseUrl ?? deployment?.result?.baseUrl ?? null;
			console.log(`TreeSeed public TreeDB federation is ready${base ? ` at ${base}` : ''}.`);
			return;
		}
		if (['failed', 'cancelled', 'timed_out'].includes(deploymentStatus)) {
			throw new Error(`TreeSeed public TreeDB federation provisioning failed with status ${deploymentStatus}: ${JSON.stringify(deployment?.error ?? deployment?.result ?? {})}`);
		}
	}
	throw new Error(`Timed out waiting for TreeSeed public TreeDB federation provisioning after ${waitMs}ms.`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.stack || error.message : String(error));
	process.exitCode = 1;
});
