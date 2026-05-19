import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('processing runtime config', () => {
	it('starts Railway processing services through role commands without runtime builds', () => {
		const config = readFileSync('treeseed.site.yaml', 'utf8');

		expect(config).toContain('buildCommand: npm run build:api');
		expect(config).toContain('startCommand: node ./packages/agent/dist/scripts/treeseed-processing.js api');
		expect(config).toContain('healthcheckTimeoutSeconds: 120');
		expect(config).toContain('startCommand: node ./packages/agent/dist/scripts/treeseed-processing.js manager');
		expect(config).toContain('startCommand: node ./packages/agent/dist/scripts/treeseed-processing.js worker');
		expect(config).not.toContain('startCommand: npm run build:api &&');
		expect(config).not.toContain('startCommand: node ./node_modules/@treeseed/agent/dist/services/worker.js');
	});
});
