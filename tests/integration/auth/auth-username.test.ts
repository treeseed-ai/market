import { describe, expect, it } from 'vitest';
import {
	composeDisplayNameFromParts,
	normalizeUsername,
	validateUsername,
} from '../../../packages/admin/src/lib/auth/profile-validation';

describe('market username validation', () => {
	it('composes the registration display name from first and last name', () => {
		expect(composeDisplayNameFromParts(' Ada ', ' Lovelace ')).toBe('Ada Lovelace');
		expect(composeDisplayNameFromParts('Ada', '')).toBe('Ada');
	});

	it('normalizes and validates public usernames without touching a local database', () => {
		expect(normalizeUsername('  Ada-Lovelace  ')).toBe('ada-lovelace');
		expect(validateUsername('ada')).toMatchObject({ ok: true, username: 'ada' });
		expect(validateUsername('a').ok).toBe(true);
		expect(validateUsername('a'.repeat(39)).ok).toBe(true);
		expect(validateUsername('-ada').ok).toBe(false);
		expect(validateUsername('ada-').ok).toBe(false);
		expect(validateUsername('ada--lovelace').ok).toBe(false);
		expect(validateUsername('ada_lovelace').ok).toBe(false);
		expect(validateUsername('admin')).toMatchObject({ ok: false, code: 'reserved' });
		expect(validateUsername('a'.repeat(40)).ok).toBe(false);
	});
});
