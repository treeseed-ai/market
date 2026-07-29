import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

function files(root: string): string[] {
	if (!existsSync(root)) return [];
	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const path = join(root, entry.name);
		if (entry.isDirectory() && ['.fixtures', '.git', '.treeseed', 'dist', 'node_modules'].includes(entry.name)) {
			return [];
		}
		return entry.isDirectory() ? files(path) : [path];
	});
}

function moduleFamilySource(entrypoint: string, modulesRoot: string): string {
	return [
		readFileSync(entrypoint, 'utf8'),
		...files(modulesRoot)
			.filter((path) => /\.(ts|js)$/u.test(path))
			.map((path) => readFileSync(path, 'utf8')),
	].join('\n');
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
	}, 30_000);

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

		const verifyWorkflow = readFileSync('.github/workflows/verify.yml', 'utf8');
		expect(existsSync('.github/workflows/deploy.yml')).toBe(false);
		expect(verifyWorkflow).not.toMatch(/deploy-processing|processing-parity|deploy_processing/u);
		expect(existsSync('.github/workflows/hosted-project.yml')).toBe(false);

		const siteConfig = readFileSync('treeseed.site.yaml', 'utf8');
		expect(siteConfig).not.toMatch(/\bworkdayManager:|\bworkerRunner:|treeseed-processing/u);
	});

	it('keeps root Market as the only hosted site manifest layered on admin', () => {
		const rootSite = parse(readFileSync('treeseed.site.yaml', 'utf8')) as any;
		const siteManifests = files('.')
			.filter((path) => path.endsWith('treeseed.site.yaml'))
			.filter((path) => !path.includes('/node_modules/'))
			.filter((path) => !path.includes('/dist/'));

		expect(siteManifests).toContain('treeseed.site.yaml');
		expect(siteManifests).not.toContain('packages/admin/treeseed.site.yaml');
		expect(rootSite.plugins?.map((plugin: any) => plugin.package)).toContain('@treeseed/admin/plugin');
		const forbiddenRootAdminPaths = [
			'src/pages/app',
			'src/pages/auth',
			'src/pages/v1',
			'src/pages/team-invites',
			'src/pages/templates',
			'src/pages/u',
			'src/pages/t',
			'src/lib/auth',
			'src/lib/market',
			'src/lib/runtime',
			'src/lib/host-crypto.ts',
			'src/view-models',
			'src/layouts/TreeseedAppLayout.astro',
			'src/layouts/TreeseedPublicLayout.astro',
		];
		const existingAdminPaths = forbiddenRootAdminPaths.filter((path) => existsSync(path));
		expect(existingAdminPaths).toEqual([]);

		for (const allowedRootPath of [
			'src/content',
			'src/config.yaml',
			'src/env.yaml',
			'src/manifest.yaml',
			'src/content.config.ts',
			'src/middleware.ts',
		]) {
			expect(existsSync(allowedRootPath), allowedRootPath).toBe(true);
		}
	});

	it('keeps any root overrides on public admin and UI package exports', () => {
		const overrideFiles = existsSync('src/overrides')
			? files('src/overrides').filter((path) => /\.(astro|ts|js)$/u.test(path))
			: [];

		const offenders = overrideFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /packages\/(?:admin|ui)\/src|(?:from|import)\s*['"](?:\.\.\/)+packages\/(?:admin|ui)\//u.test(source);
		});
		expect(offenders).toEqual([]);

		const overrideSource = overrideFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
		if (overrideFiles.length > 0) {
			expect(overrideSource).toContain('@treeseed/admin/');
			expect(overrideSource).toContain('@treeseed/ui/');
		}
	});

	it('reserves ecommerce implementation for the hosted market layer', () => {
		const adminSources = files('packages/admin/src')
			.filter((path) => /\.(astro|ts|tsx|js|jsx|mjs)$/u.test(path))
			.filter((path) => path !== 'packages/admin/src/commerce.ts');
		const adminPaymentOffenders = adminSources.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /(?:from ['"]stripe['"]|from ['"]@stripe\/stripe-js['"]|import\(['"]stripe['"]|import\(['"]@stripe\/stripe-js['"]|checkout session|payment intent|seller payout|coupon)/iu.test(source);
		});

		expect(adminPaymentOffenders).toEqual([]);
		expect(files('src/pages')).toEqual([]);
		expect(existsSync('src/pages/billing')).toBe(false);
	});

	it('declares the Treeseed operations runner from the API application manifest', () => {
		const rootSite = parse(readFileSync('treeseed.site.yaml', 'utf8')) as any;
		expect(rootSite.services?.marketOperationsRunner).toBeUndefined();
		expect(rootSite.services?.api).toBeUndefined();
		expect(rootSite.services?.marketDatabase).toBeUndefined();

		const site = parse(readFileSync('packages/api/treeseed.site.yaml', 'utf8')) as any;
		expect(site.services?.operationsRunner).toMatchObject({
			enabled: true,
			provider: 'railway',
			rootDir: '.',
			railway: {
				serviceName: 'treeseed-ops-01',
				rootDir: '.',
				dockerfilePath: '/Dockerfile.operations-runner',
				startCommand: 'npm run start:runner',
				volumeMountPath: '/data',
				runnerPool: {
					bootstrapCount: 2,
					maxRunners: 4,
					volumeMountPath: '/data',
				},
			},
			environments: {
				staging: {
					serviceName: 'treeseed-ops-staging-01',
				},
				prod: {
					serviceName: 'treeseed-ops-production-01',
				},
			},
		});
		expect(site.publicTreeDxFederation?.railway?.nodePool).toEqual({
			bootstrapCount: 2,
			maxNodes: 4,
		});
		const serialized = JSON.stringify(site.services?.operationsRunner ?? {});
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

	it('routes app, market, and auth session state through the backend API facade', () => {
		const proxy = readFileSync('packages/admin/src/pages/v1/[...all].ts', 'utf8');
		expect(proxy).toContain('resolveApiBaseUrl');
		expect(proxy).toContain('apiServiceHeaders');
		expect(proxy).toContain('skipUserAssertion: Boolean(token)');
		expect(proxy).toContain('setApiAccessTokenCookie');
		expect(proxy).toContain('redactAuthTokens');
		expect(proxy).toContain("path === 'healthz' || path.startsWith('healthz/')");
		expect(proxy).not.toMatch(/resolveMarketStore|loadSiteWebSession|AGENT_WORK_QUEUE|SITE_DATA_DB/u);

		const apiClient = moduleFamilySource(
			'packages/admin/src/lib/market/api-client.ts',
			'packages/admin/src/lib/market/api-client',
		);
		expect(apiClient).toContain('skipUserAssertion: Boolean(token)');

		const middleware = readFileSync('packages/admin/src/middleware.ts', 'utf8');
		expect(middleware).toContain('/v1/me');
		expect(middleware).toContain('apiAccessTokenFromCookies');
		expect(middleware).toContain('clearApiAccessTokenCookie');
		expect(middleware).toContain('TREESEED_DEV_RESET_ID');
		expect(middleware).not.toContain('loadSiteWebSession');
	});

	it('keeps logout a CSRF-protected POST while GET remains non-mutating', () => {
		const logout = readFileSync('packages/admin/src/pages/auth/logout.ts', 'utf8');
		expect(logout).toContain('export const GET');
		expect(logout).toContain('export const POST');
		expect(logout).toContain('requireCsrf');
		expect(logout).toContain("request('POST', '/v1/auth/logout'");
		expect(logout).toContain('clearApiAccessTokenCookie(context)');
		expect(logout).toContain('pageFormResponse(context');
		expect(logout).toContain("new URLSearchParams({ signedOut: '1' })");
		expect(logout).toContain('redirect: signInPath');
		expect(logout.split('export const GET')[1].split('export const POST')[0]).not.toContain('clearApiAccessTokenCookie');
	});

	it('keeps the Astro endpoint surface thin and routes APIs through v1', () => {
		expect(existsSync('src/api')).toBe(false);
		expect(existsSync('src/market-operations-runner')).toBe(false);
		const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
			scripts?: Record<string, string>;
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
		};
		expect(packageJson.dependencies).not.toHaveProperty('@treeseed/api');
		expect(packageJson.devDependencies).not.toHaveProperty('@treeseed/api');
		for (const forbidden of ['build:api', 'build:market-operations-runner', 'db:migrate:market', 'test:acceptance', 'market:operations-runner']) {
			expect(packageJson.scripts).not.toHaveProperty(forbidden);
		}
		expect(packageJson.scripts?.build).toBe('npm run build:web');
		const endpointFiles = [...files('src/pages'), ...files('packages/admin/src/pages')]
			.filter((path) => /\.(ts|js)$/u.test(path))
			.filter((path) => path.startsWith('src/pages/api/')
				|| path.startsWith('packages/admin/src/pages/api/')
				|| path.startsWith('packages/admin/src/pages/auth/')
				|| path.startsWith('packages/admin/src/pages/v1/'))
			.sort();
		expect(endpointFiles).toEqual([
			'packages/admin/src/pages/auth/callback/[provider].ts',
			'packages/admin/src/pages/auth/logout.ts',
			'packages/admin/src/pages/v1/[...all].ts',
		]);

		const runtimeFiles = [...files('src'), ...files('packages/admin/src')]
			.filter((path) => /\.(astro|ts|js)$/u.test(path))
			.filter((path) => !path.startsWith('src/content/'));
		const offenders = runtimeFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /(?:["'`]\s*|fetch\(\s*)\/(?:api\/(?:auth|governance|infrastructure|knowledge|me|workdays)|auth\/(?:appearance|delete-account|email|password|profile|providers|session|sessions|sign-out|verified|username\/check))/u.test(source);
		});
		expect(offenders).toEqual([]);
	});

	it('keeps Market database credentials out of browser and Astro UI code', () => {
		const sourceFiles = [...files('src'), ...files('packages/admin/src')]
			.filter((path) => /\.(astro|ts|js)$/u.test(path))
			.filter((path) => path.startsWith('packages/admin/src/pages/app/')
				|| path.startsWith('src/pages/market/')
				|| path.startsWith('packages/admin/src/pages/auth/')
				|| path.startsWith('src/pages/u/')
				|| path.startsWith('src/pages/t/')
				|| path.startsWith('src/pages/team-invites/')
				|| path.startsWith('src/pages/api/')
				|| path.startsWith('src/components/')
				|| path.startsWith('packages/admin/src/view-models/')
				|| path === 'src/middleware.ts'
				|| path === 'packages/admin/src/lib/market/store.ts'
				|| path === 'packages/admin/src/lib/market/catalog.ts')
			.filter((path) => !path.startsWith('packages/admin/src/lib/market/seeds/'));
		const offenders = sourceFiles.filter((path) => {
			const source = readFileSync(path, 'utf8');
			return /TREESEED_MARKET_DATABASE_URL|SITE_DATA_DB|platform-operation-store|RelationalDatabaseAdapter|MarketControlPlaneStore|from ['"].*api\/store|from ['"].*auth\/account(?!s\b)|from ['"].*auth\/better-auth|from ['"].*auth\/session-store|resolveMarketStore|loadSiteWebSession|createSiteWebSession|createSiteBetterAuth|ensureBetterAuthD1Schema|createCoreAuthProvider/u.test(source);
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
		const source = readFileSync('packages/admin/src/pages/auth/device/approve.astro', 'utf8');
		expect(source).toContain('directApprovalAction = `${Astro.url.pathname}${Astro.url.search}`');
		expect(source).toContain('createApiFacade(Astro)');
		expect(source).toContain('api.approveDevice(userCode)');
		expect(source).toContain('requireCsrf');
		expect(source).not.toContain('principalId');
		expect(source).not.toContain('createCoreAuthProvider');
	});

	it('redirects legacy v1 device approval browser links before auth checks', () => {
		const source = readFileSync('packages/admin/src/pages/v1/[...all].ts', 'utf8');
		expect(source).toContain('isRedirectedDeviceApproval');
		expect(source).toContain("new URL('/auth/device/approve', context.url.origin)");
	});

	it('keeps backend runtime implementation out of core source', () => {
		const sourceFiles = files('packages/core/src')
			.filter((path) => /\.(astro|ts|js)$/u.test(path))
			.filter((path) => path !== 'packages/core/src/dev.ts')
			.filter((path) => !path.startsWith('packages/core/src/dev/'));
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
		const intentionallyShared = new Set([
			'TREESEED_API_BASE_URL',
			'TREESEED_CAPACITY_ACCEPTANCE_ADMIN_TOKEN',
			'TREESEED_CAPACITY_ACCEPTANCE_AGENT_CLASS_ID',
			'TREESEED_CAPACITY_ACCEPTANCE_API_URL',
			'TREESEED_CAPACITY_ACCEPTANCE_PROJECT_ID',
			'TREESEED_CAPACITY_ACCEPTANCE_PROVIDER_ID',
			'TREESEED_CAPACITY_ACCEPTANCE_TEAM_ID',
			'TREESEED_RAILWAY_PROJECT_ID',
			'TREESEED_RAILWAY_WORKSPACE',
		]);
		const duplicateOwners = [...owners.entries()]
			.filter(([, paths]) => paths.length > 1)
			.filter(([id]) => !intentionallyShared.has(id))
			.map(([id, paths]) => ({ id, paths }));
		expect(duplicateOwners).toEqual([]);
	});
});
