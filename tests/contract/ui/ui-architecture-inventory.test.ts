import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { componentInventory, pathExistsForInventory, routeInventory } from '../../../scripts/ui-architecture/inventory';

const routeRoots = ['src/pages', 'packages/admin/src/pages', 'packages/core/src/pages'];

function walk(path: string): string[] {
	const absolute = resolve(process.cwd(), path);
	if (!existsSync(absolute)) return [];
	const stats = statSync(absolute);
	if (stats.isFile()) return [path];
	return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
		if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.astro') return [];
		return walk(`${path}/${entry.name}`);
	});
}

function routePatternFromPath(sourcePath: string): string {
	const pagesIndex = sourcePath.indexOf('/pages/');
	const rootRelative = pagesIndex >= 0 ? sourcePath.slice(pagesIndex + '/pages/'.length) : sourcePath.replace(/^src\/pages\//u, '');
	const withoutExtension = rootRelative.replace(/\.(?:astro|ts)$/u, '');
	const withoutIndex = withoutExtension === 'index' ? '' : withoutExtension.replace(/\/index$/u, '');
	const normalized = withoutIndex
		.replace(/\[\.\.\.([^\]]+)\]/gu, ':$1*')
		.replace(/\[([^\]]+)\]/gu, ':$1');
	return `/${normalized}`.replace(/\/$/u, '') || '/';
}

describe('UI architecture inventory', () => {
	it('covers every human-facing Astro route', () => {
		const inventoried = [...new Set(routeInventory.map((entry) => entry.sourcePath))].sort();
		const inventoriedSources = new Set(inventoried);
		const discovered = routeRoots.flatMap(walk).filter((path) => extname(path) === '.astro' || inventoriedSources.has(path)).sort();

		expect(inventoried).toEqual(discovered);
	});

	it('keeps route metadata complete and aligned with file paths', () => {
		const routeCountBySource = new Map<string, number>();
		for (const entry of routeInventory) routeCountBySource.set(entry.sourcePath, (routeCountBySource.get(entry.sourcePath) ?? 0) + 1);
		for (const entry of routeInventory) {
			if (routeCountBySource.get(entry.sourcePath) === 1) {
				expect(entry.routePattern.replace(/\[\.\.\.([^\]]+)\]/gu, ':$1*').replace(/\[([^\]]+)\]/gu, ':$1')).toBe(routePatternFromPath(entry.sourcePath));
			}
			expect(entry.policyNeeds.length, `${entry.sourcePath} policy needs`).toBeGreaterThan(0);
			expect(entry.dataSource, `${entry.sourcePath} data source`).toBeTruthy();
			expect(entry.requiredArchitectureChecks.length, `${entry.sourcePath} architecture checks`).toBeGreaterThan(0);
			expect(entry.architectureNotes, `${entry.sourcePath} architecture notes`).toBeTruthy();
			expect(entry.architectureStage, `${entry.sourcePath} architecture stage`).toBeTruthy();
			expect(entry.implementationStatus, `${entry.sourcePath} implementation status`).toBe('active');
		}
		expect(routeInventory.filter((entry) => entry.sourcePath.endsWith('/app/domain-overview.astro')).map((entry) => entry.routePattern).sort()).toEqual([
			'/app/capacity', '/app/market', '/app/projects', '/app/work',
		]);
	});

	it('identifies canonical architecture proof surfaces', () => {
		const candidates = routeInventory.filter((entry) => entry.architectureProof);
		expect(candidates.some((entry) => entry.architectureProof?.includes('Direction resource'))).toBe(true);
		expect(candidates.some((entry) => entry.architectureProof?.includes('Canonical Starlight knowledge reader'))).toBe(true);
	});

	it('keeps component inventory entries actionable', () => {
		for (const entry of componentInventory) {
			expect(pathExistsForInventory(entry.sourcePath), `${entry.sourcePath} should exist`).toBe(true);
			expect(entry.currentUse, `${entry.sourcePath} current use`).toBeTruthy();
			expect(entry.architectureTarget, `${entry.sourcePath} architecture target`).toBeTruthy();
			expect(entry.requiredArchitectureChecks.length, `${entry.sourcePath} tests`).toBeGreaterThan(0);
			expect(entry.implementationStatus, `${entry.sourcePath} implementation status`).toBe('active');
		}
	});
});
