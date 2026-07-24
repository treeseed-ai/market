import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

function workflow(path: string) {
	return parse(readFileSync(path, 'utf8')) as any;
}

describe('CI/CD parallelism workflows', () => {
	it('keeps hosted deployment suspended', () => {
		expect(() => readFileSync('.github/workflows/deploy.yml', 'utf8')).toThrow();
		expect(readFileSync('.github/workflows/verify.yml', 'utf8')).not.toMatch(/hosting apply|railway up|wrangler deploy/u);
	});

	it('splits root verification into parallel jobs', () => {
		const verify = workflow('.github/workflows/verify.yml');
		expect(Object.keys(verify.jobs).sort()).toEqual([
			'agent-ladder',
			'build',
			'check',
			'provider-runtime',
			'unit',
		]);
		for (const job of Object.values<any>(verify.jobs)) {
			expect(job.steps).toEqual(expect.arrayContaining([
				expect.objectContaining({ name: 'Install dependencies' }),
				expect.objectContaining({
					uses: 'actions/setup-node@v4',
					with: expect.objectContaining({
						cache: 'npm',
						'cache-dependency-path': 'package-lock.json',
					}),
				}),
			]));
		}
	});

	it('keeps Market verify serial by default and parallel only by opt-in', () => {
		const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as any;
		const script = readFileSync('scripts/market-verify.ts', 'utf8');
		expect(packageJson.scripts['verify:direct']).toBe('node --import tsx ./scripts/market-verify.ts');
		expect(script).toContain('TREESEED_VERIFY_PARALLEL');
		expect(script).toContain('copyWorkspace(root, taskRoot)');
		expect(script).toContain('cloneNodeModules(root, taskRoot)');
		expect(script).toContain("['-al'");
		expect(script).toContain('TREESEED_VERIFY_PARALLEL_CHILD');
		expect(script).toContain("id: 'agent-ladder'");
		expect(packageJson.scripts['test:agent-ladder']).toContain('npm run test:provider-runtime');
	});
});
