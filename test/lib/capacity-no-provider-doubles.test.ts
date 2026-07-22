import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceRoot = process.cwd();

function walkFiles(root: string): string[] {
	if (!existsSync(root)) return [];
	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const path = resolve(root, entry.name);
		if (entry.isDirectory()) {
			if (['node_modules', 'dist', '.git', '.treeseed'].includes(entry.name)) return [];
			return walkFiles(path);
		}
		return [path];
	});
}

describe('capacity and agent provider integrity', () => {
	it('contains no provider-shaped mock, fake, stub, or synthetic implementation', () => {
		const roots = [
			'packages/agent/src',
			'packages/agent/test',
			'packages/agent/.fixtures',
			'packages/agent/guarantees',
			'packages/api/src/api/capacity',
			'packages/api/guarantees/capacity',
			'packages/sdk/src/agent-capacity',
			'packages/sdk/src/capacity-provider',
			'packages/sdk/src/reconcile',
			'packages/sdk/guarantees/capacity',
			'packages/cli/src/cli/handlers/capacity',
			'starters/engineering',
			'starters/research',
			'.fixtures/treeseed-fixtures',
		].map((path) => resolve(workspaceRoot, path));
		const thisFile = resolve(workspaceRoot, 'test/lib/capacity-no-provider-doubles.test.ts');
		const providerDoubleFile = /(?:mock|fake|stub|synthetic).*(?:provider|execution)|(?:provider|execution).*(?:mock|fake|stub|synthetic)/iu;
		const providerDoubleDeclaration = /\b(?:class|function|const|let|var)\s+(?:Mock|Fake|Stub|Synthetic)\w*(?:Provider|Execution)\w*/u;
		const forbiddenRuntimeSwitch = /TREESEED_[A-Z0-9_]*(?:MOCK|FAKE|STUB|SYNTHETIC)[A-Z0-9_]*/u;
		const failures: string[] = [];

		for (const file of roots.flatMap(walkFiles)) {
			if (file === thisFile || file.endsWith('/test/package/package-shape.test.ts')) continue;
			if (providerDoubleFile.test(basename(file))) failures.push(`provider-double filename: ${file}`);
			if (!['.ts', '.tsx', '.js', '.mjs', '.cjs', '.yaml', '.yml', '.json', '.md', '.mdx'].includes(extname(file))) continue;
			const source = readFileSync(file, 'utf8');
			if (providerDoubleDeclaration.test(source)) failures.push(`provider-double declaration: ${file}`);
			if (forbiddenRuntimeSwitch.test(source)) failures.push(`provider-double runtime switch: ${file}`);
		}

		expect(failures).toEqual([]);
	});
});
