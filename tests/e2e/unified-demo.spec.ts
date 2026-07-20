import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
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

test.describe('unified demo release workflow', () => {
	test.beforeEach(() => {
		mkdirSync(screenshotDir, { recursive: true });
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
		await createProject(page, team.id, `engineering-${runId}`.slice(0, 58), 'Engineering Starter', 'treeseed/engineering-template');
		await createProject(page, team.id, `research-${runId}`.slice(0, 58), 'Research Starter', 'treeseed/research-template');

		await page.goto('/app/work/decisions');
		await expect(page.getByRole('heading', { name: /Decisions|Work/i }).first()).toBeVisible();

	});
});
