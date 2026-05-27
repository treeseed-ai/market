import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

function files(root: string): string[] {
	return readdirSync(root).flatMap((entry) => {
		const path = join(root, entry);
		if (statSync(path).isDirectory() && ['.fixtures', '.git', '.treeseed', 'dist', 'node_modules'].includes(entry)) {
			return [];
		}
		return statSync(path).isDirectory() ? files(path) : [path];
	});
}

describe('web runtime boundaries', () => {
	it('keeps public source and docs free of legacy processing compatibility names', () => {
		const roots = ['AGENTS.md', 'docs', 'src', 'packages/agent', 'packages/cli', 'packages/sdk']
			.flatMap((root) => existsSync(root) && statSync(root).isDirectory() ? files(root) : [root])
			.filter((path) => /\.(md|astro|ts|js|json|ya?ml|mjs)$/u.test(path))
			.filter((path) => !path.includes('/dist/'))
			.filter((path) => !path.includes('/node_modules/'))
			.filter((path) => !path.includes('/.treeseed/'))
			.filter((path) => path !== 'docs/capacity-providers.md')
			.filter((path) => !path.includes('/test/'))
			.filter((path) => !path.includes('.test.'));
		roots.push('packages/core/templates/github/hosted-project.workflow.yml');
		const legacyTerms = [
			['treeseed', 'processing'].join('-'),
			'/v1/' + 'processing',
			['processing', 'host'].join('_'),
			'helper-' + 'capacity',
			'deploy-' + 'processing',
			['processing', 'parity'].join('-'),
		];
		const offenders = roots.flatMap((path) => {
			const source = readFileSync(path, 'utf8');
			return legacyTerms
				.filter((term) => source.includes(term))
				.map((term) => `${path}: ${term}`);
		});
		expect(offenders).toEqual([]);
	}, 15_000);

	it('keeps root Market free of the deleted processing plane', () => {
		expect(existsSync('Dockerfile.processing')).toBe(false);
		expect(existsSync('docker-compose.processing.yml')).toBe(false);
		expect(existsSync('bin/treeseed-processing')).toBe(false);
		expect(existsSync('.github/workflows/deploy-processing.yml')).toBe(false);
		expect(existsSync('.github/workflows/processing-parity.yml')).toBe(false);

		const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> };
		expect(Object.keys(packageJson.scripts ?? {}).filter((name) => name.startsWith('processing:'))).toEqual([]);
		expect(packageJson.scripts).not.toHaveProperty('test:processing-parity-local');
		expect(packageJson.scripts).not.toHaveProperty('test:processing-parity-staging');

		const deployWorkflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
		const verifyWorkflow = readFileSync('.github/workflows/verify.yml', 'utf8');
		const hostedProjectWorkflow = readFileSync('.github/workflows/hosted-project.yml', 'utf8');
		expect(`${deployWorkflow}\n${verifyWorkflow}\n${hostedProjectWorkflow}`).not.toMatch(/deploy-processing|processing-parity|deploy_processing/u);

		const siteConfig = readFileSync('treeseed.site.yaml', 'utf8');
		expect(siteConfig).not.toMatch(/\bworkdayManager:|\bworkerRunner:|treeseed-processing/u);
	});

	it('declares the market operations runner as a separate platform service', () => {
		const site = parse(readFileSync('treeseed.site.yaml', 'utf8')) as any;
		expect(site.services?.marketOperationsRunner).toMatchObject({
			enabled: true,
			provider: 'railway',
			railway: {
				serviceName: 'treeseed-market-operations-runner',
				buildCommand: 'npm run build:market-operations-runner',
				startCommand: 'node ./dist/market-operations-runner/entrypoint.js run',
				volumeMountPath: '/data',
				runnerPool: {
					bootstrapCount: 1,
					maxRunners: 4,
					volumeMountPath: '/data',
				},
			},
		});
		const serialized = JSON.stringify(site.services?.marketOperationsRunner ?? {});
		expect(serialized).not.toMatch(/provider:|capacity|TREESEED_CAPACITY_PROVIDER_API_KEY|provider:tasks|provider:heartbeat/u);
	});

	it('keeps root Market source out of agent runtime modules', () => {
		const sourceFiles = files('src')
			.filter((path) => /\.(astro|ts|js)$/u.test(path));
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /from ['"]@treeseed\/agent|import\(['"]@treeseed\/agent|require\(['"]@treeseed\/agent|treeseed-processing|\/v1\/processing/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('keeps Market API local content routes job-backed instead of filesystem-backed', () => {
		const source = readFileSync('src/api/app.js', 'utf8');
		const routeStart = source.indexOf("app.post('/v1/projects/:projectId/local-content/decisions/from-proposals'");
		const routeEnd = source.indexOf("app.post('/v1/projects/:projectId/update-plans'", routeStart);
		expect(routeStart).toBeGreaterThan(-1);
		expect(routeEnd).toBeGreaterThan(routeStart);
		const routeBlock = source.slice(routeStart, routeEnd);
		expect(routeBlock).toContain('createPlatformOperation');
		expect(routeBlock).not.toMatch(/\bwriteLocalContentRecord\(|\bcreateRelatedLocalContentRecord\(|\bcreateDecisionFromProposals\(/u);
		expect(routeBlock).not.toMatch(/\bwriteFile\(|process\.cwd\(\).*src.*content/u);
	});

	it('routes app, market, and auth session state through the backend Market API facade', () => {
		const proxy = readFileSync('src/pages/v1/[...all].ts', 'utf8');
		expect(proxy).toContain('resolveMarketApiBaseUrl');
		expect(proxy).toContain('marketApiServiceHeaders');
		expect(proxy).toContain('setApiAccessTokenCookie');
		expect(proxy).toContain('redactAuthTokens');
		expect(proxy).not.toMatch(/resolveMarketStore|loadSiteWebSession|AGENT_WORK_QUEUE|SITE_DATA_DB/u);

		const middleware = readFileSync('src/middleware.ts', 'utf8');
		expect(middleware).toContain('/v1/me');
		expect(middleware).toContain('apiAccessTokenFromCookies');
		expect(middleware).toContain('clearApiAccessTokenCookie');
		expect(middleware).toContain('TREESEED_DEV_RESET_ID');
		expect(middleware).not.toContain('loadSiteWebSession');
	});

	it('keeps browser logout redirecting even when upstream session revocation fails', () => {
		const proxy = readFileSync('src/pages/v1/[...all].ts', 'utf8');
		expect(proxy).toContain("const logoutRedirect = path === 'auth/logout' && method === 'GET'");
		expect(proxy).toContain('if (logoutRedirect) {');
		expect(proxy).toContain('clearApiAccessTokenCookie(context)');
		expect(proxy).toContain("responseHeaders.set('location', target)");
		expect(proxy).toContain('status: 303');
		expect(proxy).toContain('if (shouldClearAuthCookie(path, method, response.ok))');
		expect(proxy).not.toContain('if (logoutRedirect && response.ok)');
	});

	it('keeps the Astro endpoint surface thin and routes Market APIs through v1', () => {
		const endpointFiles = files('src/pages')
			.filter((path) => /\.(ts|js)$/u.test(path))
			.filter((path) => path.startsWith('src/pages/api/')
				|| path.startsWith('src/pages/auth/')
				|| path.startsWith('src/pages/v1/'))
			.sort();
		expect(endpointFiles).toEqual([
			'src/pages/api/form/submit.ts',
			'src/pages/api/markdown/preview.ts',
			'src/pages/auth/callback/[provider].ts',
			'src/pages/v1/[...all].ts',
		]);

		const runtimeFiles = files('src')
			.filter((path) => /\.(astro|ts|js)$/u.test(path))
			.filter((path) => !path.startsWith('src/api/'))
			.filter((path) => !path.startsWith('src/content/'));
		const offenders = runtimeFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /(?:["'`]\s*|fetch\(\s*)\/(?:api\/(?:auth|governance|infrastructure|knowledge|me|workdays)|auth\/(?:appearance|delete-account|email|password|profile|providers|session|sessions|sign-out|verified|username\/check))/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('keeps Market database credentials out of browser and Astro UI code', () => {
		const sourceFiles = files('src')
			.filter((path) => /\.(astro|ts|js)$/u.test(path))
			.filter((path) => path.startsWith('src/pages/app/')
				|| path.startsWith('src/pages/market/')
				|| path.startsWith('src/pages/auth/')
				|| path.startsWith('src/pages/u/')
				|| path.startsWith('src/pages/t/')
				|| path.startsWith('src/pages/team-invites/')
				|| path.startsWith('src/pages/api/')
				|| path.startsWith('src/components/')
				|| path.startsWith('src/view-models/')
				|| path === 'src/middleware.ts'
				|| path === 'src/lib/market/store.ts'
				|| path === 'src/lib/market/catalog.ts')
			.filter((path) => !path.startsWith('src/api/'))
			.filter((path) => !path.startsWith('src/market-operations-runner/'))
			.filter((path) => !path.startsWith('src/lib/market/seeds/'));
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /TREESEED_MARKET_DATABASE_URL|SITE_DATA_DB|platform-operation-store|RelationalDatabaseAdapter|MarketControlPlaneStore|from ['"].*api\/store|from ['"].*auth\/account|from ['"].*auth\/better-auth|from ['"].*auth\/session-store|resolveMarketStore|loadSiteWebSession|createSiteWebSession|createSiteBetterAuth|ensureBetterAuthD1Schema|createCoreAuthProvider/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('does not use the Wrangler D1 query adapter in runtime source', () => {
		const sourceFiles = [...files('src'), ...files('packages/core/src'), ...files('packages/sdk/src')]
			.filter((path) => /\.(astro|ts|js)$/u.test(path));
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /wrangler-d1|WranglerD1Database|LocalWranglerD1Database|wrangler d1 execute/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('keeps device login approval same-origin outside local development', () => {
		const source = readFileSync('src/pages/auth/device/approve.astro', 'utf8');
		expect(source).toContain('formAction: `${Astro.url.pathname}${Astro.url.search}`');
		expect(source).toContain('serverUrls: [`${Astro.url.origin}/v1/auth/device/approve`]');
		expect(source).toContain("return 'http://127.0.0.1:3000';");
		expect(source).not.toContain("apiApprovalBaseUrl ? `${apiApprovalBaseUrl}/auth/device/approve`");
		expect(source).not.toContain('createCoreAuthProvider');
	});

	it('redirects legacy v1 device approval browser links before auth checks', () => {
		const source = readFileSync('src/pages/v1/[...all].ts', 'utf8');
		expect(source).toContain('isRedirectedDeviceApproval');
		expect(source).toContain("new URL('/auth/device/approve', context.url.origin)");
	});

	it('keeps backend runtime implementation out of core source', () => {
		const sourceFiles = files('packages/core/src')
			.filter((path) => /\.(astro|ts|js)$/u.test(path))
			.filter((path) => path !== 'packages/core/src/dev.ts');
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /@treeseed\/agent|from ['"].*\/api\/|from ['"].*\/agents\/|from ['"].*\/services\/|Hono|worker runner|workday manager/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('prevents agent from depending on core web runtime', () => {
		const sourceFiles = files('packages/agent/src')
			.filter((path) => /\.(ts|js)$/u.test(path));
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /@treeseed\/core|\\.astro|Starlight/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('keeps package and market environment registries uniquely owned', () => {
		const registryFiles = [
			'packages/sdk/src/platform/env.yaml',
			'packages/core/src/env.yaml',
			'packages/agent/src/env.yaml',
			'src/env.yaml',
		];
		const owners = new Map<string, string[]>();
		for (const path of registryFiles) {
			const registry = parse(readFileSync(path, 'utf8')) as { entries?: Record<string, unknown> };
			for (const id of Object.keys(registry.entries ?? {})) {
				owners.set(id, [...(owners.get(id) ?? []), path]);
			}
		}
		const duplicateOwners = [...owners.entries()]
			.filter(([, paths]) => paths.length > 1)
			.map(([id, paths]) => ({ id, paths }));
		expect(duplicateOwners).toEqual([]);
	});
});
