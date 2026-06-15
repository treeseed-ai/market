import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const runId = `demo-${Date.now().toString(36)}`;
const demoPassword = `TreeSeed-${runId}-Human-Workflow-123!`;
const demoEmail = `treeseed+${runId}@treeseed.ai`;
const demoUsername = `demo-${runId}`.replace(/[^a-z0-9-]/gu, '-').slice(0, 48);
const teamSlug = `team-${runId}`.replace(/[^a-z0-9-]/gu, '-').slice(0, 48);
const demoArtifactsDir = process.env.TREESEED_DEMO_ARTIFACTS_DIR
	? path.resolve(process.env.TREESEED_DEMO_ARTIFACTS_DIR)
	: path.resolve(process.env.INIT_CWD ?? process.cwd(), 'test-results/demo-artifacts');
const screenshotDir = path.join(demoArtifactsDir, 'screenshots');
const providerDataDir = path.join(demoArtifactsDir, 'provider-data');
const recipe = process.env.TREESEED_DEMO_RECIPE_JSON ? JSON.parse(process.env.TREESEED_DEMO_RECIPE_JSON) : null;

function screenshotPath(name: string) {
	return path.join(screenshotDir, name);
}

function recipeStep(operation: string) {
	const steps = Array.isArray(recipe?.orderedSteps) ? recipe.orderedSteps : [];
	return steps.find((step: any) => step?.operation === operation) ?? null;
}

function recipeScreenshot(operation: string, fallback: string) {
	const step = recipeStep(operation);
	const artifact = Array.isArray(step?.artifacts)
		? step.artifacts.find((entry: any) => typeof entry?.screenshot === 'string')
		: null;
	return screenshotPath(artifact?.screenshot ?? fallback);
}

async function waitForApi(request: APIRequestContext) {
	for (let attempt = 0; attempt < 30; attempt += 1) {
		const response = await request.get('http://127.0.0.1:3000/healthz').catch(() => null);
		if (response?.ok()) return;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error('Timed out waiting for local TreeSeed API.');
}

function serviceHeaders() {
	return {
		'content-type': 'application/json',
		'x-treeseed-service-id': 'web',
		'x-treeseed-service-secret': 'treeseed-web-service-dev-secret',
		'x-treeseed-acceptance-email-bypass': '1',
	};
}

async function browserJson(page: Page, method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown) {
	const result = await page.evaluate(async ({ method: requestMethod, url: requestUrl, body: requestBody }) => {
		const response = await fetch(requestUrl, {
			method: requestMethod,
			headers: requestBody === undefined ? { accept: 'application/json' } : { accept: 'application/json', 'content-type': 'application/json' },
			body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
		});
		const payload = await response.json().catch(() => null);
		return { ok: response.ok, status: response.status, payload };
	}, { method, url, body });
	expect(result.ok, `${method} ${url}: ${result.payload?.error ?? result.status}`).toBeTruthy();
	return result.payload?.payload ?? result.payload;
}

async function registerAndConfirm(page: Page, request: APIRequestContext) {
	await page.goto('/auth/register?returnTo=%2Fapp%2Fteams%2Fnew');
	await expect(page.getByRole('heading', { name: /Create account/i })).toBeVisible();
	await page.screenshot({ path: screenshotPath('register-before-submit.png'), fullPage: true });
	const signUp = await request.post('http://127.0.0.1:3000/v1/auth/web/sign-up', {
		headers: serviceHeaders(),
		data: {
			email: demoEmail,
			username: demoUsername,
			password: demoPassword,
			firstName: 'Demo',
			lastName: 'Owner',
			name: 'Demo Owner',
			returnTo: '/app/teams/new',
		},
	});
	const signUpPayload = await signUp.json();
	expect(signUp.ok(), signUpPayload?.error).toBeTruthy();
	const token = signUpPayload?.payload?.confirmationToken;
	if (typeof token === 'string') {
		await page.goto(`/auth/confirm-email?token=${encodeURIComponent(token)}&returnTo=%2Fapp%2Fteams%2Fnew`);
		await expect(page).toHaveURL(/\/app\/teams\/new/u);
		return;
	}
	const confirmed = await request.post('http://127.0.0.1:3000/v1/acceptance/auth/confirm-email', {
		headers: serviceHeaders(),
		data: { email: demoEmail },
	});
	const confirmedPayload = await confirmed.json().catch(() => null);
	expect(confirmed.ok(), confirmedPayload?.error).toBeTruthy();
	await page.evaluate(async ({ email, password }) => {
		const response = await fetch('/v1/auth/web/sign-in', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});
		if (!response.ok) throw new Error(`Sign-in after acceptance confirmation failed with ${response.status}`);
	}, { email: demoEmail, password: demoPassword });
	await page.goto('/app/teams/new');
}

