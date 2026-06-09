import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('public TreeDX bootstrap fail-fast behavior', () => {
	it('fails queued provisioning with runner-specific remediation before the full wait timeout', () => {
		const source = readFileSync('scripts/bootstrap-public-treedx.mjs', 'utf8');
		expect(source).toContain('TREESEED_PUBLIC_TREEDX_QUEUED_GRACE_MS');
		expect(source).toContain('The API accepted the operation, but no operations runner claimed it.');
		expect(source).toContain('npx trsd operations smoke --environment');
		expect(source).toContain('npx trsd hosting verify --environment');
		expect(source).toContain('/healthz/deep');
	});
});
