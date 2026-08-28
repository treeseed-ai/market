import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TreeSeed brand assets', () => {
	it('derives the served logo and favicon from the canonical UI package asset', () => {
		const packageRoot = resolve('node_modules/@treeseed/ui');
		const publishedLogo = resolve(packageRoot, 'dist/assets/treeseed-logo.svg');
		const workspaceLogo = resolve(packageRoot, 'src/assets/treeseed-logo.svg');
		const canonicalLogo = readFileSync(existsSync(publishedLogo) ? publishedLogo : workspaceLogo);
		expect(readFileSync('public/logo.svg')).toEqual(canonicalLogo);
		expect(readFileSync('public/favicon.svg')).toEqual(canonicalLogo);
		expect(readFileSync('scripts/sync-brand-assets.ts', 'utf8')).toContain("import.meta.resolve('@treeseed/ui/assets/treeseed-logo.svg')");
	});
});
