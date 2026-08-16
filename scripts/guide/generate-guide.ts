import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

type Coverage = { category: string; subcategory: string; owner: string; surface: string; entries: string[] };
type Guarantee = { id: string; journey: string; summary: string; status: string; source: string; category: string; subcategory: string };
type Page = { id: string; slug: string; title: string; summary: string; order: number; parentId?: string; guaranteeId?: string; category: string; subcategory?: string };

const root = process.cwd();
const missingPagesOnly = process.argv.includes('--missing-pages');
const coverage = JSON.parse(readFileSync(join(root, 'scripts/guide/expected-guarantees.json'), 'utf8')) as Coverage[];
const categories = [
	['deployment', 'Deployment'], ['security', 'Security'], ['content', 'Content'], ['work', 'Work'], ['market', 'Market'], ['governance', 'Governance'],
] as const;
const subsectionTitles = new Map(coverage.map((item) => [item.subcategory, titleCase(item.subcategory)]));
const ownerRoots: Record<string, string> = {
	'@treeseed/sdk': 'packages/sdk', '@treeseed/admin': 'packages/admin', '@treeseed/api': 'packages/api',
	'@treeseed/agent': 'packages/agent', '@treeseed/market': '.',
};

function titleCase(value: string) {
	return value.split('-').map((word) => word === 'api' ? 'API' : word[0].toUpperCase() + word.slice(1)).join(' ')
		.replace('Monitoring Auditing', 'Monitoring / Auditing').replace('Projects Templates', 'Projects / Templates')
		.replace('Export Integration', 'Export / Integration');
}
function slugify(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
}
function yamlValue(source: string, key: string) {
	const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, 'mu'));
	return match?.[1]?.trim().replace(/^['"]|['"]$/gu, '') ?? '';
}
function filesUnder(directory: string): string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		return entry.isDirectory() ? filesUnder(path) : entry.isFile() && entry.name.endsWith('.guarantee.yaml') ? [path] : [];
	});
}
function markdownFilesUnder(directory: string): string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		return entry.isDirectory() ? markdownFilesUnder(path) : entry.isFile() && /\.mdx?$/u.test(entry.name) ? [path] : [];
	});
}
function classify(id: string, type: string, subtype: string, source: string): [string, string] {
	if (type === 'deployment' && subtype === 'local-platform') return ['deployment', 'development'];
	if (categories.some(([category]) => category === type) && coverage.some((item) => item.category === type && item.subcategory === subtype)) return [type, subtype];
	const value = `${id} ${type} ${subtype} ${source}`.toLowerCase();
	if (/user\.auth|auth-and-sessions|authentication/u.test(value)) return ['security', 'authentication'];
	if (/user\.account|account/u.test(value)) return ['security', 'accounts'];
	if (/guarantee\.team|teams-and-members|team\/membership|team\/team/u.test(value)) return ['security', 'teams'];
	if (/service|vault|credential/u.test(value)) return ['security', 'service-vault'];
	if (/audit|trace|monitor|feedback|health/u.test(value)) return ['security', 'monitoring-auditing'];
	if (/workday/u.test(value)) return ['work', 'workdays'];
	if (/capacity/u.test(value)) return ['work', 'capacity-providers'];
	if (/agent/u.test(value)) return ['work', 'agents'];
	if (/ui\.workspace|guarantees\/ui\/workspace/u.test(value)) return ['content', 'management'];
	if (/host|reconciliation|platform-operations/u.test(value)) return ['deployment', 'remote-platform'];
	if (/project\.treedx|dx-repository|projects-and-workstreams/u.test(value)) return ['deployment', 'remote-projects'];
	if (/private/u.test(value)) return ['deployment', 'private-platform'];
	if (/catalog|template|seed/u.test(value)) return ['content', 'projects-templates'];
	if (/library|pack|download|export|integration|federation|proxy/u.test(value)) return ['content', 'export-integration'];
	if (/book|knowledge|content/u.test(value)) return ['content', 'management'];
	if (/commerce|marketplace|ecommerce/u.test(value)) return ['market', 'ecommerce'];
	if (/seller/u.test(value)) return ['market', 'seller-accounts'];
	if (/referral/u.test(value)) return ['market', 'referrals'];
	if (/proposal|discussion/u.test(value)) return ['governance', 'proposal-discussion'];
	if (/decision/u.test(value)) return ['governance', 'cooperative-decisions'];
	if (/governance/u.test(value)) return ['governance', 'decision-tracking'];
	if (/local/u.test(value)) return ['deployment', 'development'];
	return ['content', 'management'];
}

