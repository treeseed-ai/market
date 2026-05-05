import type { APIContext } from 'astro';
import { handleFormSubmission, handleTokenRequest } from '@treeseed/core/utils/forms/service';

export async function GET(context: APIContext) {
	return handleTokenRequest(context);
}

export async function POST(context: APIContext) {
	const result = await handleFormSubmission(context);
	return context.redirect(result.redirectTo, 303);
}
