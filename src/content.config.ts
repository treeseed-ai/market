import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createTreeseedTenantCollections } from '@treeseed/core/content-config';

const srcRoot = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(srcRoot, 'content');

const publisherSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.string().optional(),
});

const templateProductSchema = z.object({
	slug: z.string(),
	title: z.string(),
	description: z.string(),
	summary: z.string(),
	status: z.enum(['draft', 'live', 'archived']),
	featured: z.boolean().default(false),
	category: z.string(),
	audience: z.array(z.string()).default([]),
	tags: z.array(z.string()).default([]),
	publisher: publisherSchema,
	publisherVerified: z.boolean().default(false),
	templateVersion: z.string(),
	templateApiVersion: z.number().int().positive(),
	minCliVersion: z.string(),
	minCoreVersion: z.string(),
	fulfillment: z.object({
		source: z.object({
			kind: z.literal('git'),
			repoUrl: z.string(),
			directory: z.string(),
			ref: z.string(),
			integrity: z.string().optional(),
		}),
		hooksPolicy: z.enum(['builtin_only', 'trusted_only', 'disabled']).default('builtin_only'),
		supportsReconcile: z.boolean().default(true),
	}),
	offer: z.object({
		priceModel: z.enum(['free', 'paid', 'contact']).default('free'),
		license: z.string().optional(),
		support: z.string().optional(),
	}).default({ priceModel: 'free' }),
	relatedBooks: z.array(z.string()).default([]),
	relatedKnowledge: z.array(z.string()).default([]),
	relatedObjectives: z.array(z.string()).default([]),
});

const knowledgeDownloadSchema = z.object({
	slug: z.string(),
	title: z.string(),
	description: z.string(),
	status: z.enum(['draft', 'live', 'archived']).default('draft'),
});

export const collections = {
	...createTreeseedTenantCollections(),
	templates: defineCollection({
		loader: glob({ pattern: '**/*.{md,mdx}', base: resolve(contentRoot, 'templates') }),
		schema: templateProductSchema,
	}),
	knowledge_downloads: defineCollection({
		loader: glob({ pattern: '**/*.{md,mdx}', base: resolve(contentRoot, 'knowledge-downloads') }),
		schema: knowledgeDownloadSchema,
	}),
};
