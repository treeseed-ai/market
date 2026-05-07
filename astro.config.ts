import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTreeseedTenantSite } from '@treeseed/core/config';

const config = createTreeseedTenantSite();
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
