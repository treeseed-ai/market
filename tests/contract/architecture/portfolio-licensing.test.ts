import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');

function json(path: string) {
	return JSON.parse(readFileSync(resolve(root, path), 'utf8')) as { license?: string };
}

describe('portfolio license boundaries', () => {
	it('keeps the Admin API AGPL while public applications and libraries are Apache-2.0', () => {
		expect(json('packages/api/package.json').license).toBe('AGPL-3.0-only');
		for (const path of [
			'package.json',
			'packages/admin/package.json',
			'packages/agent/package.json',
			'packages/ai/package.json',
			'packages/cli/package.json',
			'packages/core/package.json',
			'packages/reviewer/package.json',
			'packages/sdk/package.json',
			'packages/ui/package.json',
		]) {
			expect(json(path).license, path).toBe('Apache-2.0');
			expect(readFileSync(resolve(root, path, '..', 'LICENSE'), 'utf8'), path).toContain('Apache License, Version 2.0');
		}
	});

	it('keeps templates and Market Apache-licensed without owning the Market API seed', () => {
		for (const path of ['starters/engineering/LICENSE', 'starters/research/LICENSE']) {
			expect(readFileSync(resolve(root, path), 'utf8')).toContain('Apache License, Version 2.0');
		}
		expect(json('package.json').license).toBe('Apache-2.0');
		expect(readFileSync(resolve(root, 'seeds/README.md'), 'utf8')).toContain('canonical portable portfolio bundle');
		expect(readFileSync(resolve(root, 'seeds/README.md'), 'utf8')).toContain('no contributor-grant workflow');
	});
});
