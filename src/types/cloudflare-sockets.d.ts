declare module 'cloudflare:sockets' {
	interface CloudflareSocket {
		readable: ReadableStream<Uint8Array>;
		writable: WritableStream<Uint8Array>;
		startTls?(): CloudflareSocket;
	}

	export function connect(
		address: { hostname: string; port: number },
		options?: { secureTransport?: 'off' | 'on' | 'starttls' },
	): CloudflareSocket;
}
