import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.TREESEED_DEMO_BASE_URL ?? 'http://127.0.0.1:4321';

export default defineConfig({
	testDir: 'tests/e2e',
	workers: 1,
	timeout: 300_000,
	use: {
		baseURL,
		trace: 'on',
		screenshot: 'on',
		video: 'on',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
