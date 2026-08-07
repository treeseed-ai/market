import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parse } from 'yaml';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const ignored = new Set(['.git', '.treeseed', 'dist', 'node_modules']);

function contentRoots(root: string): string[] {
	const roots: string[] = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		if (!entry.isDirectory() || ignored.has(entry.name)) continue;
		const path = resolve(root, entry.name);
		if (path.endsWith('/src/content')) roots.push(path);
		else roots.push(...contentRoots(path));
	}
	return roots;
}

function markdownFiles(root: string): string[] {
	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const path = resolve(root, entry.name);
		if (entry.isDirectory()) return entry.name === 'groups' || entry.name === 'group-edges' ? [] : markdownFiles(path);
		return entry.isFile() && /\.mdx?$/u.test(entry.name) ? [path] : [];
	});
}

function groupId(value: string) {
	return value.normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').trim().toLowerCase()
		.replace(/[^a-z0-9._-]+/gu, '-').replace(/^[._-]+|[._-]+$/gu, '');
}

function groupName(id: string) {
	return id.split(/[._-]/u).filter(Boolean).map((part) => part === 'ai' ? 'AI' : part === 'api' ? 'API' : part === 'ci' ? 'CI' : part === 'cd' ? 'CD' : part[0]!.toUpperCase() + part.slice(1)).join(' ');
}

function replacement(indent: string, ids: string[]) {
	if (ids.length === 0) return `${indent}groupIds: []`;
	return `${indent}groupIds:\n${ids.map((id) => `${indent}  - ${id}`).join('\n')}`;
}

function migrateFile(path: string): string[] {
	const raw = readFileSync(path, 'utf8');
	const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
	if (!frontmatter) return [];
	const data = parse(frontmatter[1]!) as Record<string, unknown>;
	const source = Array.isArray(data.tags) ? data.tags : Array.isArray(data.topics) ? data.topics : null;
	if (!source) return Array.isArray(data.groupIds) ? data.groupIds.map(String) : [];
	const ids = [...new Set(source.map((value) => groupId(String(value))).filter(Boolean))].sort();
	const lines = frontmatter[1]!.split(/\r?\n/u);
	const start = lines.findIndex((line) => /^(\s*)(tags|topics):(?:\s|$)/u.test(line));
	if (start < 0) throw new Error(`Could not locate group source field in ${path}.`);
	const indent = lines[start]!.match(/^(\s*)/u)![1]!;
	let end = start + 1;
	while (end < lines.length && (lines[end]!.trim() === '' || lines[end]!.startsWith(`${indent}  `))) end += 1;
	lines.splice(start, end - start, replacement(indent, ids));
	const nextFrontmatter = lines.join('\n');
	writeFileSync(path, raw.replace(frontmatter[1]!, nextFrontmatter));
	return ids;
}

function writeGroups(root: string, ids: string[]) {
	if (ids.length === 0) return;
	const directory = resolve(root, 'groups');
	mkdirSync(directory, { recursive: true });
	for (const id of ids) {
		const path = resolve(directory, `${id}.md`);
		if (existsSync(path)) continue;
		const name = groupName(id);
		writeFileSync(path, `---\ncontract: treeseed.group/v1\nid: ${id}\nslug: ${id}\nname: ${name}\ndescription: Groups content and participants concerned with ${name}.\nclassification: ontology/topic/${id}\naliases: []\nstatus: active\n---\n\n# ${name}\n`);
	}
}

const report: Array<{ root: string; files: number; groups: number }> = [];
for (const root of [...new Set(contentRoots(workspaceRoot))].sort()) {
	if (!statSync(root).isDirectory()) continue;
	const files = markdownFiles(root);
	const ids = [...new Set(files.flatMap(migrateFile))].sort();
	writeGroups(root, ids);
	report.push({ root: relative(workspaceRoot, root), files: files.length, groups: ids.length });
}
process.stdout.write(`${JSON.stringify({ contract: 'treeseed.group-migration/v1', repositories: report }, null, 2)}\n`);
