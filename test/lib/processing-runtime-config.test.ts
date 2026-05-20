import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('processing runtime config', () => {
	it('starts only the Market API service from root Railway config', () => {
		const config = readFileSync('treeseed.site.yaml', 'utf8');

		expect(config).toContain('buildCommand: npm run build:api');
		expect(config).toContain('startCommand: node ./src/api/server.js');
		expect(config).toContain('healthcheckTimeoutSeconds: 120');
		expect(config).not.toContain('workdayManager:');
		expect(config).not.toContain('workerRunner:');
		expect(config).not.toContain('treeseed-processing');
		expect(config).not.toContain('startCommand: npm run build:api &&');
		expect(config).not.toContain('startCommand: node ./node_modules/@treeseed/agent/dist/services/worker.js');
	});
});
