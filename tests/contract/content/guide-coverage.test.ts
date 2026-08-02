import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadBookCatalog, loadKnowledgeCatalog, validateKnowledgeCatalog } from '../../../packages/sdk/src/knowledge/index.ts';

const root = process.cwd();
const guaranteeFiles = (directory: string): string[] => {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		return entry.isDirectory() ? guaranteeFiles(path) : entry.isFile() && entry.name.endsWith('.guarantee.yaml') ? [path] : [];
	});
};
const guaranteeId = (path: string) => readFileSync(path, 'utf8').match(/^id:\s*(.+)$/mu)?.[1]?.replace(/^['"]|['"]$/gu, '').trim();

describe('TreeSeed Guide', () => {
	it('maps every canonical guarantee exactly once into one connected knowledge tree', () => {
		const books = loadBookCatalog(join(root, 'src/content/books'));
		const pages = loadKnowledgeCatalog(join(root, 'src/content/knowledge'));
		validateKnowledgeCatalog(books, pages);

		const guide = books.find((book) => book.id === 'treeseed-guide');
		const guidePages = pages.filter((page) => page.bookId === guide?.id);
		const roots = guidePages.filter((page) => !page.parentId);
		const guaranteeRoots = ['guarantees', ...readdirSync(join(root, 'packages'), { withFileTypes: true })
			.filter((entry) => entry.isDirectory()).map((entry) => `packages/${entry.name}/guarantees`)];
		const guarantees = guaranteeRoots.flatMap((directory) => guaranteeFiles(join(root, directory))).map(guaranteeId).filter(Boolean);
		const documented = guidePages.flatMap((page) => page.guaranteeIds);

		expect(guide).toMatchObject({ status: 'draft', visibility: 'public' });
		expect(roots.map((page) => page.id)).toEqual(['guide.overview']);
		expect(new Set(documented).size).toBe(documented.length);
		expect(documented.sort()).toEqual(guarantees.sort());
		expect(guidePages).toHaveLength(guarantees.length + 35);
		expect(childrenOf(guidePages, 'guide.overview').map((page) => page.id)).toEqual([
			'guide.foundation', 'guide.deployment', 'guide.security', 'guide.content',
			'guide.work', 'guide.governance', 'guide.market',
		]);
		expect(childrenOf(guidePages, 'guide.foundation').map((page) => page.id)).toEqual([
			'guide.foundation.purpose', 'guide.foundation.architecture', 'guide.foundation.frameworks',
			'guide.foundation.treedx', 'guide.foundation.platform',
		]);
	});

	it('includes complete practical authentication, account, and team sections', () => {
		const pages = loadKnowledgeCatalog(join(root, 'src/content/knowledge')).filter((page) => page.bookId === 'treeseed-guide');
		const children = (parentId: string) => pages.filter((page) => page.parentId === parentId);
		const body = (id: string) => pages.find((page) => page.id === id)?.bodyMarkdown ?? '';

		expect(children('guide.security.authentication')).toHaveLength(13);
		expect(children('guide.security.accounts')).toHaveLength(10);
		expect(children('guide.security.teams')).toHaveLength(17);
		expect(body('guide.security.authentication')).toContain('Basic authentication journey');
		expect(body('guide.security.accounts')).toContain('Basic account journey');
		expect(body('guide.security.teams')).toContain('Basic team journey');
		expect(body('guide.security.teams')).toContain('Protect the last owner');
	});
});

function childrenOf(pages: ReturnType<typeof loadKnowledgeCatalog>, parentId: string) {
	return pages.filter((page) => page.parentId === parentId).sort((left, right) => left.order - right.order);
}
