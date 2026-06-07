import type { DefaultSession } from '@auth/sveltekit';

declare module '@auth/sveltekit' {
	interface Session {
		user: {
			id: string;
		} & DefaultSession['user'];
	}
}

declare global {
	namespace App {
		interface Locals {
			auth: import('@auth/sveltekit').SvelteKitAuthConfig['callbacks'] extends object
				? never
				: () => Promise<import('@auth/core/types').Session | null>;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
