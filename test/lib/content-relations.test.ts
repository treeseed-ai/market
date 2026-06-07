import { describe, expect, it } from 'vitest';
import { contentRelationPolicy, allowedRelatedCollections, canCreateRelatedContent } from '../../src/lib/market/content-relations.js';

describe('content relation policy', () => {
	it('matches the v1 allowed relation matrix', () => {
		expect(allowedRelatedCollections('objectives')).toEqual(['questions']);
		expect(allowedRelatedCollections('questions')).toEqual(['objectives']);
		expect(allowedRelatedCollections('notes')).toEqual(['objectives', 'questions', 'proposals']);
		expect(allowedRelatedCollections('proposals')).toEqual(['objectives', 'questions', 'notes', 'decisions']);
		expect(allowedRelatedCollections('decisions')).toEqual(['objectives', 'questions', 'notes', 'proposals']);
	});

	it('rejects unsupported pairs and respects the v1 write gate flag', () => {
		expect(contentRelationPolicy('objectives', 'proposals')).toBeNull();
		expect(canCreateRelatedContent('objectives', 'questions', false)).toBe(false);
		expect(canCreateRelatedContent('objectives', 'questions', true)).toBe(true);
	});
});
