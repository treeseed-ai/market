import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import yaml from 'yaml';

const repoRoot = resolve(__dirname, '../..');

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

const agentSuffixes = [
	'codebase-cartographer',
	'docs-engineer',
	'docs-planner',
	'docs-reviewer',
	'governance-steward',
	'knowledge-generator',
	'knowledge-optimizer',
	'releaser',
	'workday-reporter',
] as const;

describe('first-party package knowledge hubs', () => {
	it('prepares each package as a standalone docs knowledge hub project', () => {
		for (const slug of packageSlugs) {
			const packageRoot = resolve(repoRoot, 'packages', slug);
			const docsRoot = resolve(packageRoot, 'docs');
			const contentRoot = resolve(docsRoot, 'src/content');
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
				contentPath: 'docs/src/content',
				localContentMaterialization: 'existing_path',
			});

			const objectiveFiles = readdirSync(resolve(contentRoot, 'objectives')).filter((file) => file.endsWith('.md') || file.endsWith('.mdx'));
			expect(objectiveFiles, slug).toEqual(['core.md']);
			expect(readFileSync(resolve(contentRoot, 'objectives/core.md'), 'utf8')).toContain('Core Objective');

			const agentFiles = readdirSync(resolve(contentRoot, 'agents')).filter((file) => file.endsWith('.mdx')).sort();
			expect(agentFiles, slug).toEqual(agentSuffixes.map((suffix) => `${slug}-${suffix}.mdx`).sort());
			for (const suffix of agentSuffixes) {
				const source = readFileSync(resolve(contentRoot, 'agents', `${slug}-${suffix}.mdx`), 'utf8');
				expect(source).toContain(`slug: ${slug}-${suffix}`);
				expect(source).toContain('package Knowledge Hub');
				if (suffix === 'docs-engineer' || suffix === 'workday-reporter') {
					expect(source).toContain('docs/src/content');
				}
			}
		}
	});
});
