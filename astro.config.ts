import { createTreeseedAdminSite } from '@treeseed/admin/config';

const config = createTreeseedAdminSite();
const sodiumSumoPublicEntry = '\0treeseed-libsodium-sumo-public-entry';

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
			exclude: config.vite?.optimizeDeps?.exclude,
		},
		plugins: [
			...(config.vite?.plugins ?? []),
			{
				name: 'treeseed-libsodium-sumo-public-entry',
				resolveId(source: string, importer?: string) {
					if (source === './libsodium-sumo.mjs' && importer?.includes('libsodium-wrappers-sumo')) {
						return sodiumSumoPublicEntry;
					}
					return null;
				},
				load(id: string) {
					if (id === sodiumSumoPublicEntry) {
						return "import sodium from 'libsodium-sumo';\nexport default sodium;\n";
					}
					return null;
				},
			},
		],
	},
};
