import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTreeseedAdminSite } from '@treeseed/admin/config';

const config = createTreeseedAdminSite();
const repoRoot = dirname(fileURLToPath(import.meta.url));
const sodiumSumoPath = resolve(
	repoRoot,
	'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs',
);
const vitePlugins = config.vite?.plugins ?? [];

export default {
	...config,
	vite: {
		...(config.vite ?? {}),
		build: {
			...(config.vite?.build ?? {}),
			chunkSizeWarningLimit: Math.max(config.vite?.build?.chunkSizeWarningLimit ?? 0, 1200),
		},
		optimizeDeps: {
			...(config.vite?.optimizeDeps ?? {}),
			include: Array.from(new Set([
				...(config.vite?.optimizeDeps?.include ?? []),
				'codemirror',
				'@codemirror/commands',
				'@codemirror/lang-markdown',
				'@codemirror/language',
				'@codemirror/state',
				'@codemirror/view',
				'@lezer/highlight',
			])),
			exclude: Array.from(new Set([
				...(config.vite?.optimizeDeps?.exclude ?? []),
				'libsodium-wrappers-sumo',
			])),
		},
		plugins: [
			...vitePlugins,
			{
				name: 'treeseed-libsodium-sumo-resolve',
				resolveId(source: string, importer?: string) {
					if (source === './libsodium-sumo.mjs' && importer?.includes('libsodium-wrappers-sumo')) {
						return sodiumSumoPath;
					}
					return null;
				},
			},
		],
	},
};
