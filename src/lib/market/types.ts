export type MarketProductStatus = 'draft' | 'live' | 'archived';

export interface MarketPublisher {
	id: string;
	name: string;
	url?: string;
}

export interface MarketArtifactSource {
	kind: 'git';
	repoUrl: string;
	directory: string;
	ref: string;
	integrity?: string;
}

export interface MarketOffer {
	priceModel: 'free' | 'paid' | 'contact';
	license?: string;
	support?: string;
}

export interface TemplateProductRecord {
	slug: string;
	title: string;
	description: string;
	summary: string;
	status: MarketProductStatus;
	featured?: boolean;
	category: string;
	audience?: string[];
	tags?: string[];
	publisher: MarketPublisher;
	publisherVerified?: boolean;
	templateVersion: string;
	templateApiVersion: number;
	minCliVersion: string;
	minCoreVersion: string;
	fulfillment: {
		source: MarketArtifactSource;
		hooksPolicy: 'builtin_only' | 'trusted_only' | 'disabled';
		supportsReconcile: boolean;
	};
	offer: MarketOffer;
	relatedBooks?: string[];
	relatedKnowledge?: string[];
	relatedObjectives?: string[];
}
