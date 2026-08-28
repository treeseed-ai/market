import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('TreeSeed brand assets', () => {
	it('derives the served logo and favicon from the canonical UI package asset', () => {
		const canonicalLogo = readFileSync(require.resolve('@treeseed/ui/assets/treeseed-logo.svg'));
		expect(readFileSync('public/logo.svg')).toEqual(canonicalLogo);
		expect(readFileSync('public/favicon.svg')).toEqual(canonicalLogo);
		expect(readFileSync('scripts/sync-brand-assets.ts', 'utf8')).toContain("import.meta.resolve('@treeseed/ui/assets/treeseed-logo.svg')");
	});
});
