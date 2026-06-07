/// <reference types="astro/client" />

declare namespace App {
	interface Locals {
		runtime?: import('@treeseed/sdk/types/cloudflare').CloudflareRuntime;
		contentPreview?: import('@treeseed/sdk').EditorialPreviewTokenPayload | null;
		auth?: {
			session: {
				id: string;
				userId: string;
				provider?: string | null;
				email?: string | null;
				displayName?: string | null;
				identityId?: string | null;
				authenticatedAt?: string | null;
				expiresAt?: string | null;
			};
			principal: import('@treeseed/sdk/remote').ApiPrincipal;
		} | null;
	}
}
