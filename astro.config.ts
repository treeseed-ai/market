import { createTreeseedAdminSite } from '@treeseed/admin/config';

const config = createTreeseedAdminSite();
const sodiumSumoPublicEntry = '\0treeseed-libsodium-sumo-public-entry';
const viteWatchIgnored = [
	'/.treeseed/',
	'/.fixtures/',
	'/coverage/',
	'/coverage-',
	'/dist/',
	'/node_modules/',
	'/target/',
];

function isIgnoredWatchPath(path: string) {
	const normalized = path.replace(/\\/gu, '/');
	return viteWatchIgnored.some((segment) => normalized.includes(segment))
		|| normalized.endsWith('.sqlite')
		|| normalized.includes('.sqlite-');
}

export default {
	...config,
	vite: {
		...(config.vite ?? {}),
		build: {
			...(config.vite?.build ?? {}),
			chunkSizeWarningLimit: Math.max(config.vite?.build?.chunkSizeWarningLimit ?? 0, 1200),
		},
		server: {
			...(config.vite?.server ?? {}),
			watch: {
				...(config.vite?.server?.watch ?? {}),
				ignored: [
					...(Array.isArray(config.vite?.server?.watch?.ignored)
						? config.vite.server.watch.ignored
						: config.vite?.server?.watch?.ignored
							? [config.vite.server.watch.ignored]
							: []),
					isIgnoredWatchPath,
					'**/.treeseed/**',
					'**/.fixtures/**',
					'**/coverage/**',
					'**/coverage-*/**',
					'**/dist/**',
					'**/node_modules/**',
					'**/target/**',
					'**/packages/treedx/**',
					'**/*.sqlite',
					'**/*.sqlite-*',
				],
			},
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
