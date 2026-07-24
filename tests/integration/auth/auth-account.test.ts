import { describe, expect, it } from 'vitest';
import {
	DELETE_ACCOUNT_CONFIRMATION,
	accountDeletionConfirmationMatches,
	isValidProfileImageUrl,
	normalizeAccountProfileInput,
} from '../../../packages/admin/src/lib/auth/accounts/account';

describe('market account validation helpers', () => {
	it('validates profile image URLs without local auth persistence', () => {
		expect(isValidProfileImageUrl('')).toBe(true);
		expect(isValidProfileImageUrl(null)).toBe(true);
		expect(isValidProfileImageUrl('https://example.com/avatar.png')).toBe(true);
		expect(isValidProfileImageUrl('http://example.com/avatar.png')).toBe(false);
		expect(isValidProfileImageUrl('not a url')).toBe(false);
	});

	it('requires exact deletion confirmation text', () => {
		expect(accountDeletionConfirmationMatches(DELETE_ACCOUNT_CONFIRMATION)).toBe(true);
		expect(accountDeletionConfirmationMatches('delete my account')).toBe(false);
		expect(accountDeletionConfirmationMatches(`${DELETE_ACCOUNT_CONFIRMATION} `)).toBe(false);
	});

	it('normalizes profile form input locally while persistence stays API-owned', () => {
		const form = new FormData();
		form.set('name', ' Ada ');
		form.set('image', ' ');
		expect(normalizeAccountProfileInput(form)).toEqual({ name: 'Ada', image: null });
	});
});
