import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { validateAgentActivityProfilesConfiguration } from '@treeseed/sdk/agent-capacity';

const repoRoot = process.cwd();

function mdxFiles(root: string): string[] {
	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const path = join(root, entry.name);
		if (entry.isDirectory()) return ['node_modules', 'dist', '.git'].includes(entry.name) ? [] : mdxFiles(path);
		return extname(entry.name) === '.mdx' ? [path] : [];
	});
}

describe('integrated activity-profile configuration', () => {
	it('validates every root, package, and starter activity profile through the portable SDK contract', () => {
		const failures: Array<{ file: string; diagnostics: unknown[] }> = [];
		let validated = 0;
		for (const root of ['src/content/agents', 'packages', 'starters'].map((path) => resolve(repoRoot, path))) {
			for (const file of mdxFiles(root)) {
				const match = /^---\s*\n([\s\S]*?)\n---/u.exec(readFileSync(file, 'utf8'));
				if (!match) continue;
				const activityProfiles = (parseYaml(match[1]) as Record<string, unknown>).activityProfiles;
				if (activityProfiles === undefined) continue;
				validated += 1;
				const result = validateAgentActivityProfilesConfiguration(activityProfiles);
				if (!result.ok) failures.push({ file: relative(repoRoot, file), diagnostics: result.diagnostics });
			}
		}
		expect(validated).toBeGreaterThanOrEqual(80);
		expect(failures).toEqual([]);
	});

	it('gives the engineering Technical Writer acting profile isolated documentation authority', () => {
		const file = resolve(repoRoot, 'starters/engineering/template/src/content/agents/technical-writer.mdx');
		const match = /^---\s*\n([\s\S]*?)\n---/u.exec(readFileSync(file, 'utf8'));
		expect(match).not.toBeNull();
		const profiles = (parseYaml(match?.[1] ?? '') as {
			activityProfiles: Record<string, { handler: string; execution: Record<string, unknown>; tools: { allowed: string[] } }>;
		}).activityProfiles;
		expect(profiles.acting.handler).toBe('actor');
		expect(profiles.acting.execution).toMatchObject({ allowedPaths: ['template/docs/**'] });
		expect(profiles.acting.tools.allowed).toEqual(expect.arrayContaining([
			'treeseed.changed_paths', 'treeseed.verify', 'treeseed.checkpoint',
		]));
		expect(profiles.planning.handler).toBe('writer');
	});
});