function guaranteeManifest(input: Coverage, journey: string, index: number) {
	const slug = slugify(journey);
	return `schemaVersion: treeseed.guarantee/v1\nid: guarantee.${input.category}.${input.subcategory}.${slug}.${String(index).padStart(3, '0')}\njourneyIndex: ${index}\ntype: ${input.category}\nsubtype: ${input.subcategory}\njourney: ${JSON.stringify(journey)}\nownerPackage: ${JSON.stringify(input.owner)}\nsurface: ${input.surface}\nsummary: ${JSON.stringify(`Guarantee that TreeSeed can ${journey.toLowerCase()}.`)}\nstatus: planned\ndependencies: { journeys: [], guarantees: [] }\nactors: { allowed: [authenticated_user, team_owner, platform_admin], forbidden: [unauthorized_user] }\ndevices: { required: [desktop_chromium] }\ngates: [future]\npreconditions: { fixtures: [integrated_treeseed_project], notes: [] }\napi: { required: false, verifierRefs: [] }\ncontent: { required: false, verifierRefs: [] }\naudit: { required: false, verifierRefs: [] }\nnegativeCases: []\nevidence: { required: [guarantee_report] }\nnotes: ["Planned from the TreeSeed Guide platform coverage audit."]\n`;
}

let journeyIndex = 570;
for (const item of coverage) for (const journey of item.entries) {
	if (!missingPagesOnly) {
		const slug = slugify(journey);
		const ownerRoot = ownerRoots[item.owner];
		const path = join(root, ownerRoot, 'guarantees', item.category, item.subcategory, `${slug}.guarantee.yaml`);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, guaranteeManifest(item, journey, journeyIndex), 'utf8');
	}
	journeyIndex += 1;
}
if (journeyIndex !== 730) throw new Error(`Expected guarantee indexes 570-729, got ${journeyIndex}.`);

const criticalPath = join(root, 'packages/api/guarantees/project/treedx/preserve-markdown-frontmatter.guarantee.yaml');
if (!missingPagesOnly) {
	mkdirSync(dirname(criticalPath), { recursive: true });
	writeFileSync(criticalPath, `schemaVersion: treeseed.guarantee/v1\nid: guarantee.project.treedx.preserve-markdown-frontmatter.730\njourneyIndex: 730\ntype: project\nsubtype: treedx\njourney: Preserve Markdown Frontmatter Through TreeDX\nownerPackage: "@treeseed/api"\nsurface: api-control-plane\nsummary: Preserve complete structured Markdown and MDX frontmatter consistently through TreeDX repository and graph operations.\nstatus: planned\ndependencies: { journeys: [], guarantees: [] }\nactors: { allowed: [authenticated_user, project_manager, platform_admin], forbidden: [unauthorized_user] }\ndevices: { required: [desktop_chromium] }\ngates: [core, security, release]\npreconditions: { fixtures: [integrated_treeseed_project], notes: [] }\napi: { required: false, verifierRefs: [] }\ncontent: { required: false, verifierRefs: [] }\naudit: { required: false, verifierRefs: [] }\nnegativeCases: []\nevidence: { required: [guarantee_report, treedx_content_ref] }\nnotes: ["TreeDX package tests are authoritative until an integrated API verifier is registered."]\n`, 'utf8');
}

const guaranteeRoots = ['guarantees', ...readdirSync(join(root, 'packages'), { withFileTypes: true })
	.filter((entry) => entry.isDirectory()).map((entry) => `packages/${entry.name}/guarantees`)];
