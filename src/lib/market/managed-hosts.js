function runtimeEnvValue(runtime, name) {
	const runtimeValue = runtime?.env?.[name];
	if (typeof runtimeValue === 'string' && runtimeValue.trim()) return runtimeValue.trim();
	const processEnv = typeof process !== 'undefined' && process?.env ? process.env : {};
	const processValue = processEnv[name];
	return typeof processValue === 'string' && processValue.trim() ? processValue.trim() : '';
}

function configValue(values, name) {
	const value = values?.[name];
	return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function firstRuntimeEnvValue(runtime, names, values = {}) {
	for (const name of names) {
		const configuredValue = configValue(values, name);
		if (configuredValue) return configuredValue;
		const value = runtimeEnvValue(runtime, name);
		if (value) return value;
	}
	return '';
}

function machineConfigAllowedForRuntime(runtime) {
	const localDevMode = runtimeEnvValue(runtime, 'TREESEED_LOCAL_DEV_MODE');
	const environment = runtimeEnvValue(runtime, 'TREESEED_ENVIRONMENT');
	return localDevMode === 'cloudflare' || environment === 'local';
}

async function collectLocalTreeseedConfigValues(runtime, scope = 'prod') {
	if (!machineConfigAllowedForRuntime(runtime)) {
		return {};
	}
	if (typeof process === 'undefined' || typeof process.cwd !== 'function') {
		return {};
	}
	try {
		const operationsSpecifier = '@treeseed/sdk/operations';
		const { collectTreeseedConfigSeedValues } = await import(/* @vite-ignore */ operationsSpecifier);
		if (typeof collectTreeseedConfigSeedValues === 'function') {
			return collectTreeseedConfigSeedValues(process.cwd(), scope, runtime?.env ?? process.env);
		}
	} catch {
		return {};
	}
	return {};
}

export function resolveTreeseedManagedCloudflareHostConfig(runtime, values = {}) {
	const config = {
		CLOUDFLARE_API_TOKEN: firstRuntimeEnvValue(runtime, ['TREESEED_MANAGED_CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN'], values),
		CLOUDFLARE_ACCOUNT_ID: firstRuntimeEnvValue(runtime, ['TREESEED_MANAGED_CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID', 'TREESEED_CLOUDFLARE_ACCOUNT_ID'], values),
		TREESEED_CLOUDFLARE_PAGES_PROJECT_NAME: firstRuntimeEnvValue(runtime, ['TREESEED_MANAGED_CLOUDFLARE_PAGES_PROJECT_NAME', 'TREESEED_CLOUDFLARE_PAGES_PROJECT_NAME'], values),
		TREESEED_CLOUDFLARE_PAGES_PREVIEW_PROJECT_NAME: firstRuntimeEnvValue(runtime, ['TREESEED_MANAGED_CLOUDFLARE_PAGES_PREVIEW_PROJECT_NAME', 'TREESEED_CLOUDFLARE_PAGES_PREVIEW_PROJECT_NAME'], values),
		TREESEED_CONTENT_BUCKET_NAME: firstRuntimeEnvValue(runtime, ['TREESEED_MANAGED_CLOUDFLARE_CONTENT_BUCKET_NAME', 'TREESEED_CONTENT_BUCKET_NAME'], values),
		TREESEED_CONTENT_BUCKET_BINDING: firstRuntimeEnvValue(runtime, ['TREESEED_MANAGED_CLOUDFLARE_CONTENT_BUCKET_BINDING', 'TREESEED_CONTENT_BUCKET_BINDING'], values),
	};
	return Object.fromEntries(Object.entries(config).filter(([, value]) => value));
}

export async function resolveTreeseedManagedCloudflareHostConfigFromConfig(runtime, scope = 'prod') {
	return resolveTreeseedManagedCloudflareHostConfig(runtime, await collectLocalTreeseedConfigValues(runtime, scope));
}

export function managedCloudflareConfigMissing(config) {
	return ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'].filter((key) => !config?.[key]);
}

export function resolveTreeseedManagedProcessingHostConfig(runtime, values = {}) {
	const config = {
		RAILWAY_API_TOKEN: firstRuntimeEnvValue(runtime, ['TREESEED_MANAGED_RAILWAY_API_TOKEN', 'RAILWAY_API_TOKEN'], values),
		TREESEED_RAILWAY_WORKSPACE: firstRuntimeEnvValue(runtime, ['TREESEED_MANAGED_RAILWAY_WORKSPACE', 'TREESEED_RAILWAY_WORKSPACE'], values),
		TREESEED_RAILWAY_API_URL: firstRuntimeEnvValue(runtime, ['TREESEED_MANAGED_RAILWAY_API_URL', 'TREESEED_RAILWAY_API_URL'], values),
		TREESEED_WORKER_POOL_SCALER: 'railway',
	};
	return Object.fromEntries(Object.entries(config).filter(([, value]) => value));
}

export async function resolveTreeseedManagedProcessingHostConfigFromConfig(runtime, scope = 'prod') {
	return resolveTreeseedManagedProcessingHostConfig(runtime, await collectLocalTreeseedConfigValues(runtime, scope));
}

export function managedProcessingConfigMissing(config) {
	return ['RAILWAY_API_TOKEN', 'TREESEED_RAILWAY_WORKSPACE'].filter((key) => !config?.[key]);
}

function managedStatus(missing) {
	return missing.length > 0 ? 'configuration_required' : 'active';
}

export function listTreeseedManagedHosts(teamId, runtime, values = {}) {
	const cloudflareConfig = resolveTreeseedManagedCloudflareHostConfig(runtime, values);
	const railwayConfig = resolveTreeseedManagedProcessingHostConfig(runtime, values);
	const cloudflareMissing = managedCloudflareConfigMissing(cloudflareConfig);
	const railwayMissing = managedProcessingConfigMissing(railwayConfig);
	const now = null;
	return [
		{
			id: 'treeseed-managed-web',
			teamId,
			provider: 'cloudflare',
			ownership: 'treeseed_managed',
			name: 'TreeSeed Web Host',
			accountLabel: 'TreeSeed Cloudflare account',
			allowedEnvironments: ['staging', 'prod'],
			status: managedStatus(cloudflareMissing),
			encryptedPayload: null,
			metadata: {
				hostType: 'web',
				managed: true,
				configured: cloudflareMissing.length === 0,
				missingConfigKeys: cloudflareMissing,
				requiredOperationalKeys: [
					'TREESEED_MANAGED_CLOUDFLARE_API_TOKEN',
					'TREESEED_MANAGED_CLOUDFLARE_ACCOUNT_ID',
				],
			},
			createdAt: now,
			updatedAt: now,
		},
		{
			id: 'treeseed-managed-processing',
			teamId,
			provider: 'railway',
			ownership: 'treeseed_managed',
			name: 'TreeSeed Processing Host',
			accountLabel: 'TreeSeed Railway workspace',
			allowedEnvironments: ['staging', 'prod'],
			status: managedStatus(railwayMissing),
			encryptedPayload: null,
			metadata: {
				hostType: 'processing',
				managed: true,
				configured: railwayMissing.length === 0,
				missingConfigKeys: railwayMissing,
				requiredOperationalKeys: [
					'TREESEED_MANAGED_RAILWAY_API_TOKEN',
					'TREESEED_MANAGED_RAILWAY_WORKSPACE',
				],
			},
			createdAt: now,
			updatedAt: now,
		},
	];
}

export async function listTreeseedManagedHostsFromConfig(teamId, runtime, scope = 'prod') {
	return listTreeseedManagedHosts(teamId, runtime, await collectLocalTreeseedConfigValues(runtime, scope));
}
