export const CONTENT_FIELD_HELP = {
	projectId: {
		label: 'Project',
		purpose: 'Chooses which project owns this content and which permissions apply when it is saved.',
		example: 'TreeSeed Market',
	},
	title: {
		label: 'Title',
		purpose: 'The short name people see in lists, tabs, links, and related-content references.',
		example: 'Clarify documentation approval flow',
	},
	slug: {
		label: 'Slug',
		purpose: 'The stable file and URL identifier. Leave it blank when creating content to generate one from the title.',
		example: 'clarify-documentation-approval-flow',
	},
	status: {
		label: 'Status',
		purpose: 'Shows whether the record is planned, live, exploratory, or otherwise still evolving.',
		example: 'planned',
	},
	timeHorizon: {
		label: 'Horizon',
		purpose: 'For objectives, this indicates whether the goal is near-term, mid-term, or long-term.',
		example: 'long-term',
	},
	questionType: {
		label: 'Question type',
		purpose: 'Classifies the kind of uncertainty the question is meant to resolve.',
		example: 'implementation',
	},
	proposalType: {
		label: 'Proposal type',
		purpose: 'Classifies the proposal so reviewers know whether they are evaluating strategy, policy, research, or implementation.',
		example: 'implementation',
	},
	decisionType: {
		label: 'Decision type',
		purpose: 'Records the outcome category for a decision: approved, rejected, deferred, request changes, or superseded.',
		example: 'request_changes',
	},
	authority: {
		label: 'Authority',
		purpose: 'Names who or what had authority to make this decision.',
		example: 'TreeSeed Market Team',
	},
	description: {
		label: 'Description',
		purpose: 'The plain-language statement of what this content is about. This is the most important summary users see.',
		example: 'Explain how approval gates control documentation mutations.',
	},
	summary: {
		label: 'Summary',
		purpose: 'A shorter operational summary used in lists, previews, and agent context packs.',
		example: 'Approval gates should block unsafe docs mutations until reviewed.',
	},
	primaryContributor: {
		label: 'Contributor',
		purpose: 'Names the person, agent, or steward primarily responsible for this content record.',
		example: 'market-steward',
	},
	author: {
		label: 'Author',
		purpose: 'For notes, this names who captured the context or evidence.',
		example: 'market-steward',
	},
	motivation: {
		label: 'Motivation',
		purpose: 'Explains why this content matters and what prompted it.',
		example: 'The current workflow makes approval ownership hard to see.',
	},
	rationale: {
		label: 'Rationale',
		purpose: 'For decisions, this explains why the outcome was chosen and what evidence mattered.',
		example: 'The proposal reduces ambiguity while preserving human review.',
	},
	body: {
		label: 'Body',
		purpose: 'The main Markdown content. Use this for details, evidence, tradeoffs, and next steps.',
		example: 'Add sections for context, evidence, options, and follow-up work.',
	},
	relatedObjectives: {
		label: 'Related objectives',
		purpose: 'Links this record to durable goals it supports or clarifies.',
		example: 'core',
	},
	relatedQuestions: {
		label: 'Related questions',
		purpose: 'Links this record to open questions it raises, answers, or depends on.',
		example: 'how-should-docs-workday-start-from-objectives',
	},
	relatedNotes: {
		label: 'Related notes',
		purpose: 'Links this record to supporting context, observations, or evidence.',
		example: 'local-workday-observation',
	},
	relatedProposals: {
		label: 'Related proposals',
		purpose: 'Links this record to proposals it evaluates, depends on, or implements.',
		example: 'approve-documentation-automation-bootstrap',
	},
	decision: {
		label: 'Decision',
		purpose: 'For proposals, this links to the decision that approved, rejected, deferred, or requested changes to the proposal.',
		example: 'approve-documentation-automation-bootstrap',
	},
	date: {
		label: 'Date',
		purpose: 'Generated or recorded date used for sorting and chronology.',
		example: '2026-05-18',
		editable: false,
	},
	contentId: {
		label: 'Content id',
		purpose: 'Stable model identifier stored in frontmatter and used by agents and graph tooling.',
		example: 'objective:core',
		editable: false,
	},
	sourceSlug: {
		label: 'Source slug',
		purpose: 'The source filename without extension. It anchors the local content URL.',
		example: 'core',
		editable: false,
	},
};

export function contentFieldHelp(fieldName) {
	return CONTENT_FIELD_HELP[fieldName] ?? null;
}

export function contentFieldHelpText(fieldName) {
	const help = contentFieldHelp(fieldName);
	return help ? `${help.purpose}${help.example ? ` Example: ${help.example}.` : ''}` : undefined;
}
