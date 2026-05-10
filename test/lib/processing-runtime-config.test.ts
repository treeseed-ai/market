import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('processing runtime config', () => {
	it('prepares workspace package artifacts before Railway processing services start', () => {
		const config = readFileSync('treeseed.site.yaml', 'utf8');

		expect(config).toContain('startCommand: npm run build:api && node ./src/api/server.js');
		expect(config).toContain('healthcheckTimeoutSeconds: 120');
		expect(config).toContain('startCommand: npm run build:api && node ./packages/agent/dist/services/workday-manager.js');
		expect(config).toContain('startCommand: npm run build:api && node ./packages/agent/dist/services/worker.js');
		expect(config).not.toContain('startCommand: node ./node_modules/@treeseed/agent/dist/services/worker.js');
	});
});
