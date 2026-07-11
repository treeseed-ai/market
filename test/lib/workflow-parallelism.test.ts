import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

function workflow(path: string) {
	return parse(readFileSync(path, 'utf8')) as any;
}

describe('CI/CD parallelism workflows', () => {
	it('keeps root deploy scoped to Cloudflare web and excludes backend API release jobs', () => {
		const deploy = workflow('.github/workflows/deploy.yml');
		expect(Object.keys(deploy.jobs).sort()).toEqual(['deploy-production', 'deploy-staging', 'verify']);
		expect(deploy.jobs['deploy-staging'].needs).toBe('verify');
		expect(deploy.jobs['deploy-production'].needs).toBe('verify');
		expect(deploy.jobs).not.toHaveProperty('runner-smoke');
		expect(deploy.jobs).not.toHaveProperty('bootstrap-public-treedx');
		expect(deploy.jobs).not.toHaveProperty('acceptance-prepare');
		expect(deploy.jobs).not.toHaveProperty('acceptance');
		expect(JSON.stringify(deploy)).not.toContain('packages/api/scripts/api-acceptance.ts');
		expect(JSON.stringify(deploy)).not.toContain('operations-runner-smoke.ts');
		expect(JSON.stringify(deploy)).not.toContain('bootstrap-public-treedx.ts');
		expect(JSON.stringify(deploy)).not.toContain('guarantees run');
		expect(JSON.stringify(deploy)).not.toContain('TREESEED_RAILWAY_API_TOKEN');
	});

	it('builds and verifies before either deployment target', () => {
		const source = readFileSync('.github/workflows/deploy.yml', 'utf8');
		expect(source).toContain('npm -w packages/sdk run build:dist');
		expect(source).toContain('npm -w packages/ui run build:dist');
		expect(source).toContain('npm -w packages/core run build:dist');
		expect(source).toContain('npm -w packages/admin run build:dist');
		expect(source).toContain('npm run check');
		expect(source).toContain('npm run test:unit');
		expect(source).toContain('hosting verify --environment staging --app web --live --json');
		expect(source).toContain('hosting verify --environment prod --app web --live --json');
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
	});
});
