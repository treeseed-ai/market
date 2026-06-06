import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

function workflow(path: string) {
	return parse(readFileSync(path, 'utf8')) as any;
}

describe('CI/CD parallelism workflows', () => {
	it('prepares acceptance in parallel with web deploy and runs live acceptance after both finish', () => {
		const deploy = workflow('.github/workflows/deploy.yml');
		expect(deploy.jobs).toHaveProperty('acceptance-prepare');
		expect(deploy.jobs['acceptance-prepare'].needs).toBe('classify');
		expect(deploy.jobs['acceptance-prepare'].steps).toEqual(expect.arrayContaining([
			expect.objectContaining({ name: 'Install dependencies' }),
			expect.objectContaining({ name: 'Build SDK client for acceptance' }),
			expect.objectContaining({
				with: expect.objectContaining({
					name: 'market-acceptance-sdk-${{ github.sha }}',
					path: 'packages/sdk/dist/',
				}),
			}),
		]));
		expect(deploy.jobs.acceptance.needs).toEqual([
			'classify',
			'deploy-web',
			'bootstrap-public-treedb',
			'acceptance-prepare',
		]);
		expect(deploy.jobs.acceptance.steps).toEqual(expect.arrayContaining([
			expect.objectContaining({
				with: expect.objectContaining({
					name: 'market-acceptance-sdk-${{ github.sha }}',
					path: 'packages/sdk/dist/',
				}),
			}),
			expect.objectContaining({ name: 'Run live Market API acceptance' }),
		]));
	});

	it('builds deploy package artifacts with SDK first and other packages concurrently', () => {
		const source = readFileSync('.github/workflows/deploy-web.yml', 'utf8');
		expect(source).toContain('npm --prefix packages/sdk run build:dist');
		expect(source).toContain('for dir in packages/core packages/cli packages/agent');
		expect(source).toContain('pids["${dir}"]="$!"');
		expect(source).toContain('wait "${pids[${dir}]}"');
		expect(source).toContain('build:packages/core-cli-agent');
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
		const script = readFileSync('scripts/market-verify.mjs', 'utf8');
		const releaseCandidate = readFileSync('packages/sdk/src/operations/services/release-candidate.ts', 'utf8');
		expect(packageJson.scripts['verify:direct']).toBe('node ./scripts/market-verify.mjs');
		expect(script).toContain('TREESEED_VERIFY_PARALLEL');
		expect(script).toContain('copyWorkspace(root, taskRoot)');
		expect(script).toContain('cloneNodeModules(root, taskRoot)');
		expect(script).toContain("['-al'");
		expect(releaseCandidate).toContain("packageJson?.name === '@treeseed/market'");
		expect(releaseCandidate).toContain("TREESEED_VERIFY_PARALLEL: '1'");
	});
});
