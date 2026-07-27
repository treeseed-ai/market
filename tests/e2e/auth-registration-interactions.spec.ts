import { expect, test } from '@playwright/test';

test('registration password feedback survives repeated auth client navigation', async ({ page }) => {
	await page.goto('/auth/sign-in');

	for (const round of [1, 2]) {
		await page.getByRole('link', { name: 'Create account' }).click();
		await expect(page).toHaveURL(/\/auth\/register/u);
		await expect(page.locator('[data-registration-form]')).toHaveAttribute('data-registration-ready', 'true');

		const password = page.locator('#registerPassword');
		const meter = page.locator('[data-ts-password-meter]');

		await expect(meter).toHaveAttribute('data-ts-password-meter-ready', 'true');
		await password.fill('a');
		await expect(meter.locator('[data-ts-password-meter-status]')).toHaveText('Weak');
		await expect(meter).toHaveAttribute('data-strength', '0');

		await password.fill(`StrongPassword${round}!`);
		await expect(meter.locator('[data-ts-password-meter-status]')).toHaveText('Strong');
		await expect(meter).toHaveAttribute('data-strength', '4');
		await expect(meter.locator('[data-ts-password-rule][data-passed="true"]')).toHaveCount(4);

		const confirmation = page.locator('[data-confirm-password-input]');
		const matchStatus = page.locator('[data-password-match-status]');
		await confirmation.fill(`DifferentPassword${round}!`);
		await expect(confirmation).toHaveAttribute('data-match-state', 'mismatch');
		await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
		await expect(matchStatus).toHaveText('Passwords do not match.');
		await expect(matchStatus).toHaveAttribute('data-tone', 'danger');
		await expect.poll(() => confirmation.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
		await expect.poll(() => confirmation.evaluate((input: HTMLInputElement) => input.validationMessage)).toBe('Passwords do not match.');

		await confirmation.fill(`StrongPassword${round}!`);
		await expect(confirmation).toHaveAttribute('data-match-state', 'match');
		await expect(confirmation).toHaveAttribute('aria-invalid', 'false');
		await expect(matchStatus).toHaveText('Passwords match.');
		await expect(matchStatus).toHaveAttribute('data-tone', 'success');
		await expect.poll(() => confirmation.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);

		await page.locator('[data-registration-form]').evaluate((form) => {
			const replacement = form.cloneNode(true);
			form.replaceWith(replacement);
		});
		const restoredPassword = page.locator('#registerPassword');
		await restoredPassword.fill('a');
		await expect(page.locator('[data-ts-password-meter-status]')).toHaveText('Weak');
		await expect(page.locator('[data-ts-password-meter]')).toHaveAttribute('data-strength', '0');

		await page.getByRole('link', { name: 'Sign in' }).click();
		await expect(page).toHaveURL(/\/auth\/sign-in/u);
	}
});