const guarantees: Guarantee[] = guaranteeRoots.flatMap((directory) => filesUnder(join(root, directory))).map((source) => {
	const raw = readFileSync(source, 'utf8');
	const id = yamlValue(raw, 'id');
	const type = yamlValue(raw, 'type');
	const subtype = yamlValue(raw, 'subtype');
	const [category, subcategory] = classify(id, type, subtype, relative(root, source));
	return { id, journey: yamlValue(raw, 'journey') || slugify(id), summary: yamlValue(raw, 'summary'),
		status: yamlValue(raw, 'status'), source: relative(root, source), category, subcategory };
}).filter((entry) => entry.id).sort((left, right) => left.id.localeCompare(right.id));

const duplicateIds = guarantees.filter((entry, index) => guarantees.findIndex((candidate) => candidate.id === entry.id) !== index);
if (duplicateIds.length) throw new Error(`Duplicate guarantee IDs: ${duplicateIds.map((entry) => entry.id).join(', ')}`);

const pages: Page[] = [{ id: 'guide.overview', slug: 'overview', title: 'TreeSeed Guide',
	summary: 'A complete guide to the guarantees and expected capabilities of the TreeSeed platform.', order: 0, category: 'overview' }];
categories.forEach(([category, title], categoryIndex) => {
	pages.push({ id: `guide.${category}`, slug: category, title, summary: `${title} guarantees and platform guidance.`,
		order: (categoryIndex + 1) * 100, parentId: 'guide.overview', category });
	coverage.filter((item) => item.category === category).forEach((item, subsectionIndex) => pages.push({
		id: `guide.${category}.${item.subcategory}`, slug: `${category}/${item.subcategory}`,
		title: subsectionTitles.get(item.subcategory)!, summary: `${subsectionTitles.get(item.subcategory)} usage and guarantees.`,
		order: (subsectionIndex + 1) * 100, parentId: `guide.${category}`, category, subcategory: item.subcategory,
	}));
});
for (const guarantee of guarantees) {
	const siblings = guarantees.filter((entry) => entry.category === guarantee.category && entry.subcategory === guarantee.subcategory);
	const order = siblings.findIndex((entry) => entry.id === guarantee.id) + 1;
	pages.push({ id: `guide.guarantee.${slugify(guarantee.id)}`, slug: `${guarantee.category}/${guarantee.subcategory}/${slugify(guarantee.id)}`,
		title: guarantee.journey, summary: guarantee.summary || `Guide to ${guarantee.journey}.`, order,
		parentId: `guide.${guarantee.category}.${guarantee.subcategory}`, guaranteeId: guarantee.id,
		category: guarantee.category, subcategory: guarantee.subcategory });
}

const bookPath = join(root, 'src/content/books/treeseed-guide.md');
if (!missingPagesOnly) writeFileSync(bookPath, `---\nschemaVersion: treeseed.book/v2\nid: treeseed-guide\nslug: treeseed-guide\ntitle: TreeSeed Guide\nsummary: A complete guide to TreeSeed platform guarantees, workflows, and expected capabilities.\ndescription: A hierarchical guide for using, operating, securing, extending, and governing the TreeSeed platform.\nstatus: draft\nvisibility: public\norder: 10\ntopics: [deployment, security, content, work, market, governance]\naudience: [users, team owners, project managers, operators, contributors]\nrelatedBookIds: [treeseed-platform-architecture-development]\npackPolicy: allowed\n---\n\n# TreeSeed Guide\n\nFollow the connected knowledge tree to understand the platform from deployment through governance.\n`, 'utf8');

