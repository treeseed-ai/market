/// <reference types="astro/client" />

declare namespace App {
	interface Locals {
		runtime?: import('@treeseed/core/types/cloudflare').CloudflareRuntime;
		auth?: {
			session: import('./lib/auth/session-store').SiteWebSession;
			principal: import('@treeseed/sdk/remote').ApiPrincipal;
		} | null;
	}
}
