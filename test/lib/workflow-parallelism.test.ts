import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

function workflow(path: string) {
	return parse(readFileSync(path, 'utf8')) as any;
}

describe('CI/CD parallelism workflows', () => {
	it('keeps root deploy scoped to Cloudflare web and excludes backend API release jobs', () => {
		const deploy = workflow('.github/workflows/deploy.yml');
		const deployWeb = workflow('.github/workflows/deploy-web.yml');
		expect(deploy.jobs).toHaveProperty('preflight');
		expect(deploy.jobs['deploy-web'].needs).toEqual(['classify', 'preflight']);
		expect(deployWeb.jobs.web.steps).toEqual(expect.arrayContaining([
			expect.objectContaining({ name: 'Restore package dist cache' }),
			expect.objectContaining({ name: 'Build package artifacts' }),
		]));
		expect(deployWeb.jobs.web.steps.find((step: any) => step.name === 'Build package artifacts')?.run).toContain('build:package-cache');
		expect(deploy.jobs).not.toHaveProperty('runner-smoke');
		expect(deploy.jobs).not.toHaveProperty('bootstrap-public-treedx');
		expect(deploy.jobs).not.toHaveProperty('acceptance-prepare');
		expect(deploy.jobs).not.toHaveProperty('acceptance');
		expect(JSON.stringify(deploy)).not.toContain('packages/api/scripts/api-acceptance.mjs');
		expect(JSON.stringify(deploy)).not.toContain('operations-runner-smoke.ts');
		expect(JSON.stringify(deploy)).not.toContain('bootstrap-public-treedx.mjs');
		expect(deployWeb.jobs.web.env).not.toHaveProperty('RAILWAY_API_TOKEN');
		expect(deployWeb.jobs.web.env).not.toHaveProperty('TREESEED_RAILWAY_WORKSPACE');
		expect(deployWeb.jobs.web.env).not.toHaveProperty('TREESEED_RAILWAY_PROJECT_ID');
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