const pageById = new Map(pages.map((page) => [page.id, page]));
const canonical = (page: Page) => `/t/treeseed/books/treeseed-guide/${page.slug}`;
function securityOutline(page: Page) {
	if (page.id === 'guide.security') return '\n## Identity-to-collaboration journey\n\nStart with authentication, configure the account, then create or join a team before managing team-scoped projects, services, work, and governance.\n';
	if (page.id === 'guide.security.authentication') return '\n## Basic authentication journey\n\n1. Register and verify an email address.\n2. Sign in and sign out safely.\n3. Recover a forgotten password.\n4. Manage sessions and reauthenticate for sensitive actions.\n5. Configure, challenge, and recover multi-factor authentication.\n6. Link supported identity providers and preserve safe return paths.\n7. Continue into account and team setup.\n';
	if (page.id === 'guide.security.accounts') return '\n## Basic account journey\n\n1. View and edit the profile and email addresses.\n2. Configure time zone, appearance, accessibility, and notifications.\n3. Inspect and revoke sessions.\n4. Export account data.\n5. Transfer responsibilities before deleting an account.\n6. Use one account across multiple teams.\n';
	if (page.id === 'guide.security.teams') return '\n## Basic team journey\n\n1. Create a team or accept an invitation.\n2. Switch the active team and review its overview.\n3. Configure profile, visibility, and settings.\n4. Invite members and manage outstanding invitations.\n5. Understand roles, change roles, and remove members.\n6. Protect the last owner and review membership history.\n7. Archive, restore, or delete the team safely.\n8. Use team-scoped projects, services, vaults, capacity, work, and governance.\n';
	return '';
}
const guideRoot = join(root, 'src/content/knowledge/treeseed-guide');
const existingGuidePageIds = new Set(missingPagesOnly
	? markdownFilesUnder(guideRoot).map((path) => yamlValue(readFileSync(path, 'utf8'), 'id')).filter(Boolean)
	: []);
if (!missingPagesOnly) rmSync(guideRoot, { recursive: true, force: true });
for (const page of pages) {
	if (missingPagesOnly && !page.guaranteeId) continue;
	const parent = page.parentId ? pageById.get(page.parentId) : undefined;
	const children = pages.filter((candidate) => candidate.parentId === page.id)
		.sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
	const related = [...(parent ? [parent.id] : []), ...children.slice(0, 8).map((child) => child.id)];
	const frontmatter = `---\nschemaVersion: treeseed.knowledge-page/v1\nid: ${page.id}\nbookId: treeseed-guide\nslug: ${page.slug}\ntitle: ${JSON.stringify(page.title)}\nsummary: ${JSON.stringify(page.summary)}\nstatus: draft\nvisibility: public\norder: ${page.order}\n${page.parentId ? `parentId: ${page.parentId}\n` : ''}tags: ${JSON.stringify([page.category, page.subcategory, page.guaranteeId ? 'guarantee' : 'guide'].filter(Boolean))}\ncontributors: []\nrelatedBookIds: [treeseed-platform-architecture-development]\nrelatedKnowledgeIds: ${JSON.stringify(related)}\nrelatedNoteIds: []\nrelatedQuestionIds: []\nrelatedObjectiveIds: []\nrelatedProposalIds: []\nrelatedDecisionIds: []\nguaranteeIds: ${JSON.stringify(page.guaranteeId ? [page.guaranteeId] : [])}\ncapabilityIds: []\nroutePatterns: []\nresourceTypes: [treeseed-guide]\nactionIds: []\nkeywords: ${JSON.stringify([page.title, page.category, page.subcategory].filter(Boolean))}\ndocumentationUrls: []\n---\n`;
	const navigation = `${parent ? `\n[Back to ${parent.title}](${canonical(parent)})\n` : ''}${children.length ? `\n## In this section\n\n${children.map((child) => `- [${child.title}](${canonical(child)})`).join('\n')}\n` : ''}`;
	const guaranteeBody = page.guaranteeId ? `\n## What this guarantee promises\n\nThis page documents \`${page.guaranteeId}\`.\n\n## When to use it\n\n## Before you begin\n\n## Procedure\n\n## Expected result\n\n## Safety and recovery\n\n## Verification status\n\n## Related guarantees\n` : '';
	const path = join(guideRoot, `${page.slug}.md`);
	if (missingPagesOnly && existingGuidePageIds.has(page.id)) continue;
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${frontmatter}\n# ${page.title}\n${securityOutline(page)}${guaranteeBody}${navigation}`, 'utf8');
	existingGuidePageIds.add(page.id);
}

console.log(JSON.stringify({ guarantees: guarantees.length, pages: pages.length, plannedGuarantees: 160, lastJourneyIndex: 730 }, null, 2));
