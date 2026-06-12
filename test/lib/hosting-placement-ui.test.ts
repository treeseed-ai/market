import { describe, expect, it } from 'vitest';
import {
	hostingPlacementLabel,
	hostingPlacementPurpose,
	hostingProfileLabel,
} from '../../packages/admin/src/lib/market/control-ui.ts';

describe('hosting placement UI helpers', () => {
	it('labels placement outcomes instead of raw adapter internals', () => {
		expect(hostingPlacementLabel('web')).toBe('Site Hosting');
		expect(hostingPlacementLabel('api')).toBe('API Runtime');
		expect(hostingPlacementLabel('database')).toBe('Database');
		expect(hostingPlacementLabel('knowledge-library')).toBe('Knowledge Library');
		expect(hostingPlacementLabel('runner-capacity')).toBe('Runner Capacity');
		expect(hostingPlacementLabel('content-storage')).toBe('Content Storage');
	});

	it('describes placement purpose in product terms', () => {
		expect(hostingPlacementPurpose('knowledge-library')).toContain('canonical project content libraries');
		expect(hostingPlacementPurpose('runner-capacity')).toContain('agent processing workloads');
		expect(hostingPlacementPurpose('repository')).toContain('source repositories');
	});

	it('labels standard hosting profiles', () => {
		expect(hostingProfileLabel('treeseed-managed-public-team')).toBe('TreeSeed managed public team');
		expect(hostingProfileLabel('treeseed-managed-private-team')).toBe('TreeSeed managed private team');
		expect(hostingProfileLabel('customer-self-hosted')).toBe('Customer self-hosted');
		expect(hostingProfileLabel('production-like-local')).toBe('Production-like local');
	});
});