async function createPrivateTeam(page: Page) {
	await page.goto('/app/teams/new');
	const form = page.locator('form#team-create-form');
	await expect(form).toBeVisible();
	await form.locator('input[name="name"]').fill(teamSlug);
	await form.locator('input[name="displayName"]').fill('Demo Private Team');
	await form.locator('textarea[name="profileSummary"]').fill('Private team created by the full production-shaped demo workflow.');
	await page.screenshot({ path: screenshotPath('private-team-before-submit.png'), fullPage: true });
	await form.getByRole('button', { name: /^Create team$/i }).click();
	await expect(page).toHaveURL(/\/app\/teams/u);
}

async function activeTeam(page: Page) {
	const teams = await browserJson(page, 'GET', '/v1/teams');
	const team = teams.find?.((entry: any) => entry.name === teamSlug || entry.slug === teamSlug || entry.displayName === 'Demo Private Team');
	expect(team, 'created private team should be returned by /v1/teams').toBeTruthy();
	return team;
}

async function createProject(page: Page, teamId: string, slug: string, name: string, sourceRef: string) {
	const project = await browserJson(page, 'POST', `/v1/teams/${encodeURIComponent(teamId)}/projects`, {
			slug,
			name,
			description: `${name} created from ${sourceRef} for the full demo workflow.`,
			metadata: {
				sourceKind: 'template',
				sourceRef,
				contentRepository: { accessMode: 'treedx' },
				siteRepository: { accessMode: 'filesystem' },
				projectRepository: { accessMode: 'filesystem' },
			},
	});
	return project.project ?? project.payload?.project ?? project;
}

function parseProviderEnv(text: string) {
	const env: Record<string, string> = {};
	for (const line of text.split(/\r?\n/u)) {
		const match = /^([A-Z0-9_]+)=(.*)$/u.exec(line.trim());
		if (match) env[match[1]] = match[2];
	}
	return env;
}

function runProviderRole(role: 'register' | 'runner', env: Record<string, string>) {
	const args = ['--experimental-transform-types', 'packages/agent/src/provider/entrypoint.ts', role, '--json'];
	if (role === 'runner') args.push('--once');
	const result = spawnSync(process.execPath, args, {
		cwd: process.env.INIT_CWD ?? process.cwd(),
		env: {
			...process.env,
			...env,
			TREESEED_PROVIDER_DATA_DIR: providerDataDir,
			TREESEED_PROVIDER_ENVIRONMENT: 'local',
			TREESEED_AGENT_EXECUTION_PROVIDER: 'codex',
		},
		encoding: 'utf8',
		timeout: role === 'runner' ? 180_000 : 30_000,
	});
	expect(result.status, `${role} stdout:\n${result.stdout}\n${role} stderr:\n${result.stderr}`).toBe(0);
	const lines = result.stdout.trim().split('\n');
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		if (!lines[index].trim().startsWith('{')) continue;
		try {
			return JSON.parse(lines.slice(index).join('\n'));
		} catch {
			// Try the next JSON-looking block.
		}
	}
	throw new Error(`${role} stdout did not include a parseable JSON result:\n${result.stdout}`);
}

