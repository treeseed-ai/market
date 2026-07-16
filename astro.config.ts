import { createTreeseedAdminSite } from '@treeseed/admin/config';

const config = createTreeseedAdminSite();
const viteWatchIgnored = [
	'/.agent-worktrees/',
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
					'**/.agent-worktrees/**',
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
	},
};
