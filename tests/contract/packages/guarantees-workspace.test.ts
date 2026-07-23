import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
	auditTreeseedGuaranteeJourneys,
	discoverTreeseedGuarantees,
	exportTreeseedGuaranteesCsv,
	planTreeseedGuarantees,
} from '../../../packages/sdk/src/guarantees/index.ts';

describe('workspace guarantee registry', () => {
	it('discovers workspace guarantee manifests with lowercase taxonomy', () => {
		const report = discoverTreeseedGuarantees({ workspaceRoot: process.cwd() });
		expect(report.ok).toBe(true);
		expect(report.counts.valid).toBe(113);
		const manifests = report.guarantees.map((entry) => entry.manifest).filter(Boolean);
		expect(manifests.every((manifest) => /^[a-z][a-z0-9-]*$/u.test(manifest!.type))).toBe(true);
		expect(manifests.every((manifest) => /^[a-z][a-z0-9-]*$/u.test(manifest!.subtype))).toBe(true);
		expect(manifests.some((manifest) => manifest!.type === 'marketplace')).toBe(false);
		expect(manifests.some((manifest) => manifest!.type === 'user')).toBe(true);
		expect(manifests.some((manifest) => manifest!.type === 'treedx')).toBe(false);
		expect(manifests.some((manifest) => manifest!.subtype === 'treedx')).toBe(true);
		expect(manifests.some((manifest) => manifest!.type === 'agent')).toBe(true);
	});

	it('generates a CSV row for every guarantee', () => {
		const report = discoverTreeseedGuarantees({ workspaceRoot: process.cwd() });
		const csv = exportTreeseedGuaranteesCsv({ guarantees: report.guarantees });
		const rows = csv.trim().split('\n');
		expect(rows).toHaveLength(report.counts.valid + 1);
		expect(rows[0]).toContain('Guarantee ID,Journey Index,Type,Subtype');
		expect(rows[0]).toContain('Surface');
	});

	it('supports focused type and subtype planning', () => {
		const plan = planTreeseedGuarantees({ workspaceRoot: process.cwd(), filter: { type: 'user', subtype: 'auth' } });
		expect(plan.ok).toBe(true);
		expect(plan.counts.selected).toBeGreaterThan(0);
		expect(plan.entries.some((entry) => entry.selected && entry.type === 'user' && entry.subtype === 'auth')).toBe(true);
	});

	it('keeps all active verifier refs executable and free of closure scaffolding', () => {
		const report = discoverTreeseedGuarantees({ workspaceRoot: process.cwd() });
		expect(report.ok).toBe(true);
		const registries = new Map<string, { kind: string; caseId?: string }>();
		for (const loaded of report.verifierRegistries) {
			for (const [ref, definition] of Object.entries(loaded.registry?.verifiers ?? {})) {
				registries.set(ref, definition);
			}
		}
		const caseDir = mkdtempSync(join(tmpdir(), 'treeseed-api-cases-'));
		const casePath = join(caseDir, 'cases.json');
		const expanded = spawnSync(process.execPath, ['--import', 'tsx', './scripts/api-acceptance.ts', '--environment', 'local', '--expand-json', casePath], {
			cwd: resolve(process.cwd(), 'packages', 'api'),
			encoding: 'utf8',
		});
		expect(expanded.status, expanded.stderr || expanded.stdout).toBe(0);
		const apiCases = new Set(
			JSON.parse(readFileSync(casePath, 'utf8')).cases
				.map((entry: { id: string }) => entry.id),
		);
		const active = report.guarantees.filter((entry) => entry.manifest?.status === 'active');
		expect(active.length).toBeGreaterThanOrEqual(24);
		for (const entry of active) {
			const manifest = entry.manifest!;
			expect(entry.sourcePath).not.toContain('packages/treedx');
			const refs = [
				...(manifest.api?.verifierRefs ?? []),
				...(manifest.content?.verifierRefs ?? []),
				...(manifest.audit?.verifierRefs ?? []),
				...(manifest.negativeCases ?? []).flatMap((negativeCase) => negativeCase.verifierRefs ?? []),
			];
			expect(refs.length, manifest.id).toBeGreaterThan(0);
			for (const ref of refs) {
				expect(ref, `${manifest.id} still uses a todo verifier`).not.toMatch(/^todo\./u);
				expect(ref, `${manifest.id} still uses a closure verifier`).not.toMatch(/^closure\./u);
				const definition = registries.get(ref);
				expect(definition, `${manifest.id} missing verifier definition ${ref}`).toBeTruthy();
				expect(definition?.kind, `${ref} must be executable release evidence`).not.toMatch(/^(todo|manualEvidence)$/u);
				if (definition?.kind === 'apiAcceptanceCase') {
					expect(definition.caseId, `${ref} missing API acceptance caseId`).toBeTruthy();
					expect(apiCases.has(definition.caseId!), `${ref} references missing API acceptance case ${definition.caseId}`).toBe(true);
				}
			}
		}
	});

	it('keeps active scene-backed guarantees as service journeys with stable evidence', () => {
		const audit = auditTreeseedGuaranteeJourneys({ workspaceRoot: process.cwd() });
		expect(audit.ok).toBe(true);
		expect(audit.totals).toMatchObject({
			guarantees: 113,
			sceneBacked: 36,
			activeSceneBacked: 9,
			weakSceneContracts: 0,
			missingRoutes: 16,
			missingSelectors: 0,
			dependencyErrors: 0,
			activeSceneBackedWeak: 0,
			activeMissingRoutes: 0,
			activeMissingSelectors: 0,
		});
		for (const item of audit.items.filter((entry) => entry.status === 'active' && entry.scenePath)) {
			expect(item.classification, item.guaranteeId).toBe('valid-service-journey');
			expect(item.sceneWorkflowStepCount, item.guaranteeId).toBeGreaterThanOrEqual(2);
			expect(item.interactiveStepCount, item.guaranteeId).toBeGreaterThanOrEqual(1);
			const scenePath = resolve(process.cwd(), item.scenePath!);
			expect(existsSync(scenePath), item.guaranteeId).toBe(true);
			const sceneText = readFileSync(scenePath, 'utf8');
			const scene = parseYaml(sceneText);
			expect(scene.journey?.kind, item.guaranteeId).toBe('service');
			expect(scene.journey?.requiresInteractiveAction, item.guaranteeId).toBe(true);
			expect(scene.journey?.minimumSteps, item.guaranteeId).toBeGreaterThanOrEqual(2);
			expect(sceneText, item.guaranteeId).not.toContain('/screenshots/viewport/');
		}
	});
});