function writeProviderPortfolioIndex(projectId: string) {
	const indexPath = path.join(providerDataDir, 'portfolio', 'index.json');
	mkdirSync(path.dirname(indexPath), { recursive: true });
	writeFileSync(indexPath, `${JSON.stringify({
		ok: true,
		generatedAt: new Date().toISOString(),
		team: { id: teamSlug, slug: teamSlug, name: 'Demo Private Team' },
		dataDir: providerDataDir,
		projects: [{
			projectId,
			slug: 'engineering-starter',
			enabled: true,
			repository: {
				ok: true,
				path: process.env.INIT_CWD ?? process.cwd(),
				branch: 'main',
				commitSha: null,
			},
			agents: { ok: true, count: 1, enabledCount: 1, handlers: ['planner'], diagnostics: [], reportPath: null },
			tests: { ok: true, count: 1, reportPath: null },
			workDay: null,
		}],
		reportPath: path.join(providerDataDir, 'reports', 'portfolio-processing.json'),
		indexPath,
	}, null, 2)}\n`, 'utf8');
}

test.describe('unified demo release workflow', () => {
	test.beforeEach(() => {
		mkdirSync(screenshotDir, { recursive: true });
		mkdirSync(providerDataDir, { recursive: true });
	});

	test('presents the marketplace-first homepage story', async ({ page }) => {
		await page.goto('/');
		const main = page.locator('main');
		await expect(page.getByRole('heading', { name: /buy, launch, and govern reusable knowledge work/i })).toBeVisible();
		await expect(main.getByText(/Browse workflow imports, knowledge packs, hosted project options/i)).toBeVisible();
		await expect(page.getByRole('link', { name: /browse the market/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /create private team/i })).toBeVisible();
		await expect(page.getByRole('heading', { name: /direction, capacity, situation, results, memory/i })).toBeVisible();
		await expect(page.getByRole('heading', { name: /Karyon as a governed knowledge project/i })).toBeVisible();
		await page.screenshot({ path: recipeScreenshot('navigate', 'homepage-marketplace.png'), fullPage: true });
	});

	test('proves the full human workflow from private team to published artifact', async ({ page, request }) => {
		if (!process.env.TREESEED_CODEX_AUTH_FILE && !process.env.TREESEED_CODEX_AUTH_JSON_B64) {
			throw new Error('Live Codex demo requires TREESEED_CODEX_AUTH_FILE or TREESEED_CODEX_AUTH_JSON_B64.');
		}
		await waitForApi(request);
		await registerAndConfirm(page, request);
		await createPrivateTeam(page);
		const team = await activeTeam(page);

		await page.goto('/app/hosts/knowledge-library');
		await expect(page.getByRole('heading', { name: 'Team TreeDX', exact: true })).toBeVisible();
		await expect(page.getByText(/TreeDX is the canonical data plane/i)).toBeVisible();
		await expect(page.getByText(/mirrors and shares/i)).toBeVisible();
		await page.screenshot({ path: recipeScreenshot('verify.treedx', 'private-treedx.png'), fullPage: true });

		await page.goto('/app/projects/new');
		await expect(page.getByRole('heading', { name: /Choose project template/i })).toBeVisible();
		await expect(page.getByText(/Engineering/i).first()).toBeVisible();
		await expect(page.getByText(/Research/i).first()).toBeVisible();
		await page.screenshot({ path: recipeScreenshot('project.create', 'starter-projects.png'), fullPage: true });
		const engineering = await createProject(page, team.id, `engineering-${runId}`.slice(0, 58), 'Engineering Starter', 'treeseed/engineering-template');
		const research = await createProject(page, team.id, `research-${runId}`.slice(0, 58), 'Research Starter', 'treeseed/research-template');

		await page.goto('/app/capacity/providers/new');
		await expect(page.getByRole('heading', { name: /Create provider/i })).toBeVisible();
		await expect(page.getByText(/Provider creators do not configure TreeSeed credits/i)).toBeVisible();
		const providerForm = page.locator('form').filter({ has: page.getByRole('button', { name: /^Create provider$/i }) });
		await providerForm.locator('input[name="name"]').fill('Local Codex Demo Provider');
		await providerForm.locator('input[name="limitAmount"]').fill('300');
		await expect(providerForm.locator('input[name="dailyUsageCapPercent"]')).toHaveValue('30');
		await page.screenshot({ path: recipeScreenshot('capacity-provider.create', 'capacity-provider-before-submit.png'), fullPage: true });
		await providerForm.getByRole('button', { name: /^Create provider$/i }).click();
		await expect(page.getByText(/Provider and native capacity created/i)).toBeVisible({ timeout: 15_000 });
		const keyText = await page.locator('#provider-key').innerText();
		const instructionText = await page.locator('#provider-instructions').innerText();
		const providerEnv = {
			...parseProviderEnv(instructionText),
			...parseProviderEnv(keyText),
			TREESEED_MANAGEMENT_API_URL: 'http://127.0.0.1:3000',
			TREESEED_MARKET_URL: 'http://127.0.0.1:3000',
			TREESEED_MARKET_ID: 'local',
		};
		expect(providerEnv.TREESEED_CAPACITY_PROVIDER_API_KEY).toMatch(/^tsp_/u);
		const registration = runProviderRole('register', providerEnv);
		expect(registration.ok).toBe(true);

		await page.goto('/app/capacity');
		const providers = await browserJson(page, 'GET', `/v1/teams/${encodeURIComponent(team.id)}/capacity-providers`);
		const registeredProvider = providers.find?.((entry: any) => entry.name === 'Local Codex Demo Provider');
		expect(registeredProvider, 'UI-created provider should be returned by the capacity provider API').toBeTruthy();
		expect(JSON.stringify(registeredProvider)).toMatch(/connected|online|registered/i);
		await page.screenshot({ path: recipeScreenshot('capacity.status', 'capacity-provider-registered.png'), fullPage: true });

		await page.goto('/app/capacity/allocation');
		await page.locator('input[name="allocations"]').evaluate((input: HTMLInputElement, projects: any[]) => {
			input.value = JSON.stringify(projects.map((project, index) => ({ id: project.id, name: project.name, percentage: index === 0 ? 70 : 30 })));
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
		}, [engineering, research]);
		await page.screenshot({ path: recipeScreenshot('capacity.allocate.portfolio', 'capacity-allocation-portfolio.png'), fullPage: true });
		await page.getByRole('button', { name: /Save portfolio allocation/i }).click();
		await expect(page.getByText(/Allocation saved/i)).toBeVisible();

		await page.goto(`/app/capacity/allocation?projectId=${encodeURIComponent(engineering.id)}`);
		await expect(page.getByRole('heading', { name: /agent classes/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /Back to portfolio/i })).toBeVisible();
		await page.screenshot({ path: recipeScreenshot('capacity.allocate.project', 'capacity-allocation-agent-classes.png'), fullPage: true });

		writeProviderPortfolioIndex(engineering.id);
		await page.goto(`/app/projects/${encodeURIComponent(engineering.id)}/workdays`);
		await page.getByRole('button', { name: /Request local workday/i }).click();
		await expect(page).toHaveURL(/requested=/u);
		const runner = runProviderRole('runner', providerEnv);
		expect(runner.result?.claimed, JSON.stringify(runner, null, 2)).toBe(1);
		expect(runner.result?.result?.task?.status ?? runner.result?.result?.ok).toBeTruthy();

		await page.goto('/app/work/decisions');
		await expect(page.getByRole('heading', { name: /Decisions|Work/i }).first()).toBeVisible();

		await page.goto('/app/knowledge/artifacts');
		await expect(page.getByText(/Live Codex provider artifact/i)).toBeVisible({ timeout: 15_000 });
		await page.screenshot({ path: recipeScreenshot('knowledge.inspect-artifacts', 'knowledge-artifacts.png'), fullPage: true });

		await page.goto('/app/knowledge/publish');
		await expect(page.getByRole('heading', { name: /Publish project artifacts/i })).toBeVisible();
		await page.screenshot({ path: screenshotPath('publish-before-submit.png'), fullPage: true });
	});
});
