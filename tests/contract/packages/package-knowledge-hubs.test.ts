import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import yaml from 'yaml';

const repoRoot = resolve(__dirname, '../../..');

const packageSlugs = [
	'admin',
	'agent',
	'api',
	'cli',
	'core',
	'sdk',
	'ui',
	'treedx',
] as const;

describe('first-party package knowledge hubs', () => {
	it('prepares each package docs runtime for its authoritative published content repository', () => {
		for (const slug of packageSlugs) {
			const packageRoot = resolve(repoRoot, 'packages', slug);
			const docsRoot = resolve(packageRoot, 'docs');
			const manifest = yaml.parse(readFileSync(resolve(docsRoot, 'src/manifest.yaml'), 'utf8'));
			const packageManifest = yaml.parse(readFileSync(resolve(packageRoot, 'treeseed.package.yaml'), 'utf8'));

			expect(existsSync(resolve(docsRoot, 'package.json')), slug).toBe(true);
			expect(existsSync(resolve(docsRoot, 'astro.config.ts')), slug).toBe(true);
			expect(existsSync(resolve(docsRoot, 'treeseed.site.yaml')), slug).toBe(true);
			expect(existsSync(resolve(docsRoot, 'src/config.yaml')), slug).toBe(true);
			expect(existsSync(resolve(docsRoot, 'src/content.config.ts')), slug).toBe(true);
			expect(manifest.content.objectives).toBe('./src/content/objectives');
			expect(manifest.content.agents).toBe('./src/content/agents');
			expect(packageManifest.projectArchitecture).toMatchObject({
				sitePath: 'docs',
				contentPath: 'src/content',
				contentRuntimeSource: 'r2_preview_overlay',
				localContentMaterialization: 'none',
			});
		}
	});
});
