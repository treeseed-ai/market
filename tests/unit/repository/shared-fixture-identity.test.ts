import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdirSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const aliases = ['agent','api','cli','core','sdk'].map((name) => resolve(process.cwd(),'packages',name,'.fixtures','treeseed-fixtures'));

function digest(root: string) {
	const hash = createHash('sha256');
	const files = spawnSync('git',['ls-files','-z'],{ cwd: root, encoding: 'utf8' }).stdout.split('\0').filter(Boolean).sort();
	for (const path of files) hash.update(path).update('\0').update(readFileSync(resolve(root,path)));
	return hash.digest('hex');
}

describe('shared fixture aliases', () => {
	it('remain byte-identical and retain the canonical Market fixture identity', () => {
		expect(new Set(aliases.map(digest)).size).toBe(1);
		for (const root of aliases) {
			const agents = resolve(root,'sites','working-site','src','content','agents');
			for (const name of readdirSync(agents).filter((entry) => entry.endsWith('.mdx'))) {
				expect(readFileSync(resolve(agents,name),'utf8')).not.toMatch(/for the (?:agent|api|cli|core|sdk) TreeSeed project\./u);
			}
		}
	});
});
