import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Args = {
	ref: string;
	workspaceRoot: string;
};

function parseArgs(argv: string[]): Args {
	const args: Args = { ref: '', workspaceRoot: process.cwd() };
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--ref') args.ref = argv[++index] ?? '';
		else if (arg === '--workspace-root') args.workspaceRoot = argv[++index] ?? process.cwd();
	}
	if (!args.ref) throw new Error('Missing required --ref.');
	return args;
}

function walkYamlFiles(root: string, segments: string[] = []): string[] {
	const current = join(root, ...segments);
	if (!existsSync(current)) return [];
	const output: string[] = [];
	for (const entry of readdirSync(current)) {
		if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
		const absolute = join(current, entry);
		const stat = statSync(absolute);
		if (stat.isDirectory()) output.push(...walkYamlFiles(root, [...segments, entry]));
		else if (entry.endsWith('.guarantee.yaml')) output.push(absolute);
	}
	return output;
}

function firstMatch(text: string, pattern: RegExp) {
	return pattern.exec(text)?.[1]?.trim() ?? '';
}

function sceneManifestPath(workspaceRoot: string, guaranteePath: string, manifestText: string) {
	const sceneManifest = firstMatch(manifestText, /^\s*manifest:\s*(.+)$/mu).replace(/^['"]|['"]$/gu, '');
	if (!sceneManifest) return null;
	return resolve(join(guaranteePath, '..'), sceneManifest);
}

function workflowActions(sceneText: string) {
	return Array.from(sceneText.matchAll(/^\s{4}([a-zA-Z][a-zA-Z0-9]*):(?:\s|$)/gmu)).map((match) => match[1]);
}

function workflowStepCount(sceneText: string) {
	return Array.from(sceneText.matchAll(/^\s{2}-\s+id:\s+/gmu)).length;
}

function assert(condition: unknown, message: string) {
	if (!condition) throw new Error(message);
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const workspaceRoot = resolve(args.workspaceRoot);
	const candidates = [
		...walkYamlFiles(join(workspaceRoot, 'guarantees')),
		...walkYamlFiles(join(workspaceRoot, 'packages')),
	];
	const guaranteePath = candidates.find((candidate) => readFileSync(candidate, 'utf8').includes(args.ref));
	assert(guaranteePath, `No guarantee manifest references ${args.ref}.`);
	const manifestText = readFileSync(guaranteePath!, 'utf8');
	const id = firstMatch(manifestText, /^id:\s*(.+)$/mu);
	const ownerPackage = firstMatch(manifestText, /^ownerPackage:\s*"?([^"\n]+)"?$/mu);
	const route = firstMatch(manifestText, /^\s*entryRoute:\s*(.+)$/mu);
	assert(/^status:\s*active$/mu.test(manifestText), `${id} is not active.`);
	assert(!manifestText.includes('todo.'), `${id} still contains todo verifier refs.`);
	assert(route && !route.includes(':'), `${id} uses a placeholder or unresolved route: ${route || '<missing>'}.`);

	const scenePath = sceneManifestPath(workspaceRoot, guaranteePath!, manifestText);
	if (scenePath) {
		assert(existsSync(scenePath), `${id} scene manifest is missing: ${scenePath}`);
		const sceneText = readFileSync(scenePath, 'utf8');
		assert(/^\s*kind:\s*service$/mu.test(sceneText), `${id} scene is missing journey.kind: service.`);
		assert(workflowStepCount(sceneText) >= 2, `${id} scene has fewer than two workflow steps.`);
		const actions = workflowActions(sceneText);
		assert(actions.some((action) => action !== 'goto' && action !== 'pause'), `${id} scene has no interactive action.`);
		assert(/^\s*expect:\s*$/mu.test(sceneText), `${id} scene has no step expectations.`);
		assert(!sceneText.includes('/screenshots/viewport/'), `${id} scene references viewport screenshot evidence.`);
	}

	process.stdout.write(`${JSON.stringify({
		ok: true,
		ref: args.ref,
		guaranteeId: id,
		ownerPackage,
		route,
		scenePath,
		checkedAt: new Date().toISOString(),
	}, null, 2)}\n`);
}

main();
