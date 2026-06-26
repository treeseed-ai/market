type ApiEnvelope<T> = { ok?: boolean; payload?: T; error?: string };

export {};

declare global {
	interface Window {
		Stripe?: (publishableKey: string, options?: { stripeAccount?: string }) => {
			confirmPayment: (input: {
				clientSecret: string;
				confirmParams: { return_url: string };
				redirect: 'if_required';
			}) => Promise<{ error?: { message?: string } }>;
		};
	}
}

async function commerceApi<T>(path: string, init: RequestInit = {}): Promise<T> {
	const response = await fetch(path, {
		...init,
		headers: {
			accept: 'application/json',
			'content-type': 'application/json',
			...(init.headers ?? {}),
		},
	});
	const envelope = await response.json().catch(() => null) as ApiEnvelope<T> | null;
	if (!response.ok || !envelope?.ok) throw new Error(envelope?.error ?? `Request failed: ${response.status}`);
	return envelope.payload as T;
}

async function stripeConfig(): Promise<{ publishableKey: string }> {
	return commerceApi('/v1/commerce/stripe/config');
}

async function refreshPaymentGroup(groupId: string): Promise<{ paymentGroup?: { id: string; connectedAccountId?: string | null }; group?: { id: string; connectedAccountId?: string | null }; clientSecret?: string | null }> {
	return commerceApi(`/v1/commerce/payment-groups/${encodeURIComponent(groupId)}/refresh`, {
		method: 'POST',
		body: '{}',
	});
}

function setStatus(root: Element, message: string, error = false): void {
	let status = root.querySelector<HTMLElement>('[data-commerce-checkout-status]');
	if (!status) {
		status = document.createElement('p');
		status.dataset.commerceCheckoutStatus = '';
		status.className = error ? 'ts-commerce-error' : 'ts-commerce-muted';
		root.prepend(status);
	}
	status.className = error ? 'ts-commerce-error' : 'ts-commerce-muted';
	status.textContent = message;
}

async function confirmGroup(root: Element, groupId: string): Promise<void> {
	setStatus(root, 'Preparing secure payment confirmation...');
	const refreshed = await refreshPaymentGroup(groupId);
	const group = refreshed.paymentGroup ?? refreshed.group;
	if (!refreshed.clientSecret || !group) {
		throw new Error('This payment group is not ready for confirmation yet.');
	}
	const config = await stripeConfig();
	const stripeFactory = window.Stripe;
	if (!stripeFactory) throw new Error('Stripe.js is still loading.');
	const stripe = stripeFactory(config.publishableKey, group.connectedAccountId ? { stripeAccount: group.connectedAccountId } : undefined);
	const result = await stripe.confirmPayment({
		clientSecret: refreshed.clientSecret,
		confirmParams: { return_url: window.location.href },
		redirect: 'if_required',
	});
	if (result.error) throw new Error(result.error.message ?? 'Stripe confirmation failed.');
	setStatus(root, 'Payment confirmed. Refreshing checkout state...');
	window.location.reload();
}

for (const root of document.querySelectorAll('[data-commerce-checkout]')) {
	root.addEventListener('click', (event) => {
		const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-confirm-payment-group]') : null;
		const groupId = target?.dataset.confirmPaymentGroup;
		if (!groupId) return;
		target.setAttribute('disabled', 'disabled');
		confirmGroup(root, groupId).catch((error) => {
			target.removeAttribute('disabled');
			setStatus(root, error instanceof Error ? error.message : 'Payment confirmation failed.', true);
		});
	});
}
