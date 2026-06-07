export function escapeHtml(value: unknown): string {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

export function hostTypeFor(host: any): string {
	if (host?.metadata?.hostType === 'capacity_provider') return 'capacity-provider';
	if (host?.metadata?.hostType === 'capacity_provider_host') return 'capacity-provider';
	if (host?.metadata?.hostType === 'web_host' || host?.metadata?.hostType === 'cloudflare') return 'web';
	if (host?.metadata?.hostType === 'email_host' || host?.metadata?.hostType === 'smtp') return 'email';
	if (host?.metadata?.hostType === 'ai_host') return 'ai';
	if (host?.metadata?.hostType === 'knowledge_library' || host?.metadata?.hostType === 'knowledge-library' || host?.metadata?.hostType === 'treedx') return 'knowledge-library';
	const hostType = host?.metadata?.hostType === 'agent' ? 'processing' : host?.metadata?.hostType;
	if (hostType) return String(hostType);
	if (host?.provider === 'github' && (host?.organizationOrOwner || host?.defaultVisibility || host?.softwareRepositoryNameTemplate || host?.contentRepositoryNameTemplate)) return 'repository';
	if (host?.provider === 'railway') return 'processing';
	if (host?.provider === 'smtp') return 'email';
	if (host?.provider === 'treedx') return 'knowledge-library';
	if (['openai', 'github_copilot', 'openrouter', 'custom'].includes(String(host?.provider))) return 'ai';
	return 'web';
}

export function hostProviderFor(type: string): string {
	if (type === 'repository') return 'github';
	if (type === 'processing' || type === 'capacity-provider') return 'railway';
	if (type === 'email') return 'smtp';
	if (type === 'ai') return 'openai';
	if (type === 'knowledge-library') return 'treedx';
	return 'cloudflare';
}

export function labelFor(value: unknown, fallback = 'Record'): string {
	return escapeHtml(String(value ?? '').trim() || fallback);
}

export function shortId(value: unknown): string {
	const text = String(value ?? '').trim();
	if (!text) return '';
	if (text.length <= 12) return text;
	return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

export function hostTypeLabel(type: unknown): string {
	const normalized = String(type ?? '').trim();
	if (normalized === 'capacity-provider' || normalized === 'capacity_provider') return 'Capacity provider';
	if (normalized === 'repository') return 'Repository';
	if (normalized === 'web') return 'Web';
	if (normalized === 'email') return 'Email';
	if (normalized === 'ai') return 'AI';
	if (normalized === 'knowledge-library' || normalized === 'knowledge_library') return 'Knowledge Library';
	if (normalized === 'processing') return 'Processing';
	return normalized ? normalized.replaceAll('-', ' ') : 'Host';
}

export function providerLabel(value: unknown): string {
	const provider = String(value ?? '').trim();
	if (provider === 'github') return 'GitHub';
	if (provider === 'cloudflare') return 'Cloudflare';
	if (provider === 'railway') return 'Railway';
	if (provider === 'smtp') return 'SMTP';
	if (provider === 'openai') return 'OpenAI';
	if (provider === 'github_copilot') return 'GitHub Copilot';
	if (provider === 'openrouter') return 'OpenRouter';
	if (provider === 'treedx') return 'TreeDX';
	if (provider === 'public_federation') return 'TreeSeed public federation';
	if (provider === '@treeseed/agent') return 'TreeSeed Agent';
	return provider || 'Provider';
}

export function ownershipLabel(value: unknown): string {
	const ownership = String(value ?? '').trim();
	if (ownership === 'treeseed_managed') return 'TreeSeed managed';
	if (ownership === 'team_owned') return 'Team owned';
	if (ownership === 'platform') return 'TreeSeed managed';
	return ownership ? ownership.replaceAll('_', ' ') : 'Team owned';
}

export function hostPurposeFor(type: unknown): string {
	const normalized = String(type ?? '').trim();
	if (normalized === 'repository') return 'Creates and connects project source repositories.';
	if (normalized === 'web') return 'Deploys project web surfaces and hosted APIs.';
	if (normalized === 'email') return 'Sends project email and notification traffic.';
	if (normalized === 'capacity-provider' || normalized === 'capacity_provider') return 'Launches package-owned capacity provider services.';
	if (normalized === 'ai') return 'Provides model access for agent and content workflows.';
	if (normalized === 'knowledge-library' || normalized === 'knowledge_library') return 'Stores and federates project content libraries through TreeDX.';
	if (normalized === 'processing') return 'Runs processing workloads.';
	return 'Stores provider credentials for team workflows.';
}

export function hostingPlacementLabel(value: unknown): string {
	const normalized = String(value ?? '').trim();
	if (normalized === 'web') return 'Site Hosting';
	if (normalized === 'api') return 'API Runtime';
	if (normalized === 'database') return 'Database';
	if (normalized === 'knowledge-library' || normalized === 'knowledge_library') return 'Knowledge Library';
	if (normalized === 'runner-capacity' || normalized === 'runner_capacity') return 'Runner Capacity';
	if (normalized === 'repository') return 'Repository';
	if (normalized === 'content-storage' || normalized === 'content_storage') return 'Content Storage';
	if (normalized === 'email') return 'Email';
	if (normalized === 'operations') return 'Operations';
	return normalized ? normalized.replaceAll('-', ' ') : 'Hosting';
}

export function hostingPlacementPurpose(value: unknown): string {
	const normalized = String(value ?? '').trim();
	if (normalized === 'web') return 'Publishes the project site or public web surface.';
	if (normalized === 'api') return 'Runs API routes and project runtime endpoints.';
	if (normalized === 'database') return 'Stores control-plane and relational runtime state.';
	if (normalized === 'knowledge-library' || normalized === 'knowledge_library') return 'Stores and federates canonical project content libraries.';
	if (normalized === 'runner-capacity' || normalized === 'runner_capacity') return 'Runs operations, capacity, and agent processing workloads.';
	if (normalized === 'repository') return 'Connects source repositories and workflow metadata.';
	if (normalized === 'content-storage' || normalized === 'content_storage') return 'Stores published content snapshots and generated artifacts.';
	if (normalized === 'email') return 'Sends transactional email and notifications.';
	if (normalized === 'operations') return 'Runs background operational services.';
	return 'Hosts one project capability.';
}

export function hostingProfileLabel(value: unknown): string {
	const normalized = String(value ?? '').trim();
	if (normalized === 'treeseed-managed-public-team') return 'TreeSeed managed public team';
	if (normalized === 'treeseed-managed-private-team') return 'TreeSeed managed private team';
	if (normalized === 'customer-self-hosted') return 'Customer self-hosted';
	if (normalized === 'local-development') return 'Local development';
	if (normalized === 'production-like-local') return 'Production-like local';
	return normalized ? normalized.replaceAll('-', ' ') : 'Hosting profile';
}

export function hostDisplayName(host: any, type?: string): string {
	const hostType = type ?? hostTypeFor(host);
	const candidates = [
		host?.name,
		host?.displayName,
		host?.metadata?.hostName,
		host?.metadata?.displayName,
		host?.accountLabel,
		host?.organizationOrOwner,
		host?.provider ? `${providerLabel(host.provider)} ${hostTypeLabel(hostType)} host` : '',
		host?.id ? `${hostTypeLabel(hostType)} host ${shortId(host.id)}` : '',
	];
	const first = candidates.map((entry) => String(entry ?? '').trim()).find(Boolean);
	return first || `${hostTypeLabel(hostType)} host`;
}

export function hostAccountSummary(host: any, type?: string): string {
	const hostType = type ?? hostTypeFor(host);
	const details = [
		host?.organizationOrOwner,
		host?.accountLabel,
		host?.metadata?.workspace,
		host?.metadata?.managed ? ownershipLabel('treeseed_managed') : ownershipLabel(host?.ownership),
		providerLabel(host?.provider ?? hostProviderFor(hostType)),
	].map((entry) => String(entry ?? '').trim()).filter(Boolean);
	return [...new Set(details)].slice(0, 3).join(' · ') || hostPurposeFor(hostType);
}

export function hostEnvironmentSummary(host: any): string {
	const environments = Array.isArray(host?.allowedEnvironments) ? host.allowedEnvironments.filter(Boolean) : [];
	return environments.length > 0 ? environments.join(', ') : 'staging, prod';
}

export function hostReadinessSummary(host: any): string {
	const status = String(host?.status ?? '').trim();
	const validation = host?.metadata?.lastValidation;
	const missing = Array.isArray(host?.metadata?.missingConfigKeys) ? host.metadata.missingConfigKeys : [];
	if (missing.length > 0) return `Configuration required: ${missing.join(', ')}`;
	if (validation?.status) return `Validation ${validation.status}`;
	if (status) return status;
	return host?.ownership === 'treeseed_managed' ? 'active' : 'not checked';
}

export function hostActionHref(host: any, type?: string): string {
	const hostType = type ?? hostTypeFor(host);
	if (!host?.id || host?.ownership === 'treeseed_managed' || host?.teamId == null) return '';
	return hostType === 'repository'
		? `/app/hosts/repository/${encodeURIComponent(host.id)}/edit`
		: `/app/hosts/${encodeURIComponent(hostType)}/${encodeURIComponent(host.id)}/edit`;
}

export function hostRecordNameHtml(host: any, type?: string): string {
	return `<strong>${escapeHtml(hostDisplayName(host, type))}</strong><span>${escapeHtml(hostAccountSummary(host, type))}</span>`;
}
