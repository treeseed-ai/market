import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DataType, newDb } from 'pg-mem';
import { MarketPostgresDatabase } from '../../../packages/api/src/api/market-postgres.ts';
import { MarketControlPlaneStore } from '../../../packages/api/src/api/store.ts';
import { createCapacityControlPlane } from '../../../packages/api/src/api/capacity/control-plane.ts';

export function createServiceWorkflowFixture(input: {
	templatePath: string;
	temporaryPrefix: string;
	files?: Record<string, string>;
	initializeGit?: boolean;
}) {
	const root = mkdtempSync(join(tmpdir(), input.temporaryPrefix));
	cpSync(resolve(input.templatePath), root, { recursive: true });
	for (const [path, content] of Object.entries(input.files ?? {})) {
		mkdirSync(resolve(root, path, '..'), { recursive: true });
		writeFileSync(resolve(root, path), content);
	}
	let exactBaseRef: string | null = null;
	if (input.initializeGit) {
		execFileSync('git', ['init', '-b', 'main'], { cwd: root, stdio: 'ignore' });
		execFileSync('git', ['config', 'user.email', 'service-workflow@example.test'], { cwd: root });
		execFileSync('git', ['config', 'user.name', 'Service Workflow'], { cwd: root });
		execFileSync('git', ['add', '.'], { cwd: root });
		execFileSync('git', ['commit', '-m', 'test: service workflow baseline'], { cwd: root, stdio: 'ignore' });
		exactBaseRef = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
	}
	return { root, exactBaseRef };
}

export function removeServiceWorkflowFixture(root: string) {
	rmSync(root, { recursive: true, force: true });
}

export function createServiceWorkflowDatabaseHarness() {
	const memory = newDb();
	memory.public.registerFunction({ name: 'md5', args: [DataType.text], returns: DataType.text, implementation: (value: string) => `md5:${value}` });
	const pg = memory.adapters.createPg();
	const database = MarketPostgresDatabase.fromPool(new pg.Pool(), { migrationRoot: resolve('packages/sdk/drizzle/market') });
	const host = new MarketControlPlaneStore({ repoRoot: process.cwd() }, database);
	return { database, store: createCapacityControlPlane(host) };
}

export function serviceWorkflowJson(payload: unknown, status = 200, headers: Record<string, string> = {}) {
	return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json', ...headers } });
}

export function createServiceWorkflowTreeDxFetch(input: {
	repoRoot: string;
	workspaceFiles: Map<string, string>;
	externalRequest?: (url: URL, init?: RequestInit) => Response | Promise<Response> | null | Promise<null>;
}): typeof fetch {
	return async (request, init) => {
		const url = new URL(String(request));
		const external = await input.externalRequest?.(url, init);
		if (external) return external;
		const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
		if (url.pathname.includes('/repos/') && url.pathname.endsWith('/files/read')) {
			const path = String(body.path ?? '');
			if (input.workspaceFiles.has(path)) return serviceWorkflowJson({ file: { path, content: input.workspaceFiles.get(path) } });
			try { return serviceWorkflowJson({ file: { path, content: readFileSync(resolve(input.repoRoot, path), 'utf8') } }); }
			catch { return serviceWorkflowJson({ error: { code: 'not_found' } }, 404); }
		}
		if (url.pathname.endsWith('/context/build')) return serviceWorkflowJson({ items: [] });
		if (url.pathname.endsWith('/search')) return serviceWorkflowJson({ results: [] });
		if (url.pathname.endsWith('/files') && init?.method === 'PUT') {
			const path = String(url.searchParams.get('path') ?? '');
			input.workspaceFiles.set(path, String(body.content ?? ''));
			return serviceWorkflowJson({ path, content: input.workspaceFiles.get(path) });
		}
		if (url.pathname.endsWith('/files') && (!init?.method || init.method === 'GET')) {
			const path = String(url.searchParams.get('path') ?? '');
			return input.workspaceFiles.has(path)
				? serviceWorkflowJson({ path, content: input.workspaceFiles.get(path) })
				: serviceWorkflowJson({ error: { code: 'not_found' } }, 404);
		}
		if (url.pathname.endsWith('/commit')) return serviceWorkflowJson({ commitSha: 'content-commit-a', branchRef: 'refs/heads/content-workspace' });
		if (url.pathname.endsWith('/close') && init?.method === 'POST') return serviceWorkflowJson({ status: 'closed' });
		return serviceWorkflowJson({ error: { code: 'unhandled', path: url.pathname } }, 404);
	};
}
