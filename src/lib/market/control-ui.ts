export function escapeHtml(value: unknown): string {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

export function hostTypeFor(host: any): string {
	if (host?.metadata?.hostType === 'capacity_provider') return 'capacity-provider';
	const hostType = host?.metadata?.hostType === 'agent' ? 'processing' : host?.metadata?.hostType;
	if (hostType) return String(hostType);
	if (host?.provider === 'railway') return 'processing';
	if (host?.provider === 'smtp') return 'email';
	if (['openai', 'github_copilot', 'openrouter', 'custom'].includes(String(host?.provider))) return 'ai';
	return 'web';
}

export function hostProviderFor(type: string): string {
	if (type === 'repository') return 'github';
	if (type === 'processing' || type === 'capacity-provider') return 'railway';
	if (type === 'email') return 'smtp';
	if (type === 'ai') return 'openai';
	return 'cloudflare';
}

export function labelFor(value: unknown, fallback = 'Record'): string {
	return escapeHtml(String(value ?? '').trim() || fallback);
}
